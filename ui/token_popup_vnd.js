import { parseVndCurl } from "../utils/vndParser.js";
import { saveToStorage } from "../utils/storage.js";

const curlInput = document.getElementById("curlInput");
const parseBtn = document.getElementById("parseBtn");

parseBtn.addEventListener("click", async () => {
  const curlText = curlInput.value?.trim();

  if (!curlText) {
    alert("Curl command cannot be empty");
    return;
  }

  try {
    // Get token & account from curl
    const { vnd_account, vnd_token } = parseVndCurl(curlText);

    if (!vnd_account || !vnd_token) {
      alert("Cannot parse VND curl. Please check format.");
      return;
    }

    // Save to storage
    await saveToStorage({
      vnd_account,
      vnd_token,
    });
    alert("VND token saved successfully");
    window.close();
  } catch (err) {
    alert("Parse failed");
  }
});
