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
    // 1️⃣ Extract ACCOUNT from URL
    // ===============================
    // match: /accounts/0001145256/aftype
    const accountMatch = normalized.match(
      /accounts\/(\d+)\/aftype/i
    );

    const vnd_account = accountMatch ? accountMatch[1] : "";

    // ===============================
    // 2️⃣ Extract X-AUTH-TOKEN
    // ===============================
    const tokenMatch = normalized.match(
      /-H\s+['"]X-AUTH-TOKEN:\s*([^'"]+)['"]/i
    );

    const vnd_token = tokenMatch ? tokenMatch[1].trim() : "";

    if (!vnd_account || !vnd_token) {
      alert("Cannot parse VND curl. Please check format.");
      return;
    }

    // ===============================
    // 3️⃣ Save to chrome.storage
    // ===============================
    chrome.storage.local.set(
      {
        vnd_account,
        vnd_token,
      },
      () => {
        alert("VND token saved successfully");
        window.close();
      }
    );
  } catch (err) {
    console.error(err);
    alert("Parse failed");
  }
});