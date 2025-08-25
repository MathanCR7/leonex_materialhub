import jsPDF from "jspdf";
import "jspdf-autotable"; // Keep for potential future table use
import {
  Packer,
  Document,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  WidthType,
  Table,
  TableRow,
  TableCell,
  VerticalAlign,
  BorderStyle,
  PageBreak,
  Header,
  Footer,
  TabStopType,
  TabStopPosition,
} from "docx";
import { saveAs } from "file-saver";
import logoImageBase64Imported from "../assets/leonex_logo_base64"; // Ensure this path is correct

const G_LOGO_BASE64 = logoImageBase64Imported; // This should be a base64 data URL string

const imageToBase64 = async (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }
  if (url.startsWith("data:")) {
    return url;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(
        `Failed to fetch image: ${response.status} ${response.statusText} for URL: ${url}`
      );
      return null;
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      return null;
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error, "for URL:", url);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", error, "URL:", url);
    return null;
  }
};

// --- PDF Styling Constants ---
const PDF_MAX_IMG_WIDTH_MAIN = 160; // Slightly reduced for better margins
const PDF_MAX_IMG_HEIGHT_MAIN = 110;
const PDF_MAX_IMG_WIDTH_DEFECT = 120;
const PDF_MAX_IMG_HEIGHT_DEFECT = 80;

// --- DOCX Styling Constants ---
const DOCX_MAX_IMG_WIDTH = 480; // Approx 6.6 inches at 72 DPI
const DOCX_MAX_IMG_HEIGHT = 360; // Approx 5 inches at 72 DPI

