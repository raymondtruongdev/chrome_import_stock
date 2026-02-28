import { parseVndCurl } from "./utils/vndParser.js";
import { parseVpsCurl } from "./utils/vpsParser.js";
import { saveToStorage } from "./utils/storage.js";
import { buildCurlFromRequest } from "./utils/curlBuilder.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "GET_VND_AFTYPE_CURL" && message.type !== "GET_VPS_GETACCOUNTINFO_CURL") return;

  const tabId = message.tabId;

  chrome.debugger.attach({ tabId }, "1.3", () => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: "Không attach được debugger. Có thể do DevTools đang mở." });
      return;
    }

    chrome.debugger.sendCommand({ tabId }, "Network.enable");

    const timeout = setTimeout(() => {
      cleanup();
      sendResponse({
        error: "Timeout: Không thấy request cần thiết. Hãy reload trang hoặc thử lại.",
      });
    }, 15000);

    const listener = (source, method, params) => {
      if (method !== "Network.requestWillBeSent") return;

      const url = params.request.url;
      console.log("Checking URL:", url); // Log để debug
      let found = false;
      let parseFunc = null;

      if (message.type === "GET_VND_AFTYPE_CURL" && url.toLowerCase().includes("/aftype")) {
        found = true;
        parseFunc = parseVndCurl;
      } else if (message.type === "GET_VPS_GETACCOUNTINFO_CURL" && url.toLowerCase().includes("getaccountinfo")) {
        found = true;
        parseFunc = parseVpsCurl;
      }

      if (found) {
        const curl = buildCurlFromRequest(params.request);
        cleanup();

        try {
          const parsedData = parseFunc(curl);
          saveToStorage(parsedData);
          sendResponse({ success: true, curl });
        } catch (err) {
          sendResponse({ error: "Lỗi khi parse dữ liệu từ request." });
        }
      }
    };

    function cleanup() {
      clearTimeout(timeout);
      chrome.debugger.onEvent.removeListener(listener);
      chrome.debugger.detach({ tabId });
    }

    chrome.debugger.onEvent.addListener(listener);

    // Reload để chắc chắn bắt được request
    chrome.tabs.reload(tabId);
  });

  return true; // giữ sendResponse async
});
