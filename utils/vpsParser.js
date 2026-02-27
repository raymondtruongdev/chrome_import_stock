

// Open smartoneweb.vps.com.vn → DevTools → Network → find "getaccountinfo" → right click → Copy as cURL 

// Example curl:
// curl 'https://webtrading-proxy.vps.com.vn/rest-api/B/getaccountInfo' \
//   -H 'Accept: application/json, text/plain, */*' \
//   -H 'Connection: keep-alive' \
//   -H 'Content-Type: application/json' \
//   -H 'Origin: https://smartoneweb.vps.com.vn' \
//   -H 'Referer: https://smartoneweb.vps.com.vn/' \
//   -H 'Sec-Fetch-Dest: empty' \
//   -H 'Sec-Fetch-Mode: cors' \
//   -H 'Sec-Fetch-Site: same-site' \
//   -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
//   -H 'accept-language: vi' \
//   -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
//   -H 'sec-ch-ua-mobile: ?0' \
//   -H 'sec-ch-ua-platform: "macOS"' \
//   -H 'x-device-new: w/0zbKZ5ZzkZ9dMViTEF1qepWf/c3hXoonJznXK2lUVBeq5xAg4xeMixIoTEwAj4jtha8Z9CPy6MShJbYUTTMtLdSHdFg9oR5QF5544ivyYMyh/EVxqFXNf0Rn9lSH32jx82w29Ll/+ZcivVzAK/B9ZPXEfnODuWzkvvx5wyDcU1c+JHiAnwE7guxH2kzNLhT4OZNBHu8Fp8m/OuqCAYY/ATeOr1e09Zwffd7tCuvc5ZXeoNv5I8zNk=' \
//   -H 'x-ext-info: goline' \
//   -H 'x-request-id: 57ce47c9-f303-47d8-9c2a-61a082e2ab0b' \
//   -H 'x-session: c590f80f-1a1b-48af-9fd7-634d846299ed' \
//   -H 'x-user: 123456' \
//   --data-raw '{"type":"cursor","cmd":"GetAccountInfo","p1":"1124261","p2":"","p3":"","p4":"","p5":"","p6":"","p7":"","p8":""}'

/**
 * Parse VND curl string
 * @param {string} curlText
 * @returns {{ vps_deviceNew, vps_session, vps_user, vps_account,: string }}
 */
export function parseVpsCurl(curlText) {
  if (!curlText) throw new Error("Curl empty");

  const normalized = curlText.replace(/\\\n/g, " ");

  const getHeader = (name) => {
    const regex = new RegExp(`-H\\s+['"]${name}:\\s*([^'"]+)['"]`, "i");
    const match = normalized.match(regex);
    return match ? match[1].trim() : "";
  };

  const vps_deviceNew = getHeader("x-device-new");
  const vps_session = getHeader("x-session");
  const vps_user = getHeader("x-user");

  // extract body
  const bodyRegex = /--data-raw\s+['"]({[\s\S]*?})['"]/i;
  const bodyMatch = normalized.match(bodyRegex);

  let vps_account = "";

  if (bodyMatch) {
    const bodyJson = JSON.parse(bodyMatch[1]);
    vps_account = bodyJson.p1 || "";
  }

  return {
    vps_deviceNew,
    vps_session,
    vps_user,
    vps_account,
  };
}
