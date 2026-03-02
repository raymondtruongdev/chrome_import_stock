import { parseVndCurl } from "./utils/vndParser.js";
import { parseVpsCurl } from "./utils/vpsParser.js";
import { parseSsiCurl } from "./utils/ssiParser.js";
import { saveToStorage } from "./utils/storage.js";
import { buildCurlFromRequest } from "./utils/curlBuilder.js";

// ====================================
// KHAI BÁO RULE CHO VPS ĐỂ VƯỢT CORS
// ====================================
chrome.runtime.onInstalled.addListener(() => {
  const RULE_ID = 1;
  chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [RULE_ID],
    addRules: [
      {
        id: RULE_ID,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Origin",
              operation: "set",
              value: "https://smartoneweb.vps.com.vn",
            },
            {
              header: "Referer",
              operation: "set",
              value: "https://smartoneweb.vps.com.vn/",
            },
          ],
        },
        condition: {
          urlFilter: "webtrading-proxy.vps.com.vn/rest-api/*",
          resourceTypes: ["xmlhttprequest"],
        },
      },
    ],
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ====================================
  // 1. CHỈNH SỬA: XỬ LÝ AUTO UPDATE TOKEN (CẦN DEBUGGER)
  // ====================================
  if (
    message.type === "GET_VND_AFTYPE_CURL" ||
    message.type === "GET_VPS_GETACCOUNTINFO_CURL" ||
    message.type === "GET_SSI_STOCKPOSITION_CURL"
  ) {
    const tabId = message.tabId;

    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) {
        sendResponse({
          error: "Không attach được debugger. Có thể do DevTools đang mở.",
        });
        return;
      }

      chrome.debugger.sendCommand({ tabId }, "Network.enable");

      const timeout = setTimeout(() => {
        cleanup();
        sendResponse({
          error:
            "Timeout: Không thấy request cần thiết. Hãy reload trang hoặc thử lại.",
        });
      }, 15000);

      const listener = (source, method, params) => {
        if (method !== "Network.requestWillBeSent") return;

        const url = params.request.url;
        let found = false;
        let parseFunc = null;

        if (
          message.type === "GET_VND_AFTYPE_CURL" &&
          url.toLowerCase().includes("/aftype")
        ) {
          found = true;
          parseFunc = parseVndCurl;
        } else if (
          message.type === "GET_VPS_GETACCOUNTINFO_CURL" &&
          url.toLowerCase().includes("getaccountinfo")
        ) {
          found = true;
          parseFunc = parseVpsCurl;
        } else if (
          message.type === "GET_SSI_STOCKPOSITION_CURL" &&
          (url.toLowerCase().includes("stock-position") ||
            url.toLowerCase().includes("additional-shares-stock"))
        ) {
          found = true;
          parseFunc = parseSsiCurl;
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
      chrome.tabs.reload(tabId);
    });

    return true;
  }

  // ====================================
  // 2. CHỈNH SỬA: XỬ LÝ FETCH DATA (BẰNG API)
  // ====================================

  // --------- VND FETCH ---------
  if (message.type === "FETCH_VND_LIST") {
    (async () => {
      try {
        const res = await fetch(
          `https://trade-api.vndirect.com.vn/am/statement?type=REALTIME&accountNo=${message.vnd_account}&pageSize=1500&pageIndex=0&secTypeName=Normal+share,Special+share,Fund+unit,ETF:+Exchange+Traded+Fund,Covered+Warrant`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              "X-AUTH-TOKEN": message.vnd_token,
            },
          },
        );

        if (!res.ok) {
          sendResponse({ error: `HTTP_${res.status}` });
          return;
        }

        const json = await res.json();
        const headers = ["symbol", "quantity", "averagePrice", "currentPrice"];
        const rows = (json.hits || []).map((item) =>
          headers.map((h) => item[h] || ""),
        );

        sendResponse({ headers, rows });
      } catch (err) {
        sendResponse({ error: "FETCH_FAILED: " + err.message });
      }
    })();
    return true;
  }

  // --------- VPS FETCH ---------
  if (message.type === "FETCH_VPS_LIST") {
    (async () => {
      try {
        const res = await fetch(
          "https://webtrading-proxy.vps.com.vn/rest-api/Q/web.portfolio.portfoliostatus",
          {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
              "x-session": message.vps_session,
              "x-user": message.vps_user,
            },
            body: JSON.stringify({
              type: "string",
              cmd: "Web.Portfolio.PortfolioStatus",
              p1: message.vps_account,
              p2: "1",
              p3: "20",
              p4: "",
              p5: "",
            }),
          },
        );

        if (!res.ok) {
          sendResponse({ error: `HTTP_${res.status}` });
          return;
        }

        const json = await res.json();
        if (!json || (!json.data && !json.result)) {
          sendResponse({
            error: "Dữ liệu trả về từ VPS không hợp lệ hoặc trống.",
          });
          return;
        }
        const list = json.data || json.result || [];
        const filteredList = list.filter((item) => item.symbol !== "TOTAL");
        const headers = ["symbol", "quantity", "averagePrice", "currentPrice"];
        const rows = filteredList.map((item) => [
          item.symbol || "",
          item.actual_vol || 0,
          item.avg_price || 0,
          item.market_price || 0,
        ]);

        sendResponse({ headers, rows });
      } catch (err) {
        sendResponse({ error: "FETCH_FAILED: " + err.message });
      }
    })();
    return true;
  }

  // --------- SSI FETCH ---------
  if (message.type === "FETCH_SSI_LIST") {
    (async () => {
      try {
        const res = await fetch(
          `https://iboard-tapi.ssi.com.vn/trading/stock-position?account=${message.ssi_account}&status=holding`,
          {
            headers: {
              Accept: "application/json, text/plain, */*",
              Authorization: `Bearer ${message.ssi_token}`,
              "device-id": message.ssi_deviceId,
            },
          },
        );

        if (!res.ok) {
          sendResponse({ error: `HTTP_${res.status}` });
          return;
        }

        const json = await res.json();
        if (!json || !json.data) {
          sendResponse({
            error: "Dữ liệu trả về từ SSI không hợp lệ hoặc trống.",
          });
          return;
        }

        const list = json.data.stockPositions || []; // Dữ liệu SSI nằm trong stockPositions
        const headers = ["symbol", "quantity", "averagePrice", "currentPrice"];
        const rows = list.map((item) => [
          item.stockSymbol || item.instrumentID,
          item.vol || 0,
          item.avgPrice || 0,
          item.matchedPrice || item.refPrice || 0, // Fallback nếu marketPrice bằng 0
        ]);

        sendResponse({ headers, rows });
      } catch (err) {
        sendResponse({ error: "FETCH_FAILED: " + err.message });
      }
    })();
    return true;
  }
});
