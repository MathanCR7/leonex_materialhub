const pool = require("../config/db");

// Gets a list of unique plants from submissions for the filter dropdown.
exports.getUniquePlantsForReport = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT plant FROM material_data_submissions WHERE plant IS NOT NULL AND plant != '' ORDER BY plant ASC"
    );
    res.json(rows.map(row => row.plant));
  } catch (error) {
    console.error("Get unique plants for report error:", error);
    res.status(500).json({ message: "Server error fetching unique plants." });
  }
};

// Gets the filtered summary of total costs per vendor.
exports.getCostSummaryReport = async (req, res) => {
    try {
        const { materialCode, plantCodes, userIds, startDate, endDate } = req.query;
        let query = `
            SELECT
                u.id as user_id, 
                u.username as third_party_username,
                SUM(
                    (s.good_material_count * COALESCE(ce.good_material_price, 0)) +
                    (s.package_defects_count * COALESCE(ce.package_defects_price, 0)) +
                    (s.physical_defects_count * COALESCE(ce.physical_defects_price, 0)) +
                    (s.other_defects_count * COALESCE(ce.other_defects_price, 0))
                ) as total_calculated_value
            FROM cost_estimations ce
            JOIN material_data_submissions s ON ce.submission_id = s.id
            JOIN users u ON ce.user_id = u.id
            LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
        `;
        // <<< REQUIREMENT MET HERE: Only 'ESTIMATION' types are included in the report.
        const conditions = ["ce.estimation_type = 'ESTIMATION'"];
        const params = [];

        if (userIds) {
            const userIdArray = userIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
            if (userIdArray.length > 0) {
                conditions.push(`u.id IN (?)`);
                params.push(userIdArray);
            }
        }
        
        if (materialCode) {
            conditions.push(`(s.material_code = ? OR m.mask_code = ?)`);
            params.push(materialCode, materialCode);
        }

        if (plantCodes) {
            const plantCodeArray = plantCodes.split(',').map(p => p.trim());
            if (plantCodeArray.length > 0) {
                conditions.push(`s.plant IN (?)`);
                params.push(plantCodeArray);
            }
        }
        if (startDate) {
            conditions.push(`ce.updated_at >= ?`);
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(`ce.updated_at <= ?`);
            params.push(`${endDate} 23:59:59`);
        }
        
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        query += ` GROUP BY u.id, u.username HAVING total_calculated_value > 0 ORDER BY total_calculated_value DESC`;
        
        const [summaryData] = await pool.query(query, params);
        res.json(summaryData);
    } catch (error) {
        console.error("Get cost summary report error:", error);
        res.status(500).json({ message: "Server error fetching summary report." });
    }
};

// Gets the filtered and paginated detailed report for a specific vendor.
exports.getCostDetailReportForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { materialCode, plantCodes, startDate, endDate, page = 1, limit = 10 } = req.query;
        const offsetInt = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
        const limitInt = Math.max(1, parseInt(limit, 10));

        // <<< REQUIREMENT MET HERE: Only 'ESTIMATION' types are included for the detailed view.
        let conditions = ["ce.user_id = ?", "ce.estimation_type = 'ESTIMATION'"];
        const params = [userId];
        const countParams = [userId];

        if (materialCode) {
            conditions.push(`(s.material_code = ? OR m.mask_code = ?)`);
            params.push(materialCode, materialCode);
            countParams.push(materialCode, materialCode);
        }

        if (plantCodes) {
            const plantCodeArray = plantCodes.split(',').map(p => p.trim()).filter(p => p);
            if(plantCodeArray.length > 0) {
              conditions.push(`s.plant IN (?)`);
              params.push(plantCodeArray);
              countParams.push(plantCodeArray);
            }
        }
        if (startDate) {
            conditions.push(`ce.updated_at >= ?`);
            params.push(startDate); 
            countParams.push(startDate);
        }
        if (endDate) {
            conditions.push(`ce.updated_at <= ?`);
            const endOfDay = `${endDate} 23:59:59`;
            params.push(endOfDay); 
            countParams.push(endOfDay);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        
        const baseQuery = `
            FROM cost_estimations ce
            JOIN material_data_submissions s ON ce.submission_id = s.id
            LEFT JOIN materials m ON s.material_code = m.material_code AND s.plant = m.plantcode
            ${whereClause}
        `;
        
        const countQuery = `SELECT COUNT(ce.id) as total ${baseQuery}`;
        const [countResult] = await pool.query(countQuery, countParams);
        const totalItems = countResult[0].total;

        const dataQuery = `
            SELECT
                s.id as submission_id,
                s.material_code,
                m.mask_code,
                s.plant,
                s.good_material_count, ce.good_material_price,
                (s.good_material_count * COALESCE(ce.good_material_price, 0)) as total_good_value,
                s.package_defects_count, ce.package_defects_price,
                (s.package_defects_count * COALESCE(ce.package_defects_price, 0)) as total_package_defect_value,
                s.physical_defects_count, ce.physical_defects_price,
                (s.physical_defects_count * COALESCE(ce.physical_defects_price, 0)) as total_physical_defect_value,
                s.other_defects_count, ce.other_defects_price,
                (s.other_defects_count * COALESCE(ce.other_defects_price, 0)) as total_other_defect_value,
                ((s.good_material_count * COALESCE(ce.good_material_price, 0)) + (s.package_defects_count * COALESCE(ce.package_defects_price, 0)) + (s.physical_defects_count * COALESCE(ce.physical_defects_price, 0)) + (s.other_defects_count * COALESCE(ce.other_defects_price, 0))) as grand_total
            ${baseQuery} 
            ORDER BY ce.updated_at DESC 
            LIMIT ? OFFSET ?
        `;
        params.push(limitInt, offsetInt);

        const [detailedData] = await pool.query(dataQuery, params);
        res.json({
            data: detailedData, currentPage: parseInt(page, 10), totalPages: Math.ceil(totalItems / limitInt), totalItems,
        });
    } catch (error) {
        console.error("Get cost detail report error:", error);
        res.status(500).json({ message: "Server error fetching detailed report." });
    }
};