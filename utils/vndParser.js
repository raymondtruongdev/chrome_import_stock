/**
 * Parse VND curl string
 * @param {string} curlText
 * @returns {{ vnd_account: string, vnd_token: string }}
 */


  // Open trade.vndirect.com.vn/ → DevTools → Network → find request aftype → right click → Copy as cURL →

  // Example curl:
  // curl 'https://trade-bo-api.vndirect.com.vn/accounts/0001234567/aftype' \
  //     -H 'Accept: application/json, text/plain, */*' \
  //     -H 'Accept-Language: en-US,en;q=0.9,vi-VN;q=0.8,vi;q=0.7' \
  //     -H 'Connection: keep-alive' \
  //     -H 'Origin: https://trade.vndirect.com.vn' \
  //     -H 'Referer: https://trade.vndirect.com.vn/' \
  //     -H 'Sec-Fetch-Dest: empty' \
  //     -H 'Sec-Fetch-Mode: cors' \
  //     -H 'Sec-Fetch-Site: same-site' \
  //     -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36' \
  //     -H 'X-AUTH-TOKEN: eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJpc3N1ZXIiLCJzdWIiOiJzdWJqZWN0IiwiYXVkIjpbImF1ZGllbmNlIiwiaW9zIiwib25saW5lIiwidHJhZGVhcGkiLCJhdXRoIl0sImV4cCI6MTc3MjE4NzMzNSwibmJmIjoxNzcyMTU4NDc1LCJpYXQiOjE3NzIxNTg1MzUsInZlcmlmeURldmljZUlkIjp0cnVlLCJpc1N0YWZmIjpmYWxzZSwicm9sZXMiOiJbXSIsImFjY291bnRUeXBlIjoiVW5rbm93biIsInZfdXNlcklkIjoiOTIxNDA5MDEzNzgxMDEiLCJ1c2VySWQiOiJudWxsIiwidmVyc2lvbiI6IlYyIiwiY3VzdG9tZXJOYW1lIjoiVHLGsMahbmcgUXXhu5FjIFRvw6BuIiwiY29ycG9yYXRlSWQiOm51bGwsInRyYWRpbmdFeHAiOjAsImlkZ0lkIjpudWxsLCJjdXN0b21lclR5cGUiOlsiU0VHMDAwMDAxIl0sInBob25lIjoiMDkwODIyODcwMiIsImN1c3RvbWVySWQiOiIwMDAxMTQwNTgzIiwic2VnbWVudGF0aW9uIjpudWxsLCJyZXRpcmVkQWNjb3VudHMiOm51bGwsInVzZXJUeXBlIjoiYWN0aXZlIiwiZW1haWwiOiJxdW9jdG9hbjIyMDJAZ21haWwuY29tIiwidXNlcm5hbWUiOiJ0cnVvbmdxdW9jdG9hbiIsInN0YXR1cyI6IkFDVElWQVRFRCIsImlzQmxvY2tUcmFkZSI6ZmFsc2V9.tef1mM91ULqa32rSrV6zPzDsKai0FlKYST0tpsEclCaTe7jIBf5_ldx0AJEV1xmhEklD5k_IcrECKpoB3SKhP47Rg0lVkBuQPp1ZLila3xI_GsDW-0RvXs_74iGLaiONptB_sDWdXluiEjrV5ipU0YlZ2JRG_h3Fe3kBAuIQNatDatqvy3zn9YHMy3HHZyMA3sF48v2CfBK60FWFgPJg2K6fqxmmrrl2Va0lbkBENgFgk57ry99Nm2gONHpQiC3BY0RbdxkGe75pU5j-xhF9tL2hawyLmLc2q_2UdbJ1o-VNQQopnrAw9hwBw3dAOpgFYqVoY4A41JSWiGa4zINu2w' \
  //     -H 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"' \
  //     -H 'sec-ch-ua-mobile: ?0' \
  //     -H 'sec-ch-ua-platform: "macOS"'


export function parseVndCurl(curlText) {
  if (!curlText) {
    throw new Error("Curl text is empty");
  }

  // remove "\" newline
  const normalized = curlText.replace(/\\\n/g, " ");

  // 1️⃣ Extract account
  const accountMatch = normalized.match(/accounts\/(\d+)\/aftype/i);

  const vnd_account = accountMatch ? accountMatch[1] : ""; // 0001234567

  // 2️⃣ Extract X-AUTH-TOKEN
  const tokenMatch = normalized.match(/-H\s+['"]X-AUTH-TOKEN:\s*([^'"]+)['"]/i);

  const vnd_token = tokenMatch ? tokenMatch[1].trim() : "";

  return { vnd_account, vnd_token };
}
