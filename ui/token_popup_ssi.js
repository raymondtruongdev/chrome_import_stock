import { parseSsiCurl } from "../utils/ssiParser.js";
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
    const { ssi_account, ssi_token, ssi_device_id } = parseSsiCurl(curlText);

    if (!ssi_account || !ssi_token || !ssi_device_id) {
      alert("Cannot parse curl. Please check format.");
      return;
    }

    await saveToStorage({
      ssi_account,
      ssi_token,
      ssi_device_id,
    });

    alert("SSI token saved successfully");
    window.close();
  } catch (err) {
    console.error(err);
    alert("Parse SSI token failed");
  }
});