// --- PDF Generation ---
export const generatePdfForSubmission = async (submissionData) => {
  const doc = new jsPDF("p", "mm", "a4");
  let yPos = 10; // Initial yPosition

  const lineSpacing = 5.5;
  const sectionSpacing = 8; // Increased slightly
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth =
    doc.internal.pageSize.getWidth() - leftMargin - rightMargin;
  const footerHeight = 15; // Adjusted for footer content
  const headerHeight = 25; // Approximate height of the header area

  const addHeaderToPagePdf = (pdfDocInstance) => {
    let currentY = 10;
    if (G_LOGO_BASE64) {
      try {
        const imgProps = pdfDocInstance.getImageProperties(G_LOGO_BASE64);
        const aspectRatio = imgProps.width / imgProps.height;
        let logoWidth = 30; // Desired width for logo
        let logoHeight = logoWidth / aspectRatio;
        if (logoHeight > 15) {
          // Max height for logo
          logoHeight = 15;
          logoWidth = logoHeight * aspectRatio;
        }
        pdfDocInstance.addImage(
          G_LOGO_BASE64,
          imgProps.fileType || "PNG", // Or 'JPEG' etc. based on your logo
          leftMargin,
          currentY,
          logoWidth,
          logoHeight
        );
      } catch (e) {
        console.error("Error adding logo to PDF header:", e);
      }
    }

    pdfDocInstance.setFontSize(16);
    pdfDocInstance.setFont(undefined, "bold");
    const titleText = "Digitize Document";
    const titleWidth = pdfDocInstance.getTextWidth(titleText);
    const titleXPos =
      pdfDocInstance.internal.pageSize.getWidth() - rightMargin - titleWidth;
    pdfDocInstance.text(titleText, titleXPos, currentY + 7); // Vertically centered a bit with logo

    // Reset font for subsequent elements if any were to be added to header
    pdfDocInstance.setFontSize(10);
    pdfDocInstance.setFont(undefined, "normal");

    currentY = Math.max(currentY + 15, currentY + 7) + 5; // Ensure currentY is below logo and title
    pdfDocInstance.setLineWidth(0.3);
    pdfDocInstance.line(
      leftMargin,
      currentY,
      pdfDocInstance.internal.pageSize.getWidth() - rightMargin,
      currentY
    );

    return currentY + sectionSpacing / 2; // Return yPos for first content element
  };

  const addFooterToPagePdf = (pdfDocInstance, pageNum, totalPages) => {
    const pageFooterY = pdfDocInstance.internal.pageSize.getHeight() - 10;
    pdfDocInstance.setFontSize(9);
    pdfDocInstance.setTextColor(128, 128, 128); // Grey color for footer

    pdfDocInstance.text(
      "Leonex Systems Private Limited - India",
      leftMargin,
      pageFooterY
    );

    const rightFooterText = "www.leonex.net";
    const rightFooterTextWidth = pdfDocInstance.getTextWidth(rightFooterText);
    pdfDocInstance.text(
      rightFooterText,
      pdfDocInstance.internal.pageSize.getWidth() -
        rightMargin -
        rightFooterTextWidth,
      pageFooterY
    );

    // Optional: Page numbering
    // const pageStr = `Page ${pageNum} of ${totalPages}`;
    // const pageStrWidth = pdfDocInstance.getTextWidth(pageStr);
    // pdfDocInstance.text(pageStr, (pdfDocInstance.internal.pageSize.getWidth() - pageStrWidth) / 2, pageFooterY);

    pdfDocInstance.setTextColor(0, 0, 0); // Reset text color
  };

  const checkAndAddPagePdf = (currentY, neededHeight) => {
    if (
      currentY + neededHeight >
      doc.internal.pageSize.getHeight() - footerHeight - 5 /* safety margin */
    ) {
      addFooterToPagePdf(
        doc,
        doc.internal.getNumberOfPages(),
        doc.internal.getNumberOfPages()
      ); // Add footer to current page *before* adding new
      doc.addPage();
      yPos = addHeaderToPagePdf(doc); // Add header to new page and reset yPos
      return yPos;
    }
    return currentY;
  };

  yPos = addHeaderToPagePdf(doc); // Add header to the first page

  const addTextPdf = (text, x, y, options = {}) => {
    // This function becomes simpler as checkAndAddPagePdf is called before using its return value
    doc.text(text, x, y, options);
    return y; // Return y, caller handles y advancement
  };

  const addMultilineTextPdf = (
    text,
    x,
    y,
    maxWidth,
    itemLineHeight = lineSpacing,
    isValue = false
  ) => {
    const lines = doc.splitTextToSize(text || (isValue ? "N/A" : ""), maxWidth);
    const neededHeightForText = lines.length * itemLineHeight;

    // Check space for the entire block of text
    let currentY = checkAndAddPagePdf(y, neededHeightForText);
    if (currentY !== y) y = currentY; // Update y if new page started

    doc.text(lines, x, y);
    return y + neededHeightForText; // Return yPos after this text block
  };

  const detailPdf = (label, value) => {
    const labelHeight = lineSpacing * 1.5;
    yPos = checkAndAddPagePdf(yPos, labelHeight);

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    const labelText = `${label}:`;
    const labelWidth = doc.getTextWidth(labelText);
    addTextPdf(labelText, leftMargin, yPos);

    doc.setFont(undefined, "normal");
    const valueXPos = leftMargin + labelWidth + 2; // 2mm spacing
    const maxValueWidth = contentWidth - (valueXPos - leftMargin);

    // Store current yPos before value printing to correctly advance after
    // This relies on addMultilineTextPdf to handle its own page breaks if the value is very long
    const yPosAfterValue = addMultilineTextPdf(
      String(value === null || value === undefined ? "N/A" : value),
      valueXPos,
      yPos, // Pass current yPos
      maxValueWidth,
      lineSpacing,
      true
    );
    yPos = yPosAfterValue; // Update yPos based on value's height
    yPos += lineSpacing / 2; // Add a small gap after the value
    return yPos;
  };

  yPos = detailPdf("Material Code", submissionData.material_code);
  yPos = detailPdf(
    "Plant Location",
    `${submissionData.plantlocation || "N/A"} (${
      submissionData.plant || "N/A"
    })`
  );
  yPos = detailPdf("Bin Location", submissionData.bin_location || "N/A");
  yPos = detailPdf(
    "Material Description",
    submissionData.material_description_snapshot
  );
  yPos = detailPdf("UOM", submissionData.uom);
  yPos = detailPdf("Category", submissionData.category);
  yPos = detailPdf("SOH Quantity", String(submissionData.soh_quantity));
  yPos += sectionSpacing / 2;

  const addImageToPdf = async (
    label,
    imagePath,
    itemNumberText,
    isDefectImage = false
  ) => {
    const neededHeightForLabel = label ? lineSpacing * 2 : 0; // Slightly more space for label
    yPos = checkAndAddPagePdf(yPos, neededHeightForLabel);
    if (label) {
      doc.setFontSize(12); // Slightly larger for image titles
      doc.setFont(undefined, "bold");
      addTextPdf(
        `${itemNumberText ? itemNumberText + ") " : ""}${label}`,
        leftMargin,
        yPos
      );
      yPos += lineSpacing * 1.5; // Space after label
    }

    if (imagePath) {
      const imgBase64 = await imageToBase64(imagePath);
      if (imgBase64) {
        try {
          const imgProps = doc.getImageProperties(imgBase64);
          let imgWidth = imgProps.width;
          let imgHeight = imgProps.height;

          const maxImgHeight = isDefectImage
            ? PDF_MAX_IMG_HEIGHT_DEFECT
            : PDF_MAX_IMG_HEIGHT_MAIN;
          const maxImgWidth = isDefectImage
            ? PDF_MAX_IMG_WIDTH_DEFECT
            : PDF_MAX_IMG_WIDTH_MAIN;

          const aspectRatio = imgWidth / imgHeight;
          if (imgHeight > maxImgHeight) {
            imgHeight = maxImgHeight;
            imgWidth = imgHeight * aspectRatio;
          }
          if (imgWidth > maxImgWidth) {
            imgWidth = maxImgWidth;
            imgHeight = imgWidth / aspectRatio;
          }

          // Check space for the image itself + spacing after
          const spaceNeededForImage = imgHeight + sectionSpacing;
          yPos = checkAndAddPagePdf(yPos, spaceNeededForImage);

          const imgX = leftMargin + (contentWidth - imgWidth) / 2; // Center image

          doc.addImage(
            imgBase64,
            imgProps.fileType || "JPEG",
            imgX,
            yPos,
            imgWidth,
            imgHeight
          );
          yPos += imgHeight + sectionSpacing; // Space after image
        } catch (e) {
          console.error(
            "Error adding image to PDF:",
            label,
            e,
            "Path:",
            imagePath
          );
          yPos = checkAndAddPagePdf(yPos, lineSpacing * 2);
          doc.setFontSize(10);
          doc.setFont(undefined, "italic");
          doc.setTextColor(150, 0, 0); // Reddish for error
          addTextPdf(
            "Image not available or processing error.",
            leftMargin + 5,
            yPos
          );
          yPos += lineSpacing * 1.5;
          doc.setTextColor(0);
        }
      } else {
        yPos = checkAndAddPagePdf(yPos, lineSpacing * 2);
        doc.setFontSize(10);
        doc.setFont(undefined, "italic");
        doc.setTextColor(100);
        addTextPdf("Image not found or failed to load.", leftMargin + 5, yPos);
        yPos += lineSpacing * 1.5;
        doc.setTextColor(0);
      }
    } else if (label || isDefectImage) {
      // Only show placeholder if a label was expected or it's a defect image spot
      yPos = checkAndAddPagePdf(yPos, lineSpacing * 2);
      doc.setFontSize(10);
      doc.setFont(undefined, "italic");
      doc.setTextColor(100);
      addTextPdf("No image provided.", leftMargin + 5, yPos);
      yPos += lineSpacing * 1.5;
      doc.setTextColor(0);
    }
    return yPos;
  };

  const goodMediaFields = [
    { label: "Specification of the item", key: "image_specification_path" },
    {
      label: "Packing Condition of the item",
      key: "image_packing_condition_path",
    },
    {
      label: "Item Specification of the mentioned item",
      key: "image_item_spec_mentioned_path",
    },
    {
      label: "The Product top view of the item condition",
      key: "image_product_top_view_path",
    },
    {
      label: "3D View of the items product condition.",
      key: "image_3d_view_path",
    },
    {
      label:
        "Side view of the item to express the condition of the product/thickness",
      key: "image_side_view_thickness_path",
    },
    {
      label: "No of Stock and their condition and Packing Condition",
      key: "image_stock_condition_packing_path",
    },
  ];

  for (let i = 0; i < goodMediaFields.length; i++) {
    const field = goodMediaFields[i];
    yPos = await addImageToPdf(
      field.label,
      submissionData[field.key],
      (i + 1).toString()
    );
  }

  // Item Inspection Video Section
  const videoSectionLabelHeight = lineSpacing * 2;
  yPos = checkAndAddPagePdf(yPos, videoSectionLabelHeight);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  addTextPdf(
    `${goodMediaFields.length + 1}) Item Inspection Video`,
    leftMargin,
    yPos
  );
  yPos += lineSpacing * 1.5;

  doc.setFontSize(10);
  doc.setFont(undefined, "normal");

  if (submissionData.video_item_inspection_path) {
    const videoLabel = "Link Video:- ";
    const videoLink = submissionData.video_item_inspection_path;
    const videoLineHeight = lineSpacing * 1.5; // for label + link
    yPos = checkAndAddPagePdf(yPos, videoLineHeight);

    doc.text(videoLabel, leftMargin, yPos);
    const labelWidth = doc.getTextWidth(videoLabel);
    doc.setTextColor(0, 0, 255); // Blue for link

    const availableLinkWidth = contentWidth - labelWidth - leftMargin * 2; // Ensure link fits
    const linkLines = doc.splitTextToSize(videoLink, availableLinkWidth);

    let currentYForLink = yPos;
    for (let i = 0; i < linkLines.length; i++) {
      if (i > 0) {
        currentYForLink += lineSpacing;
        currentYForLink = checkAndAddPagePdf(currentYForLink, lineSpacing);
      }
      doc.textWithLink(linkLines[i], leftMargin + labelWidth, currentYForLink, {
        url: videoLink,
      });
    }
    yPos = currentYForLink + lineSpacing; // Advance yPos by the total height of link
    doc.setTextColor(0); // Reset color
  } else {
    yPos = checkAndAddPagePdf(yPos, lineSpacing);
    doc.setFont(undefined, "italic");
    doc.setTextColor(100);
    addTextPdf("No video provided", leftMargin + 5, yPos);
    yPos += lineSpacing;
    doc.setTextColor(0);
  }
  yPos += sectionSpacing;

  // Defect and Stock Details Section
  const defectTitleHeight = sectionSpacing + lineSpacing * 1.5;
  yPos = checkAndAddPagePdf(yPos, defectTitleHeight);
  doc.setFontSize(14); // Larger for main section title
  doc.setFont(undefined, "bold");
  addTextPdf("Defect and Stock Details", leftMargin, yPos);
  yPos += lineSpacing * 1.5;
  doc.setFontSize(10); // Reset for details

  yPos = detailPdf(
    "Good Material Count",
    String(submissionData.good_material_count)
  );
  yPos += sectionSpacing / 2;

  const addDefectSectionPdf = async (title, count, reasons, imagePathsKey) => {
    const defectSubTitleHeight = sectionSpacing / 2 + lineSpacing * 1.5;
    yPos = checkAndAddPagePdf(yPos, defectSubTitleHeight);
    doc.setFontSize(11); // Sub-section title
    doc.setFont(undefined, "bold");
    addTextPdf(title, leftMargin, yPos);
    yPos += lineSpacing * 1.5;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");

    yPos = detailPdf("Count", String(count));
    yPos = detailPdf("Reasons", reasons || "N/A");

    const defectImagePaths = submissionData[imagePathsKey];
    if (Array.isArray(defectImagePaths) && defectImagePaths.length > 0) {
      const imagesLabelHeight = lineSpacing * 1.5;
      yPos = checkAndAddPagePdf(yPos, imagesLabelHeight);
      doc.setFont(undefined, "bold");
      addTextPdf("Images:", leftMargin, yPos);
      yPos += lineSpacing * 1.5; // Space after "Images:" label
      doc.setFont(undefined, "normal");

      for (const imgPath of defectImagePaths) {
        // For defect images, no itemNumberText, pass true for isDefectImage
        yPos = await addImageToPdf("", imgPath, "", true);
      }
    } else {
      const noImagesTextHeight = lineSpacing * 1.5;
      yPos = checkAndAddPagePdf(yPos, noImagesTextHeight);
      doc.setFont(undefined, "bold");
      const imagesLabelText = "Images:";
      addTextPdf(imagesLabelText, leftMargin, yPos);
      const imagesLabelWidth = doc.getTextWidth(imagesLabelText);

      doc.setFont(undefined, "italic");
      doc.setTextColor(100);
      addTextPdf(
        "No defect images provided",
        leftMargin + imagesLabelWidth + 2,
        yPos
      );
      doc.setTextColor(0);
      doc.setFont(undefined, "normal");
      yPos += lineSpacing;
    }
    yPos += sectionSpacing / 2;
    return yPos;
  };

  yPos = await addDefectSectionPdf(
    "Package Defects",
    submissionData.package_defects_count,
    submissionData.package_defects_reasons,
    "package_defects_images_paths"
  );
  yPos = await addDefectSectionPdf(
    "Physical Defects",
    submissionData.physical_defects_count,
    submissionData.physical_defects_reasons,
    "physical_defects_images_paths"
  );
  yPos = await addDefectSectionPdf(
    "Other Defects",
    submissionData.other_defects_count,
    submissionData.other_defects_reasons,
    "other_defects_images_paths"
  );

  yPos = detailPdf(
    "Missing Material Count",
    String(submissionData.missing_material_count)
  );
  yPos = detailPdf(
    "Missing Material Status/Reasons",
    submissionData.missing_defects_status || "N/A"
  );

  // Add Footer to the last page specifically
  addFooterToPagePdf(
    doc,
    doc.internal.getNumberOfPages(),
    doc.internal.getNumberOfPages()
  );

  return doc;
};

