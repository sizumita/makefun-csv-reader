// Faster drop-in for csv-reader 1.0.0 (make.fun csv-reader-speed-01).
// Written from the published broken-row policy: single left-to-right read, exact
// {columns, rows, errors} answers. Strategy: a clean-line fast path (split) for
// records holding no quote and no stray CR, and an indexOf-jump scanner with
// whole-segment slices for everything else. No per-character concatenation.

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0;
  let line = 1;
  if (text.charCodeAt(0) === 0xfeff) pos = 1;

  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters starting at pos onto `initial`.
  // Returns [value, ended, added]: ended 0=comma 1=line break 2=end of text;
  // added counts characters kept beyond `initial` (quote_junk detection).
  function readUnquoted(initial) {
    let value = initial;
    let added = 0;
    let seg = pos;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        if (pos > seg) { const s = text.slice(seg, pos); value += s; added += s.length; }
        pos += 1;
        return [value, 0, added];
      }
      if (c === 10) {
        if (pos > seg) { const s = text.slice(seg, pos); value += s; added += s.length; }
        pos += 1; line += 1;
        return [value, 1, added];
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          if (pos > seg) { const s = text.slice(seg, pos); value += s; added += s.length; }
          pos += 2; line += 1;
          return [value, 1, added];
        }
        // stray CR: kept characters before it, error, drop it, keep reading.
        if (pos > seg) { const s = text.slice(seg, pos); value += s; added += s.length; }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        seg = pos;
        continue;
      }
      pos += 1;
    }
    if (pos > seg) { const s = text.slice(seg, pos); value += s; added += s.length; }
    return [value, 2, added];
  }

  // Reads a quoted field whose opening quote is at pos.
  // Returns [value, ended] with ended as in readUnquoted.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    pos += 1;
    let seg = pos;
    let parts = null; // null until the first break/escape forces segmentation
    let head = '';
    let closed = false;
    while (pos < n) {
      const qc = text.charCodeAt(pos);
      if (qc === 10) {
        // LF inside quotes stays in the current segment; just count it.
        line += 1;
        pos += 1;
        continue;
      }
      if (qc === 13) {
        // CRLF or lone CR inside quotes is read as one LF.
        if (parts === null) { parts = []; head = text.slice(seg, pos) + '\n'; }
        else parts.push(text.slice(seg, pos), '\n');
        line += 1;
        pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        seg = pos;
        continue;
      }
      if (qc !== 34) { pos += 1; continue; }
      // quote
      if (text.charCodeAt(pos + 1) === 34) {
        if (parts === null) { parts = []; head = text.slice(seg, pos); }
        else parts.push(text.slice(seg, pos));
        pos += 2;
        seg = pos;
        // mark that a doubled quote was consumed: store it as its own part
        parts.push('"');
        continue;
      }
      // closing quote
      let value;
      if (parts === null) value = text.slice(seg, pos);
      else { parts.push(text.slice(seg, pos)); value = head + parts.join(''); }
      pos += 1;
      closed = true;
      // What follows the closing quote.
      if (pos >= n) return [value, 2];
      const c = text.charCodeAt(pos);
      if (c === 44) { pos += 1; return [value, 0]; }
      if (c === 10) { pos += 1; line += 1; return [value, 1]; }
      if (c === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; return [value, 1]; }
      const junk = readUnquoted(value);
      if (junk[2] > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
      return [junk[0], junk[1]];
    }
    if (!closed) {
      // The quote never closes: literal character, re-read as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      const r = readUnquoted('"');
      return [r[0], r[1]];
    }
    // Unreachable: the loop only exits via return or EOF-without-close.
    return ['', 2];
  }

  for (;;) {
    // Lines with no characters are no records.
    while (pos < n) {
      const qc = text.charCodeAt(pos);
      if (qc === 10) { pos += 1; line += 1; }
      else if (qc === 13 && text.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;

    let fields = null;
    let lastQuoted = false;

    // Clean-line fast path: the whole record sits on one line and holds no
    // quote and no CR other than a CRLF terminator.
    {
      const nl = text.indexOf('\n', pos);
      const rawEnd = nl === -1 ? n : nl;
      let contentEnd = rawEnd;
      if (nl !== -1 && contentEnd > pos && text.charCodeAt(contentEnd - 1) === 13) contentEnd -= 1;
      const q = text.indexOf('"', pos);
      const r = text.indexOf('\r', pos);
      if ((q === -1 || q >= contentEnd) && (r === -1 || r >= contentEnd) && contentEnd > pos) {
        fields = text.slice(pos, contentEnd).split(',');
        pos = nl === -1 ? n : nl + 1;
        line += 1;
      }
    }

    if (fields === null) {
      fields = [];
      for (;;) {
        let value, ended;
        if (text.charCodeAt(pos) === 34) {
          lastQuoted = true;
          const r = readQuoted();
          value = r[0]; ended = r[1];
        } else {
          lastQuoted = false;
          const r = readUnquoted('');
          value = r[0]; ended = r[1];
        }
        fields.push(value);
        if (ended !== 0) break;
      }
    }

    // A line left with no characters is no record (its errors stay).
    if (fields.length === 1 && fields[0] === '' && !lastQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) { columns = fields; continue; }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
