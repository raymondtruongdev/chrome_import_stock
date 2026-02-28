/**
 * Build curl command from Chrome debugger request object
 * @param {Object} request
 * @returns {string}
 */
export function buildCurlFromRequest(request) {
  if (!request?.url) {
    throw new Error("Invalid request object");
  }

  let curl = `curl '${request.url}' \\\n`;

  const headers = request.headers || {};

  for (const key in headers) {
    curl += `  -H '${key}: ${headers[key]}' \\\n`;
  }

  if (request.postData) {
    curl += `  --data-raw '${request.postData}' \\\n`;
  }

  return curl.trim().slice(0, -1);
}