export const downloadPdf = (pdfDoc, filename) => {
  pdfDoc.save(`${filename}.pdf`);
};

// --- Word (DOCX) Generation ---
export const generateWordForSubmission = async (submissionData) => {
  const children = []; // Array to hold all paragraphs, tables, images for the document body

  const eleganteCreateDetailParagraph = (label, value) => {
    return new Paragraph({
      children: [
        new TextRun({ text: `${label}: `, bold: true, size: 22 }), // 11pt
        new TextRun({
          text: String(value === null || value === undefined ? "N/A" : value),
          size: 22,
        }),
      ],
      spacing: { after: 120 }, // 6pt spacing after
    });
  };

  children.push(
    eleganteCreateDetailParagraph("Material Code", submissionData.material_code)
  );
  children.push(
    eleganteCreateDetailParagraph(
      "Plant Location",
      `${submissionData.plantlocation || "N/A"} (${
        submissionData.plant || "N/A"
      })`
    )
  );
  children.push(
    eleganteCreateDetailParagraph(
      "Bin Location",
      submissionData.bin_location || "N/A"
    )
  );
  children.push(
    eleganteCreateDetailParagraph(
      "Material Description",
      submissionData.material_description_snapshot
    )
  );
  children.push(eleganteCreateDetailParagraph("UOM", submissionData.uom));
  children.push(
    eleganteCreateDetailParagraph("Category", submissionData.category)
  );
  children.push(
    eleganteCreateDetailParagraph("SOH Quantity", submissionData.soh_quantity)
  );
  children.push(new Paragraph({ spacing: { after: 200 } })); // Extra space before images start

  const addImageSectionDocx = async (
    label,
    imagePath,
    itemNumberText,
    isDefectImage = false
  ) => {
    if (label) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${itemNumberText ? itemNumberText + ") " : ""}${label}`,
              bold: true,
              size: 26, // 13pt for image titles
            }),
          ],
          spacing: { before: 300, after: 150 }, // More space around image titles
        })
      );
    }
    if (imagePath) {
      const imgBase64DataUrl = await imageToBase64(imagePath);
      if (imgBase64DataUrl) {
        try {
          const response = await fetch(imgBase64DataUrl);
          if (!response.ok)
            throw new Error(
              `Failed to fetch image data URL: ${response.status}`
            );
          const buffer = await response.arrayBuffer();

          const tempImg = new Image(); // Use browser's Image object to get dimensions
          await new Promise((resolve, reject) => {
            tempImg.onload = resolve;
            tempImg.onerror = (err) =>
              reject(new Error("Failed to load image for dimensioning"));
            tempImg.src = imgBase64DataUrl;
          });

          let imgWidth = tempImg.width;
          let imgHeight = tempImg.height;
          const aspectRatio = imgWidth / imgHeight;

          const currentMaxWidth = isDefectImage
            ? DOCX_MAX_IMG_WIDTH * 0.8
            : DOCX_MAX_IMG_WIDTH; // Defect images slightly smaller
          const currentMaxHeight = isDefectImage
            ? DOCX_MAX_IMG_HEIGHT * 0.8
            : DOCX_MAX_IMG_HEIGHT;

          if (imgHeight > currentMaxHeight) {
            imgHeight = currentMaxHeight;
            imgWidth = imgHeight * aspectRatio;
          }
          if (imgWidth > currentMaxWidth) {
            imgWidth = currentMaxWidth;
            imgHeight = imgWidth / aspectRatio;
          }

          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: {
                    width: Math.round(imgWidth),
                    height: Math.round(imgHeight),
                  },
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 250 }, // Good spacing after image
            })
          );
        } catch (e) {
          console.error(
            "Error adding image to DOCX:",
            label,
            e,
            "Path:",
            imagePath
          );
          children.push(
            new Paragraph({
              text: isDefectImage
                ? "Defect image not available."
                : `Image not available: ${
                    label || "Untitled"
                  }. Error during processing.`,
              style: "italic",
              alignment: AlignmentType.CENTER,
              spacing: { after: 150 },
            })
          );
        }
      } else {
        children.push(
          new Paragraph({
            text: isDefectImage
              ? "Defect image not found or failed to load."
              : `No image provided or image failed to load for ${
                  label || "Untitled"
                }.`,
            style: "italic",
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 },
          })
        );
      }
    } else if (label || isDefectImage) {
      children.push(
        new Paragraph({
          text: isDefectImage
            ? "No defect image provided."
            : `No image provided for ${label || "Untitled"}.`,
          style: "italic",
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 },
        })
      );
    }
  };

  const goodMediaFieldsDocx = [
    { label: "Specification of the item", key: "image_specification_path" },
    {
      label: "Packing Condition of the item",
      key: "image_packing_condition_path",
    },
    {
      label: "Item Specification of the mentioned item",
      key: "image_item_spec_mentioned_path",
    },
    {
      label: "The Product top view of the item condition",
      key: "image_product_top_view_path",
    },
    {
      label: "3D View of the items product condition.",
      key: "image_3d_view_path",
    },
    {
      label:
        "Side view of the item to express the condition of the product/thickness",
      key: "image_side_view_thickness_path",
    },
    {
      label: "No of Stock and their condition and Packing Condition",
      key: "image_stock_condition_packing_path",
    },
  ];

  for (let i = 0; i < goodMediaFieldsDocx.length; i++) {
    const field = goodMediaFieldsDocx[i];
    await addImageSectionDocx(
      field.label,
      submissionData[field.key],
      (i + 1).toString()
    );
  }

  // Item Inspection Video
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${goodMediaFieldsDocx.length + 1}) Item Inspection Video`,
          bold: true,
          size: 26,
        }),
      ],
      spacing: { before: 300, after: 150 },
    })
  );
  if (submissionData.video_item_inspection_path) {
    children.push(
      eleganteCreateDetailParagraph(
        "Link Video",
        submissionData.video_item_inspection_path
      )
    );
  } else {
    children.push(
      new Paragraph({
        text: "No video provided.",
        style: "italic",
        spacing: { after: 150 },
      })
    );
  }
  children.push(new Paragraph({ spacing: { after: 200 } })); // Space before potential page break

  // Defect and Stock Details
  children.push(new PageBreak());
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "Defect and Stock Details", bold: true, size: 32 }),
      ], // 16pt
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 250 },
    })
  );
  children.push(
    eleganteCreateDetailParagraph(
      "Good Material Count",
      submissionData.good_material_count
    )
  );
  children.push(new Paragraph({ spacing: { after: 100 } }));

  const addDefectSectionDocx = async (title, count, reasons, imagePathsKey) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 28 })], // 14pt
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
      })
    );
    children.push(eleganteCreateDetailParagraph("Count", count));
    children.push(eleganteCreateDetailParagraph("Reasons", reasons || "N/A"));

    const defectImagePaths = submissionData[imagePathsKey];
    if (Array.isArray(defectImagePaths) && defectImagePaths.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Images:", bold: true, size: 22 })],
          spacing: { after: 80 },
        })
      );
      for (const imgPath of defectImagePaths) {
        await addImageSectionDocx("", imgPath, "", true); // Defect images are smaller
      }
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: "Images:", bold: true, size: 22 })],
          spacing: { after: 80 },
        })
      );
      children.push(
        new Paragraph({
          text: "No defect images provided.",
          style: "italic",
          spacing: { after: 150 },
        })
      );
    }
    children.push(new Paragraph({ spacing: { after: 200 } })); // Space after each defect section
  };

  await addDefectSectionDocx(
    "Package Defects",
    submissionData.package_defects_count,
    submissionData.package_defects_reasons,
    "package_defects_images_paths"
  );
  await addDefectSectionDocx(
    "Physical Defects",
    submissionData.physical_defects_count,
    submissionData.physical_defects_reasons,
    "physical_defects_images_paths"
  );
  await addDefectSectionDocx(
    "Other Defects",
    submissionData.other_defects_count,
    submissionData.other_defects_reasons,
    "other_defects_images_paths"
  );

  children.push(
    eleganteCreateDetailParagraph(
      "Missing Material Count",
      submissionData.missing_material_count
    )
  );
  children.push(
    eleganteCreateDetailParagraph(
      "Missing Material Status/Reasons",
      submissionData.missing_defects_status || "N/A"
    )
  );

  // Prepare Logo for Header
  let logoImageBuffer = null;
  if (G_LOGO_BASE64) {
    try {
      const response = await fetch(G_LOGO_BASE64);
      if (response.ok) logoImageBuffer = await response.arrayBuffer();
    } catch (e) {
      console.error("Failed to fetch or process logo for DOCX header:", e);
    }
  }

  // DOCX Header
  const docxHeader = new Header({
    children: [
      new Table({
        columnWidths: [1800, 7200], // Adjusted for better logo/title balance
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: logoImageBuffer
                  ? [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: logoImageBuffer,
                            transformation: { width: 100, height: 50 },
                          }),
                        ],
                      }),
                    ] // Adjusted logo size
                  : [new Paragraph("")], // Empty para if no logo
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                  top: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Digitize Document",
                        bold: true,
                        size: 30,
                      }),
                    ], // 15pt
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                verticalAlign: VerticalAlign.CENTER,
                borders: {
                  bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto" },
                  top: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      new Paragraph({ spacing: { after: 200 } }), // Space after header line
    ],
  });

  // DOCX Footer
  const docxFooter = new Footer({
    children: [
      new Paragraph({
        // Line above footer text
        style: "line",
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "auto" } },
        spacing: { before: 100, after: 100 },
      }),
      new Table({
        columnWidths: [4500, 4500], // Equal width
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Leonex Systems Private Limited - India",
                        size: 18,
                      }),
                    ],
                  }),
                ], // 9pt
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "www.leonex.net", size: 18 }),
                    ],
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1000, right: 720, bottom: 1000, left: 720 } }, // Increased top/bottom margin for header/footer
        },
        headers: { default: docxHeader },
        footers: { default: docxFooter },
        children: children,
      },
    ],
  });

  return doc;
};

export const downloadWord = async (docxDocument, filename) => {
  const blob = await Packer.toBlob(docxDocument);
  saveAs(blob, `${filename}.docx`);
};

