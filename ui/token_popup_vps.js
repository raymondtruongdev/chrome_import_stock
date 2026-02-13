const curlInput = document.getElementById("curlInput");
const parseBtn = document.getElementById("parseBtn");

parseBtn.addEventListener("click", () => {
  const curlText = curlInput.value;

  if (!curlText) {
    alert("Curl command cannot be empty");
    return;
  }

  try {
    // 🔥 Normalize: bỏ \ newline
    const normalized = curlText.replace(/\\\n/g, " ");

    // ===== Extract header =====
    const getHeader = (name) => {
      const regex = new RegExp(
        `-H\\s+['"]${name}:\\s*([^'"]+)['"]`,
        "i"
      );
      const match = normalized.match(regex);
      return match ? match[1].trim() : "";
    };

    const vps_deviceNew = getHeader("x-device-new");
    const vps_session = getHeader("x-session");
    const vps_user = getHeader("x-user");

    // ===== Extract body =====
    const bodyRegex = /--data-raw\s+['"]({[\s\S]*?})['"]/i;
    const bodyMatch = normalized.match(bodyRegex);

    let vps_account = "";

    if (bodyMatch) {
      const bodyJson = JSON.parse(bodyMatch[1]);
      vps_account = bodyJson.p1 || "";
    }

    if (!vps_deviceNew || !vps_session || !vps_user || !vps_account) {
      alert("Cannot parse curl. Please check format.");
      return;
    }

    chrome.storage.local.set(
      {
        vps_deviceNew,
        vps_session,
        vps_user,
        vps_account,
      },
      () => {
        alert("Saved successfully");
        window.close();
      }
    );
  } catch (err) {
    console.error(err);
    alert("Parse failed");
  }
});