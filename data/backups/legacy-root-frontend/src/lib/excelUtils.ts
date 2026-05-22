import ExcelJS from 'exceljs';

// ExcelJS utility functions for Excel file operations

/**
 * Generic function to export data to Excel file
 */
export const exportToExcelFile = async <T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string
): Promise<void> => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add headers
  const headers = Object.keys(data[0]);
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF228B22' }, // Forest green
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data rows
  data.forEach((row) => {
    worksheet.addRow(Object.values(row));
  });

  // Auto-fit column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value?.toString() || '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 50);
  });

  // Generate the file and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(buffer, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Parse Excel file and return data as array of objects
 */
export const parseExcelFile = async (file: File): Promise<any[]> => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  const jsonData: any[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      // First row is headers
      row.eachCell((cell) => {
        headers.push(String(cell.value || '').toLowerCase().trim());
      });
    } else {
      // Data rows
      const rowData: Record<string, any> = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          rowData[header] = cell.value;
        }
      });
      if (Object.keys(rowData).length > 0) {
        jsonData.push(rowData);
      }
    }
  });

  return jsonData;
};

/**
 * Parse Excel file and return raw data as 2D array
 */
export const parseExcelFileRaw = async (file: File): Promise<any[][]> => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in the file');
  }

  const data: any[][] = [];
  worksheet.eachRow((row) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      rowData.push(cell.value);
    });
    data.push(rowData);
  });

  return data;
};

/**
 * Create and download an Excel template
 */
export const createExcelTemplate = async (
  templateData: Record<string, any>[],
  filename: string,
  sheetName: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (templateData.length === 0) {
    throw new Error('Template data is empty');
  }

  // Add headers
  const headers = Object.keys(templateData[0]);
  worksheet.addRow(headers);

  // Style headers
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add sample data rows
  templateData.forEach((row) => {
    worksheet.addRow(Object.values(row));
  });

  // Auto-fit column widths
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value?.toString() || '';
      maxLength = Math.max(maxLength, cellValue.length);
    });
    column.width = Math.min(maxLength + 2, 30);
  });

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(buffer, `${filename}.xlsx`);
};

/**
 * Create a workbook with multiple sheets
 */
export const createMultiSheetWorkbook = async (
  sheets: { name: string; data: Record<string, any>[] }[],
  filename: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach(({ name, data }) => {
    if (data.length === 0) return;

    const worksheet = workbook.addWorksheet(name);
    
    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF228B22' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data
    data.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value?.toString() || '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.min(maxLength + 2, 50);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadFile(buffer, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

/**
 * Helper function to download file from buffer
 */
const downloadFile = (buffer: ExcelJS.Buffer, filename: string): void => {
  const uint8Array = new Uint8Array(buffer as ArrayBuffer);
  const blob = new Blob([uint8Array], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get column index by header name (case-insensitive)
 */
export const findColumnIndex = (headers: string[], ...possibleNames: string[]): number => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = normalizedHeaders.findIndex(h => h.includes(name.toLowerCase()));
    if (index !== -1) return index;
  }
  return -1;
};
