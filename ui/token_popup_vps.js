import { parseVpsCurl } from "../utils/vpsParser.js";
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
    const { vps_deviceNew, vps_session, vps_user, vps_account } =
      parseVpsCurl(curlText);

    if (!vps_deviceNew || !vps_session || !vps_user || !vps_account) {
      alert("Cannot parse curl. Please check format.");
      return;
    }

    await saveToStorage({
      vps_deviceNew,
      vps_session,
      vps_user,
      vps_account,
    });

    alert("Saved VPS token successfully");
    window.close();
  } catch (err) {
    console.error(err);
    alert("Parse VPS token failed");
  }
});
