export function parseCsv(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(value.trim());
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (rows.length < 2) throw new Error("The CSV needs a header row and at least one listing.");

  const headers = rows[0].map((header) => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error("The CSV contains duplicate column headers.");
  return rows.slice(1).map((cells, rowIndex) => {
    if (cells.length !== headers.length) throw new Error(`Row ${rowIndex + 2} has ${cells.length} columns; expected ${headers.length}.`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

export function downloadCsv(filename, headers, rows) {
  const escapeCell = (cell) => {
    let value = String(cell ?? "");
    if (/^[\s]*[=+\-@]/.test(value)) value = `'${value}`;
    return `"${value.replaceAll('"', '""')}"`;
  };
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
