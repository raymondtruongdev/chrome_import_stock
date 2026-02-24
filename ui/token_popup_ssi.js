const curlInput = document.getElementById("curlInput");
const parseBtn = document.getElementById("parseBtn");

parseBtn.addEventListener("click", () => {
  const curlText = curlInput.value;

  if (!curlText) {
    alert("Curl command cannot be empty");
    return;
  }

  try {
    // 🔥 Normalize: remove "\" newline
    const normalized = curlText.replace(/\\\n/g, " ");

    // ===============================
    // 1️⃣ Extract account from query
    // ===============================
    // match: ?account=3249221
    const accountMatch = normalized.match(/[?&]account=(\d+)/i);
    const account = accountMatch ? accountMatch[1] : "";

    // ===============================
    // 2️⃣ Extract Authorization Bearer token
    // ===============================
    const authMatch = normalized.match(
      /-H\s+['"]authorization:\s*Bearer\s+([^'"]+)['"]/i,
    );
    const bearer_token = authMatch ? authMatch[1].trim() : "";

    // ===============================
    // 3️⃣ Extract device-id
    // ===============================
    const deviceMatch = normalized.match(/-H\s+['"]device-id:\s*([^'"]+)['"]/i);
    const device_id = deviceMatch ? deviceMatch[1].trim() : "";

    if (!account || !bearer_token || !device_id) {
      alert("Cannot parse curl. Please check format.");
      return;
    }

    // ===============================
    // 4️⃣ Save to chrome.storage
    // ===============================
    chrome.storage.local.set(
      {
        ssi_account: account,
        ssi_token: bearer_token,
        ssi_device_id: device_id,
      },
      () => {
        alert("SSI token saved successfully");
        window.close();
      },
    );
  } catch (err) {
    console.error(err);
    alert("Parse failed");
  }
});
