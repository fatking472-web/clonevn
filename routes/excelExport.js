const XLSX = require('xlsx');

function toText(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function buildReadableExcel({ sheetName, title, columns, rows }) {
  const generatedAt = new Date().toLocaleString('vi-VN', { hour12: false });
  const headerRowIndex = 4;
  const data = rows.map((row, index) => columns.map(column => toText(column.value(row, index))));
  const aoa = [
    [title],
    [`Xuất lúc: ${generatedAt}`],
    [`Tổng số dòng dữ liệu: ${rows.length}`],
    [],
    columns.map(column => column.header),
    ...data
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const lastColumnIndex = Math.max(columns.length - 1, 0);
  const lastRowIndex = Math.max(headerRowIndex, aoa.length - 1);

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumnIndex } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumnIndex } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastColumnIndex } }
  ];

  worksheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: 0 },
      e: { r: lastRowIndex, c: lastColumnIndex }
    })
  };

  worksheet['!cols'] = columns.map((column, columnIndex) => {
    const longestValue = data.reduce((max, row) => {
      return Math.max(max, toText(row[columnIndex]).length);
    }, column.header.length);
    return { wch: column.width || Math.min(Math.max(longestValue + 3, 12), 48) };
  });

  worksheet['!rows'] = aoa.map((_, rowIndex) => {
    if (rowIndex === 0) return { hpt: 26 };
    if (rowIndex === headerRowIndex) return { hpt: 24 };
    if (rowIndex > headerRowIndex) return { hpt: 22 };
    return { hpt: 18 };
  });

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const headerCell = worksheet[XLSX.utils.encode_cell({ r: headerRowIndex, c: columnIndex })];
    if (headerCell) headerCell.s = { font: { bold: true }, alignment: { vertical: 'center' } };

    for (let rowIndex = headerRowIndex + 1; rowIndex <= lastRowIndex; rowIndex += 1) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })];
      if (!cell) continue;
      cell.t = 's';
      cell.z = '@';
    }
  }

  const titleCell = worksheet.A1;
  if (titleCell) titleCell.s = { font: { bold: true, sz: 16 } };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
}

module.exports = { buildReadableExcel, toText };
