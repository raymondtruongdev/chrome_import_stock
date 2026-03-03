export const buildTSV = (headers, rows) =>
  [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");

export const findHeaderIndex = (headers, key) =>
  headers.findIndex((h) => h.toLowerCase() === key.toLowerCase());

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
