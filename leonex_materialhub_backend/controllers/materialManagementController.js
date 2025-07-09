// controllers/materialManagementController.js
const pool = require("../config/db");
const csv = require("csv-parser");
const { Readable } = require("stream");

// Get a paginated and searchable list of all master materials
exports.getMaterials = async (req, res) => {
  const {
    search = "",
    page = 1,
    limit = 15,
    sortBy = "created_at",
    sortOrder = "DESC",
  } = req.query;

  const offsetInt =
    (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
  const limitInt = Math.max(1, parseInt(limit, 10));

  let whereClauses = [];
  let queryParams = [];
  let countQueryParams = [];

  if (search) {
    whereClauses.push(
      "(material_code LIKE ? OR mask_code LIKE ? OR material_description LIKE ? OR plantcode LIKE ? OR category LIKE ?)"
    );
    const searchParam = `%${search}%`;
    queryParams.push(
      searchParam,
      searchParam,
      searchParam,
      searchParam,
      searchParam
    );
    countQueryParams.push(
      searchParam,
      searchParam,
      searchParam,
      searchParam,
      searchParam
    );
  }

  const whereString =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const baseQuery = `SELECT id, material_code, mask_code, material_description, uom, plantcode, plantlocation, category, stock_on_hand, created_at FROM materials ${whereString}`;
  const countQuery = `SELECT COUNT(id) as total FROM materials ${whereString}`;

  const allowedSortBy = [
    "material_code",
    "mask_code",
    "plantcode",
    "category",
    "created_at",
  ];
  const safeSortBy = allowedSortBy.includes(sortBy) ? sortBy : "created_at";
  const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const finalQuery = `${baseQuery} ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT ? OFFSET ?`;
  queryParams.push(limitInt, offsetInt);

  try {
    const [rows] = await pool.query(finalQuery, queryParams);
    const [countResult] = await pool.query(countQuery, countQueryParams);
    const totalItems = countResult[0].total;

    res.json({
      data: rows,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(totalItems / limitInt),
      totalItems,
    });
  } catch (error) {
    console.error("Get materials error:", error);
    res.status(500).json({ message: "Server error fetching materials." });
  }
};

// Download a CSV template for importing new materials
exports.downloadTemplate = (req, res) => {
  const header =
    "material_code,material_description,uom,plantcode,plantlocation,category,stock_on_hand\n";
  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=material_import_template.csv"
  );
  res.status(200).send(header);
};

// Import materials from an uploaded CSV file
exports.importMaterials = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No CSV file uploaded." });
  }

  const results = [];
  const requiredFields = ["material_code", "plantcode", "plantlocation"];

  const stream = Readable.from(req.file.buffer.toString("utf8"));

  stream
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      // --- Validation ---
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        for (const field of requiredFields) {
          if (!row[field] || row[field].trim() === "") {
            return res.status(400).json({
              message: `Validation failed. Row ${
                i + 2
              } is missing required field: ${field}.`,
            });
          }
        }
      }

      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();

        // Group rows by mask prefix to handle sequential numbering correctly
        const groupedByPrefix = results.reduce((acc, row) => {
          const plantNamePrefix = (row.plantlocation || "")
            .substring(0, 2)
            .toUpperCase();
          const plantCodePrefix = (row.plantcode || "")
            .substring(0, 2)
            .toUpperCase();
          const prefix = `${plantNamePrefix}${plantCodePrefix}`;
          if (!acc[prefix]) {
            acc[prefix] = [];
          }
          acc[prefix].push(row);
          return acc;
        }, {});

        const materialsToInsert = [];

        for (const prefix in groupedByPrefix) {
          const rowsInGroup = groupedByPrefix[prefix];

          // Check for existing material + plant combinations in this batch
          const existingCheckValues = rowsInGroup.map((row) => [
            row.material_code,
            row.plantcode,
          ]);
          const [existingDbRows] = await connection.query(
            "SELECT material_code, plantcode FROM materials WHERE (material_code, plantcode) IN (?)",
            [existingCheckValues]
          );

          if (existingDbRows.length > 0) {
            const existingCombination = `${existingDbRows[0].material_code} at plant ${existingDbRows[0].plantcode}`;
            throw new Error(
              `Import failed. Material combination ${existingCombination} already exists in the database.`
            );
          }

          // Find the last sequence number for this prefix
          const [lastMaskRow] = await connection.query(
            "SELECT mask_code FROM materials WHERE mask_code LIKE ? ORDER BY mask_code DESC LIMIT 1 FOR UPDATE",
            [`${prefix}%`]
          );

          let nextSequence = 1;
          if (lastMaskRow.length > 0) {
            const lastSequenceStr = lastMaskRow[0].mask_code.substring(
              prefix.length
            );
            nextSequence = parseInt(lastSequenceStr, 10) + 1;
          }

          // Generate insert data for each row in the group
          for (const row of rowsInGroup) {
            const mask_code = `${prefix}${String(nextSequence).padStart(
              9,
              "0"
            )}`;
            nextSequence++;

            materialsToInsert.push([
              row.material_code,
              mask_code,
              row.material_description || null,
              row.uom || null,
              row.plantcode,
              row.plantlocation,
              row.category || null,
              parseInt(row.stock_on_hand, 10) || 0,
              req.user.username,
            ]);
          }
        }

        if (materialsToInsert.length > 0) {
          const insertSql = `
            INSERT INTO materials 
            (material_code, mask_code, material_description, uom, plantcode, plantlocation, category, stock_on_hand, created_by_username) 
            VALUES ?`;
          await connection.query(insertSql, [materialsToInsert]);
        }

        await connection.commit();
        res.status(201).json({
          message: `Successfully imported ${materialsToInsert.length} materials.`,
        });
      } catch (error) {
        await connection.rollback();
        console.error("Material import error:", error);
        res.status(500).json({
          message: error.message || "Server error during material import.",
        });
      } finally {
        if (connection) connection.release();
      }
    });
};
