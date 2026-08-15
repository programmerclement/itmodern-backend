function escapeCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Builds a CSV string from an array of column definitions and row objects.
 * columns: [{ key, label }]
 */
export function toCsv(rows, columns) {
  const header = columns.map((col) => escapeCell(col.label)).join(',');
  const lines = rows.map((row) => columns.map((col) => escapeCell(row[col.key])).join(','));
  return [header, ...lines].join('\n');
}
