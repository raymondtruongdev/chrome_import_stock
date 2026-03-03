export const normalizeText = (text = "") =>
  text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

export const normalizeHeader = (text = "") => normalizeText(text).toLowerCase();

export const buildTSV = (headers, rows) =>
  [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");

export function findHeaderIndex(headers, key) {
  const normalizedKey = normalizeHeader(key);
  return headers.findIndex((h) => normalizeHeader(h).includes(normalizedKey));
}

export function mapTableColumns({ outputColumns, headers, rows }) {
  if (!headers?.length || !rows?.length) {
    return { headers: [], rows: [] };
  }

  const mappedHeaders = outputColumns.map((c) => c.label);

  const mappedRows = rows.map((row) =>
    outputColumns.map((c) => {
      const idx = findHeaderIndex(headers, c.key);
      if (idx === -1) return "";

      const raw = row[idx] ?? "";
      return typeof c.transform === "function" ? c.transform(raw) : raw;
    }),
  );

  return { headers: mappedHeaders, rows: mappedRows };
}

export const buildTSVFromData = (headers, rows) => {
  const outputColumns = [
    { key: "symbol", label: "Mã" },
    { key: "quantity", label: "KL" },
    { key: "averagePrice", label: "Giá TB" },
    { key: "currentPrice", label: "Giá hiện tại" },
  ];

  const mapped = mapTableColumns({ outputColumns, headers, rows });
  return buildTSV(mapped.headers, mapped.rows);
};
