// Open https://iboard.ssi.com.vn/portfolio/equities/→ DevTools → Network → find "stock-position" → right click → Copy as CURL

// Example curl:
// curl 'https://iboard-tapi.ssi.com.vn/trading/stock-position?account=1234567&status=holding' \
//   -H 'accept: application/json, text/plain, */*' \
//   -H 'accept-language: vi' \
//   -H 'authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IjMyNDkyMiIsInV1aWQiOiIxMzZiZTEwOS01NTcxLTQwYTEtODNlNy1lMmZhYjI4OTU0MzgiLCJjaGFubmVsIjoid2ViIiwic3lzdGVtVHlwZSI6Imlib2FyZCIsImRldmljZUlkIjoiNjIxOTJCNDUtNTc2QS00NDY2LTk4N0ItNjAwMDQzOUI1RjgxIiwidmVyc2lvbiI6IjIiLCJpYXQiOjE3NzIxNTg2ODksImV4cCI6MTc3MjE4NzQ4OX0.JpT1i93sfdzohLZWrZeA1jtJD_tBJeLefc4lAmYqYww' \
//   -H 'device-id: 62192B45-576A-4466-987B-6000439B5F81' \
//   -H 'if-none-match: W/"773-+GRZpIs8n7YZpM5gtgvdPdKtzJI"' \
//   -H 'origin: https://iboard.ssi.com.vn' \
//   -H 'priority: u=1, i' \
//   -H 'referer: https://iboard.ssi.com.vn/' \
//   -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'sec-ch-ua-platform: "macOS"' \
//   -H 'sec-fetch-dest: empty' \
//   -H 'sec-fetch-mode: cors' \
//   -H 'sec-fetch-site: same-site' \
//   -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'

/**
 * Parse SSI curl string
 * @param {string} curlText
 * @returns {{ ssi_account: string, ssi_token: string, ssi_device_id: string }}
 */
export function parseSsiCurl(curlText) {
  if (!curlText) throw new Error("Curl empty");

  const normalized = curlText.replace(/\\\n/g, " ");

  // account
  const accountMatch = normalized.match(/[?&]account=(\d+)/i);
  const ssi_account = accountMatch ? accountMatch[1] : ""; // 1234567

  // bearer token
  const authMatch = normalized.match(
    /-H\s+['"]authorization:\s*Bearer\s+([^'"]+)['"]/i,
  );
  const ssi_token = authMatch ? authMatch[1].trim() : "";

  // device id
  const deviceMatch = normalized.match(/-H\s+['"]device-id:\s*([^'"]+)['"]/i);
  const ssi_device_id = deviceMatch ? deviceMatch[1].trim() : "";

  return { ssi_account, ssi_token, ssi_device_id };
}
