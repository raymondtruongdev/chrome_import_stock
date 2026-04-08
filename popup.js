import { buildTSV, mapTableColumns } from "./utils/tsvHelper.js";

document.addEventListener("DOMContentLoaded", async () => {
  const stockListText = document.getElementById("stockListText");
  const importFireantBtn = document.getElementById("importFireantBtn");
  const clearFireantBtn = document.getElementById("clearFireantBtn");
  const getFireantBtn = document.getElementById("getFireantBtn");
  const getVndBtn = document.getElementById("getVndBtn");
  const importVndBtn = document.getElementById("importVndBtn");
  const clearVndBtn = document.getElementById("clearVndBtn");
  const getVPSListBtn = document.getElementById("getVPSList");
  const copyTextboxBtn = document.getElementById("copyTextboxBtn");
  const clearTextboxBtn = document.getElementById("clearTextboxBtn");
  const getVndListBtn = document.getElementById("getVndList");
  const fetchVndListBtn = document.getElementById("fetchVndList");
  const inputVndTokenUpdateBtn = document.getElementById("inputVndTokenUpdate");
  const fetchVpsListBtn = document.getElementById("fetchVpsList");
  const inputVpsTokenUpdateBtn = document.getElementById("inputVpsTokenUpdate");
  const fetchSsiListBtn = document.getElementById("fetchSsiList");
  const inputSsiTokenUpdateBtn = document.getElementById("inputSsiTokenUpdate");
  const autoVndTokenUpdateBtn = document.getElementById("autoVndTokenUpdate");
  const autoVpsTokenUpdateBtn = document.getElementById("autoVpsTokenUpdate");
  const autoSsiTokenUpdateBtn = document.getElementById("autoSsiTokenUpdate");
  const result = document.getElementById("result");
  const addSymVndChartBtn = document.getElementById("addSymVndChart");

  let activeTabId = null;

  // ==============================
  // 🔁 AUTO LOAD SAVED DATA
  // ==============================
  chrome.storage.local.get(["stockList"], ({ stockList }) => {
    if (stockList) stockListText.value = stockList;
  });

  // ==============================
  // 🔧 Utils
  // ==============================
  async function getTargetTab(urlPattern) {
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (activeTab && activeTab.url.includes(urlPattern)) return activeTab;

    const allTabs = await chrome.tabs.query({ currentWindow: true });
    return allTabs.find((t) => t.url.includes(urlPattern));
  }

  async function initActiveTab(urlPattern = "") {
    if (activeTabId) return activeTabId;

    const targetTab = await getTargetTab(urlPattern);
    if (!targetTab) return null;

    activeTabId = targetTab.id;
    return activeTabId;
  }

  function setButtonInNormal(btn) {
    btn.disabled = false;
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
    }
  }

  function setButtonInProcessing(btn, text = "Processing...") {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = text;
  }
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      console.log("TSV copied to clipboard");
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  }

  function showCustomToast(anchorEl, text = "Copied to clipboard", mode = "corner") {
    const toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = text;

    document.body.appendChild(toast);

    if (mode === "button" && anchorEl) {
      // 🔹 Toast theo vị trí button
      toast.style.position = "absolute";

      const rect = anchorEl.getBoundingClientRect();
      toast.style.left = `${rect.left + rect.width / 2}px`;
      toast.style.top = `${rect.top - 6}px`;
      toast.style.transform = "translate(-50%, 100%)";
    } else {
      // 🔹 Toast góc phải trên
      toast.style.position = "fixed";
      toast.style.top = "8px";
      toast.style.right = "8px";
      toast.style.transform = "translateY(-6px)";
    }

    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 200);
    }, 2000);
  }

  function showAlert(message) {
    alert("⚠️ " + message);
  }

  function showInfo(message) {
    alert("ℹ️ " + message);
  }

  /**
   * Render headers/rows OR TSV string to HTML Table
   */
  function renderTable(headersOrTsv, rows) {
    let headers = [];
    let dataRows = [];

    if (Array.isArray(headersOrTsv) && Array.isArray(rows)) {
      headers = headersOrTsv;
      dataRows = rows;
    } else if (typeof headersOrTsv === "string" && headersOrTsv.includes("\t")) {
      const lines = headersOrTsv.trim().split("\n");
      if (lines.length > 0) {
        headers = lines[0].split("\t");
        dataRows = lines.slice(1).map((l) => l.split("\t"));
      }
    } else {
      return;
    }

    if (headers.length === 0) return;

    let html = "<table><thead><tr>";
    headers.forEach((h) => {
      html += `<th>${h}</th>`;
    });
    html += "</tr></thead><tbody>";

    dataRows.forEach((row) => {
      html += "<tr>";
      row.forEach((c) => {
        html += `<td>${c}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    result.innerHTML = html;

    // Cập nhật luôn textbox để tiện copy
    const tsv = [headers.join("\t"), ...dataRows.map((r) => r.join("\t"))].join("\n");
    stockListText.value = tsv;
    chrome.storage.local.set({ stockList: tsv });
  }

  // ==============================
  //  CLEAR TEXTBOX CONTENT
  // ==============================
  clearTextboxBtn.addEventListener("click", async () => {
    // Clear UI
    stockListText.value = "";
    result.innerHTML = ""; // Clear table
    chrome.storage.local.set({ stockList: "" });
  });

  // ==============================
  // COPY TEXTBOX TO CLIPBOARD
  // ==============================
  copyTextboxBtn.addEventListener("click", async () => {
    const text = stockListText.value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showCustomToast(null, "Copied to clipboard", "corner");
  });

  // ==============================
  // 📥 GET FIREANT DATA
  // ==============================
  getFireantBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.url?.includes("fireant.vn/")) {
      showAlert(
        `Để lấy dữ liệu cần mở trang Fireant + mở Watchlist:
         
          https://fireant.vn/dashboard`,
      );
      return;
    }
    const tabId = tab.id;

    setButtonInProcessing(getFireantBtn);
    var text = [];
    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_FIREANT" }, (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.symbols?.length) {
        text = res.symbols.join(",");
        stockListText.value = text;
        chrome.storage.local.set({ stockList: text });
      }
      setButtonInNormal(getFireantBtn);
    });
  });

  // ==============================
  // ▶ IMPORT SYMBOLS TO FIREANT
  // ==============================
  importFireantBtn.addEventListener("click", async () => {
    setButtonInProcessing(importFireantBtn);

    const symbols = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!symbols.length) {
      setButtonInNormal(importFireantBtn);
      return;
    }

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(tabId, {
      type: "IMPORT_TO_FIREANT",
      symbols,
    });
  });

  // ==============================
  // ▶ CLEAR FIREANT SYMBOLS
  // ==============================
  clearFireantBtn.addEventListener("click", async () => {
    setButtonInProcessing(clearFireantBtn);
    const tabId = await initActiveTab();
    chrome.tabs.sendMessage(tabId, { type: "CLEAR_FIREANT" }, async (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.success) {
        result.textContent = "✅ FireAnt Symbols cleared!";
      }
      setButtonInNormal(clearFireantBtn);
    });
  });

  // ==============================
  // 📥 GET VNDIRECT DATA
  // ==============================
  getVndBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.url?.includes("trade.vndirect.com.vn/chung-khoan/danh-muc")) {
      showAlert(
        `Để lấy dữ liệu cần mở trang Danh mục của VNDirect:
            https://trade.vndirect.com.vn/chung-khoan/danh-muc`,
      );
      return;
    }
    const tabId = tab.id;
    setButtonInProcessing(getVndBtn);
    var text = [];

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (res?.symbols?.length) {
        text = res.symbols.join(",");
        stockListText.value = text;
        chrome.storage.local.set({ stockList: text });
        setButtonInNormal(getVndBtn);
      }
    });
  });
  // ==============================
  // ▶ IMPORT SYMBOLS TO VNDIRECT
  // ==============================
  importVndBtn.addEventListener("click", async () => {
    setButtonInProcessing(importVndBtn);

    const symbols = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!symbols.length) {
      setButtonInNormal(importVndBtn);
      return;
    }

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(tabId, {
      type: "IMPORT_TO_VNDIRECT",
      symbols,
    });
  });

  // ==============================
  // ▶ CLEAR VNDIRECT SYMBOLS
  // ==============================
  clearVndBtn.addEventListener("click", async () => {
    setButtonInProcessing(clearVndBtn);
    const tabId = await initActiveTab();
    chrome.tabs.sendMessage(tabId, { type: "CLEAR_VNDIRECT" }, async (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.success) {
        result.textContent = "✅ VNDIRECT Symbols cleared!";
      }
      setButtonInNormal(clearVndBtn);
    });
  });

  // ==============================
  // ▶ GET VPS LIST
  // ==============================
  getVPSListBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.url !== "https://smartoneweb.vps.com.vn/assets-normal") {
      showAlert(
        `Để lấy dữ liệu cần mở trang Danh mục của VPS:
         
        https://smartoneweb.vps.com.vn/assets-normal`,
      );
      return;
    }

    setButtonInProcessing(getVPSListBtn);

    const tabId = tab.id;
    chrome.tabs.sendMessage(tabId, { type: "GET_VPS_LIST" }, async (res) => {
      if (res?.error) {
        showAlert(res.error);
        result.textContent = "❌ " + res.error;
        setButtonInNormal(getVPSListBtn);
        return;
      }

      const mapped = mapTableColumns({
        ...res,
        outputColumns: [
          { key: "Mã CK", label: "Mã" },
          { key: "Tổng", label: "KL" },
          { key: "Có thể bán", label: "GD" },
          { key: "Giá TB", label: "Giá TB", transform: multiplyBy1000 },
          { key: "Giá TT", label: "Giá hiện tại", transform: multiplyBy1000 },
        ],
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);

      // Show in Textbox
      stockListText.value = tsv;
      renderTable(tsv);

      // Auto copy to CLIPBOARD
      await copyToClipboard(tsv);

      // Show TOAST 2s
      showCustomToast(getVPSListBtn, "Copied to clipboard", "button");

      setButtonInNormal(getVPSListBtn);
    });
  });

  function divideBy1000(value) {
    if (!value) return "";
    const num = Number(value.replace(/,/g, "").replace(/\s/g, ""));
    return Number.isNaN(num) ? value : num / 1000;
  }

  function multiplyBy1000(value) {
    if (!value) return "";
    const num = Number(value.replace(/,/g, "").replace(/\s/g, ""));
    return Number.isNaN(num) ? value : num * 1000;
  }

  // ==============================
  // ▶ GET VND LIST
  // ==============================
  getVndListBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.url !== "https://trade.vndirect.com.vn/giao-dich/danh-muc") {
      showAlert(
        `Vui lòng mở trang của VNDirect:

             https://trade.vndirect.com.vn/giao-dich/danh-muc `,
      );
      return;
    }

    setButtonInProcessing(getVndListBtn);

    const tabId = tab.id;

    chrome.tabs.sendMessage(tabId, { type: "GET_VND_LIST" }, async (res) => {
      if (res?.error) {
        showAlert(res.error);
        result.textContent = "❌ " + res.error;
        setButtonInNormal(getVndListBtn);
        return;
      }

      const mapped = mapTableColumns({
        ...res,
        outputColumns: [
          { key: "Mã", label: "Mã" },
          { key: "KL", label: "KL" },
          { key: "GD", label: "GD" },
          { key: "Giá vốn", label: "Giá TB" },
          {
            key: "Giá hiện tại",
            label: "Giá hiện tại",
          },
        ],
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);

      stockListText.value = tsv;
      renderTable(tsv);
      await copyToClipboard(tsv);
      showCustomToast(getVndListBtn, "Copied to clipboard", "button");
      setButtonInNormal(getVndListBtn);
    });
  });
  // ==============================
  // ▶ ADD SYMBOLS TO VND CHART
  // ==============================
  addSymVndChartBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (
      tab.url !==
      "https://dchart.vndirect.com.vn/?symbol=DCM&domain=https%3A%2F%2Ftrade.vndirect.com.vn&timeframe=D&language=vi&theme=dark&disablesyncsymbol=true&&indicator=&ignoreIndicator=ma,ema,macd,rsi,boll&autosave=true"
    ) {
      showAlert(
        `Vui lòng thực hiện các bước sau:

            1. Đăng nhập VNDirect

            2. Mở trang biểu đồ:
            https://dchart.vndirect.com.vn/?symbol=DCM&domain=https%3A%2F%2Ftrade.vndirect.com.vn&timeframe=D&language=vi&theme=dark&disablesyncsymbol=true&&indicator=&ignoreIndicator=ma,ema,macd,rsi,boll&autosave=true
            
            Sau đó thử lại.`,
      );
      return;
    }

    const symbols = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!symbols.length) {
      setButtonInNormal(addSymVndChartBtn);
      return;
    }

    setButtonInProcessing(addSymVndChartBtn);

    const tabId = tab.id;

    chrome.tabs.sendMessage(tabId, { type: "ADD_SYMBOLS_TO_VND_CHART", symbols }, async (res) => {
      if (res?.error) {
        showAlert(res.error);
        result.textContent = "❌ " + res.error;
        setButtonInNormal(addSymVndChartBtn);
        return;
      }
    });
  });

  // ==============================
  // ▶ UPDATE VND TOKEN
  // ==============================
  inputVndTokenUpdateBtn.addEventListener("click", async () => {
    setButtonInProcessing(inputVndTokenUpdateBtn);
    const POPUP_WIDTH = 450;
    const POPUP_HEIGHT = 350;

    const screenWidth = screen.availWidth;
    const screenHeight = screen.availHeight;

    const left = Math.round((screenWidth - POPUP_WIDTH) / 2);
    const top = Math.round((screenHeight - POPUP_HEIGHT) / 2);

    chrome.windows.create(
      {
        url: chrome.runtime.getURL("/ui/token_popup_vnd.html"),
        type: "popup",
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        left,
        top,
      },
      () => {
        setButtonInNormal(inputVndTokenUpdateBtn);
      },
    );
  });

  // ==============================
  // ▶ FETCH VND PORTFOLIO LIST
  // ==============================

  fetchVndListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchVndListBtn);

    try {
      const { vnd_account, vnd_token } = await chrome.storage.local.get(["vnd_account", "vnd_token"]);

      if (!vnd_account || !vnd_token) {
        showAlert("Vui lòng import curl VND trước");
        setButtonInNormal(fetchVndListBtn);
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "FETCH_VND_LIST",
          vnd_account,
          vnd_token,
        },
        async (response) => {
          if (response?.error) {
            showAlert("Token hết hạn hoặc lỗi kết nối VND. Hãy Auto Update.");
          } else if (response?.headers && response?.rows) {
            copyToClipboard(response.tsv);
            renderTable(response.headers, response.rows);
            showCustomToast(fetchVndListBtn, "Portfolio Updated", "button");
          }
          setButtonInNormal(fetchVndListBtn);
        },
      );
    } catch (err) {
      console.error("[FETCH_VND_LIST]", err);
      showAlert("Có lỗi xảy ra");
      setButtonInNormal(fetchVndListBtn);
    }
  });

  // ==============================
  // ▶ UPDATE VPS TOKEN
  // ==============================
  inputVpsTokenUpdateBtn.addEventListener("click", async () => {
    setButtonInProcessing(inputVpsTokenUpdateBtn);

    const POPUP_WIDTH = 450;
    const POPUP_HEIGHT = 350;
    const screenWidth = screen.availWidth;
    const screenHeight = screen.availHeight;

    const left = Math.round((screenWidth - POPUP_WIDTH) / 2);
    const top = Math.round((screenHeight - POPUP_HEIGHT) / 2);

    chrome.windows.create(
      {
        url: chrome.runtime.getURL("/ui/token_popup_vps.html"),
        type: "popup",
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        left,
        top,
      },
      () => {
        setButtonInNormal(inputVpsTokenUpdateBtn);
      },
    );
  });

  // ==============================
  // ▶ FETCH VPS PORTFOLIO LIST
  // ==============================
  fetchVpsListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchVpsListBtn);

    try {
      const { vps_session, vps_user, vps_account } = await chrome.storage.local.get([
        "vps_session",
        "vps_user",
        "vps_account",
      ]);

      if (!vps_session || !vps_user || !vps_account) {
        showAlert("Vui lòng import curl VPS trước");
        setButtonInNormal(fetchVpsListBtn);
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "FETCH_VPS_LIST",
          vps_session,
          vps_user,
          vps_account,
        },
        async (response) => {
          if (response?.error) {
            showAlert("Session hết hạn hoặc lỗi kết nối VPS. Hãy Auto Update.");
          } else if (response?.headers && response?.rows) {
            copyToClipboard(response.tsv);
            renderTable(response.headers, response.rows);
            showCustomToast(fetchVpsListBtn, "Portfolio Updated", "button");
          }
          setButtonInNormal(fetchVpsListBtn);
        },
      );
    } catch (err) {
      console.error("[FETCH_VPS_LIST]", err);
      showAlert("Có lỗi xảy ra");
      setButtonInNormal(fetchVpsListBtn);
    }
  });

  // ==============================
  // ▶ UPDATE SSI TOKEN
  // ==============================
  inputSsiTokenUpdateBtn.addEventListener("click", async () => {
    setButtonInProcessing(inputSsiTokenUpdateBtn);

    const POPUP_WIDTH = 450;
    const POPUP_HEIGHT = 350;
    const screenWidth = screen.availWidth;
    const screenHeight = screen.availHeight;

    const left = Math.round((screenWidth - POPUP_WIDTH) / 2);
    const top = Math.round((screenHeight - POPUP_HEIGHT) / 2);

    chrome.windows.create(
      {
        url: chrome.runtime.getURL("/ui/token_popup_ssi.html"),
        type: "popup",
        width: POPUP_WIDTH,
        height: POPUP_HEIGHT,
        left,
        top,
      },
      () => {
        setButtonInNormal(inputSsiTokenUpdateBtn);
      },
    );
  });

  // ==============================
  // ▶ FETCH SSI PORTFOLIO LIST
  // ==============================
  fetchSsiListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchSsiListBtn);

    try {
      const { ssi_device_id, ssi_token, ssi_account } = await chrome.storage.local.get([
        "ssi_device_id",
        "ssi_token",
        "ssi_account",
      ]);

      if (!ssi_device_id || !ssi_token || !ssi_account) {
        showAlert("Vui lòng import curl SSI trước");
        setButtonInNormal(fetchSsiListBtn);
        return;
      }

      chrome.runtime.sendMessage(
        {
          type: "FETCH_SSI_LIST",
          ssi_device_id,
          ssi_token,
          ssi_account,
        },
        async (response) => {
          if (response?.error) {
            showAlert("Token hết hạn hoặc lỗi kết nối SSI. Hãy Auto Update.");
          } else if (response?.headers && response?.rows) {
            copyToClipboard(response.tsv);
            renderTable(response.headers, response.rows);
            showCustomToast(fetchSsiListBtn, "Portfolio Updated", "button");
          }
          setButtonInNormal(fetchSsiListBtn);
        },
      );
    } catch (err) {
      console.error("[FETCH_SSI_LIST]", err);
      showAlert("Có lỗi xảy ra");
      setButtonInNormal(fetchSsiListBtn);
    }
  });
  // ==============================
  // 🔔 Listen for completion
  // ==============================

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case "IMPORT_FIREANT_DONE":
        setButtonInNormal(importFireantBtn);
        window.close();
        break;

      case "IMPORT_VNDIRECT_DONE":
        setButtonInNormal(importVndBtn);
        window.close();
        break;
      case "ADD_SYMBOLS_TO_VND_CHART_DONE":
        showCustomToast(addSymVndChartBtn, "Finished", "button");
        setButtonInNormal(addSymVndChartBtn);
        window.close();

      default:
        break;
    }
  });

  // ==============================
  // Auto update VND Token (cách này vì VND khó lấy token từ content script, nên phải bắt request để lấy)
  // ==============================
  autoVndTokenUpdateBtn.addEventListener("click", async () => {
    const tab = await getTargetTab("trade.vndirect.com.vn");

    if (!tab) {
      result.textContent = "Vui lòng mở trang trade.vndirect.com.vn";
      return;
    }

    result.textContent = "Đang bắt request...";

    chrome.runtime.sendMessage({ type: "GET_VND_AFTYPE_CURL", tabId: tab.id }, (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.success) {
        result.textContent = "✅ VND Token đã được cập nhật tự động!";
        showCustomToast(autoVndTokenUpdateBtn, "VND Token Updated", "button");
      } else {
        result.textContent = "Không tìm thấy request /aftype";
      }
    });
  });

  // ==============================
  // Auto update VPS Token (cách này vì VPS khó lấy token từ content script, nên phải bắt request để lấy)
  // ==============================
  autoVpsTokenUpdateBtn.addEventListener("click", async () => {
    const tab = await getTargetTab("smartoneweb.vps.com.vn");

    if (!tab) {
      result.textContent = "Vui lòng mở trang smartoneweb.vps.com.vn";
      return;
    }

    result.textContent = "Đang bắt request VPS...";

    chrome.runtime.sendMessage({ type: "GET_VPS_GETACCOUNTINFO_CURL", tabId: tab.id }, (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.success) {
        result.textContent = "✅ VPS Token đã được cập nhật tự động!";
        showCustomToast(autoVpsTokenUpdateBtn, "VPS Token Updated", "button");
      } else {
        result.textContent = "Không tìm thấy request /getAccountInfo";
      }
    });
  });

  // ==============================
  // Auto update SSI Token
  // ==============================
  autoSsiTokenUpdateBtn.addEventListener("click", async () => {
    const tab = await getTargetTab("iboard.ssi.com.vn");
    if (!tab) {
      result.textContent = "Vui lòng mở trang iboard.ssi.com.vn";
      return;
    }
    result.textContent = "Đang bắt request SSI...";
    const tabId = tab.id;
    // SSI token is stored in localStorage of ssi website, we can read it directly with 'content.js'
    // , no need to use debugger to capture request like VND/VPS
    chrome.tabs.sendMessage(tabId, { type: "AUTO_FIND_SSI_TOKEN" }, async (res) => {
      if (res?.error) {
        result.textContent = res.error;
      } else if (res?.success) {
        result.textContent = "✅ SSI Token đã được cập nhật tự động!";
        showCustomToast(autoSsiTokenUpdateBtn, "SSI Token Updated", "button");
        chrome.storage.local.set({
          ssi_account: res.ssi_account + "1", // Hardcode SSI account 1
          ssi_token: res.ssi_token,
          ssi_device_id: res.ssi_device_id,
        });
      }
    });
  });
});
