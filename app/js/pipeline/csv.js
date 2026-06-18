/**
 * Minimal RFC-4180-ish CSV parse/format — handles quoted fields, embedded
 * commas/newlines, and "" escaped quotes (producer lines have commas, so this
 * matters). Pure and environment-agnostic — unit-tested in Node.
 */

/**
 * Parse CSV text into header + row objects (first line is the header).
 * @param {string} text
 * @returns {{ headers: string[], rows: Array<Record<string,string>> }}
 */
export function parseCsv(text) {
  const s = String(text ?? '').replace(/\r\n?/g, '\n');
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let started = false; // any char seen on the current record

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { inQuotes = true; started = true; continue; }
    if (c === ',') { row.push(field); field = ''; started = true; continue; }
    if (c === '\n') {
      if (started || field !== '' || row.length) { row.push(field); records.push(row); }
      row = []; field = ''; started = false;
      continue;
    }
    field += c;
    started = true;
  }
  if (started || field !== '' || row.length) { row.push(field); records.push(row); }

  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
    return obj;
  });
  return { headers, rows };
}

/**
 * Format rows (array of objects) into CSV text using the given header order.
 * @param {string[]} headers
 * @param {Array<Record<string, unknown>>} rows
 * @returns {string}
 */
export function toCsv(headers, rows) {
  const esc = (v) => {
    const str = v == null ? '' : String(v);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) lines.push(headers.map((h) => esc(r[h])).join(','));
  return lines.join('\n');
}
