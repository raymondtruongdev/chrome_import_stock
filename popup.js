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
  async function initActiveTab() {
    if (activeTabId) return activeTabId;

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    activeTabId = tab.id;

    // Inject content.js ONCE
    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      files: ["content.js"],
    });

    return activeTabId;
  }

  function setButtonInNormal(btn, text) {
    btn.disabled = false;
    btn.textContent = text;
  }

  function setButtonInProcessing(btn, text = "Processing...") {
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

  function showCustomToast(
    anchorEl,
    text = "Copied to clipboard",
    mode = "corner",
  ) {
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
   * Render TSV string to HTML Table in #result element
   * @param {string} tsv
   */
  function renderTable(tsv) {
    const resultEl = document.getElementById("result");
    if (!tsv || !tsv.includes("\t")) {
      // resultEl.textContent = tsv || ""; // If not TSV, show as text
      return;
    }

    const rows = tsv.trim().split("\n");
    if (rows.length === 0) return;

    let html = "<table><thead><tr>";

    // Header
    const headers = rows[0].split("\t");
    headers.forEach((h) => {
      html += `<th>${h}</th>`;
    });
    html += "</tr></thead><tbody>";

    // Body
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split("\t");
      html += "<tr>";
      cols.forEach((c) => {
        html += `<td>${c}</td>`;
      });
      html += "</tr>";
    }

    html += "</tbody></table>";
    resultEl.innerHTML = html;
  }

  // ==============================
  //  CLEAR TEXTBOX CONTENT
  // ==============================
  clearTextboxBtn.addEventListener("click", async () => {
    // Clear UI
    stockListText.value = "";
    document.getElementById("result").innerHTML = ""; // Clear table
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
    setButtonInProcessing(getFireantBtn);
    const tabId = await initActiveTab();
    var text = [];
    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_STOCK_LIST_FIREANT" },
      (res) => {
        if (res?.symbols?.length) {
          text = res.symbols.join(",");
          stockListText.value = text;
          chrome.storage.local.set({ stockList: text });
        } else {
          showAlert("Vui lòng mở trang https://fireant.vn/charts và thử lại.");
        }
      },
    );
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
      setButtonInNormal(importFireantBtn, "Import Fireant");
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
    chrome.tabs.sendMessage(tabId, {
      type: "CLEAR_FIREANT",
    });
  });

  // ==============================
  // 📥 GET VNDIRECT DATA
  // ==============================
  getVndBtn.addEventListener("click", async () => {
    setButtonInProcessing(getVndBtn);

    const tabId = await initActiveTab();
    var text = [];

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (res?.symbols?.length) {
        text = res.symbols.join(",");
        stockListText.value = text;
        chrome.storage.local.set({ stockList: text });
      } else {
        showAlert(
          "Vui lòng mở trang https://trade.vndirect.com.vn/ và thử lại.",
        );
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
      setButtonInNormal(importVndBtn, "Import Vndirect");
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
    chrome.tabs.sendMessage(tabId, {
      type: "CLEAR_VNDIRECT",
    });
  });

  // ==============================
  // ▶ GET VPS LIST
  // ==============================
  getVPSListBtn.addEventListener("click", async () => {
    setButtonInProcessing(getVPSListBtn);

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(tabId, { type: "GET_VPS_LIST" }, async (res) => {
      if (!res || !res.tsv) {
        console.warn("No TSV received");
        return;
      }

      // Show in Textbox
      stockListText.value = res.tsv;
      renderTable(res.tsv);

      // Auto copy to CLIPBOARD
      await copyToClipboard(res.tsv);

      // Show TOAST 2s
      showCustomToast(getVPSListBtn, "Copied to clipboard", "button");

      // Save to local storage
      // chrome.storage.local.set({stockList: res.tsv,});
    });
  });

  // ==============================
  // ▶ GET VND LIST
  // ==============================
  getVndListBtn.addEventListener("click", async () => {
    setButtonInProcessing(getVndListBtn);

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(tabId, { type: "GET_VND_LIST" }, async (res) => {
      if (!res || !res.tsv) {
        console.warn("No TSV received");
        return;
      }

      stockListText.value = res.tsv;
      await copyToClipboard(res.tsv);
      showCustomToast(getVndListBtn, "Copied to clipboard", "button");
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
        setButtonInNormal(inputVndTokenUpdateBtn, "Update VND Token");
      },
    );
  });

  // ==============================
  // ▶ FETCH VND PORTFOLIO LIST
  // ==============================

  fetchVndListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchVndListBtn);

    try {
      // Lấy VND token từ chrome storage
      const { vnd_account, vnd_token } = await chrome.storage.local.get([
        "vnd_account",
        "vnd_token",
      ]);

      // Kiểm tra tồn tại
      if (!vnd_account || !vnd_token) {
        showAlert("Vui lòng import curl VND trước");
        return;
      }

      const tabId = await initActiveTab();

      const response = await chrome.tabs.sendMessage(tabId, {
        type: "FETCH_VND_LIST",
        vnd_account,
        vnd_token,
      });

      if (response?.error) {
        switch (response.error) {
          case "HTTP_401":
          case "HTTP_403":
            showAlert("Token hết hạn. Import curl mới.");
            return;

          case "FETCH_FAILED":
            showAlert("Không thể kết nối VND");
            return;

          default:
            showAlert("Không lấy được dữ liệu VND");
            return;
        }
      }

      if (!response?.tsv) {
        showAlert("Dữ liệu trả về rỗng");
        return;
      }

      stockListText.value = response.tsv;
      renderTable(response.tsv);
      await copyToClipboard(response.tsv);
      showCustomToast(fetchVndListBtn, "Copied to clipboard", "button");
    } catch (err) {
      console.error("[FETCH_VND_LIST]", err);
      showAlert("Có lỗi xảy ra");
    } finally {
      setButtonInNormal(fetchVndListBtn, "Fetch VND List");
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
        setButtonInNormal(inputVpsTokenUpdateBtn, "Update VPS Token");
      },
    );
  });

  // ==============================
  // ▶ FETCH VPS PORTFOLIO LIST
  // ==============================
  fetchVpsListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchVpsListBtn);

    try {
      // Lấy từ chrome storage
      const { vps_deviceNew, vps_session, vps_user, vps_account } =
        await chrome.storage.local.get([
          "vps_deviceNew",
          "vps_session",
          "vps_user",
          "vps_account",
        ]);

      // Kiểm tra tồn tại
      if (!vps_deviceNew || !vps_session || !vps_user || !vps_account) {
        showAlert("Vui lòng import curl VPS trước");
        return;
      }

      const tabId = await initActiveTab();

      const response = await chrome.tabs.sendMessage(tabId, {
        type: "FETCH_VPS_LIST",
        deviceNew: vps_deviceNew,
        session: vps_session,
        user: vps_user,
        account: vps_account,
      });

      if (response?.error) {
        switch (response.error) {
          case "HTTP_401":
          case "HTTP_403":
            showAlert("Session hết hạn. Import curl mới.");
            return;

          case "FETCH_FAILED":
            showAlert("Không thể kết nối VPS");
            return;

          default:
            showAlert("Không lấy được dữ liệu VPS");
            return;
        }
      }

      if (!response?.tsv) {
        showAlert("Dữ liệu trả về rỗng");
        return;
      }

      stockListText.value = response.tsv;
      renderTable(response.tsv);
      await copyToClipboard(response.tsv);
      showCustomToast(fetchVpsListBtn, "Copied to clipboard", "button");
    } catch (err) {
      console.error("[FETCH_VPS_LIST]", err);
      showAlert("Có lỗi xảy ra");
    } finally {
      setButtonInNormal(fetchVpsListBtn, "Fetch VPS List");
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
        setButtonInNormal(inputSsiTokenUpdateBtn, "Update SSI Token");
      },
    );
  });

  // ==============================
  // ▶ FETCH SSI PORTFOLIO LIST
  // ==============================
  fetchSsiListBtn.addEventListener("click", async () => {
    setButtonInProcessing(fetchSsiListBtn);

    try {
      // Lấy từ chrome storage
      const { ssi_device_id, ssi_token, ssi_account } =
        await chrome.storage.local.get([
          "ssi_device_id",
          "ssi_token",
          "ssi_account",
        ]);

      // Kiểm tra tồn tại
      if (!ssi_device_id || !ssi_token || !ssi_account) {
        showAlert("Vui lòng import curl SSI trước");
        return;
      }

      const tabId = await initActiveTab();

      const response = await chrome.tabs.sendMessage(tabId, {
        type: "FETCH_SSI_LIST",
        deviceId: ssi_device_id,
        token: ssi_token,
        account: ssi_account,
      });

      if (response?.error) {
        switch (response.error) {
          case "HTTP_401":
          case "HTTP_403":
            showAlert("Token hết hạn. Import curl mới.");
            return;

          case "FETCH_FAILED":
            showAlert("Không thể kết nối SSI");
            return;

          default:
            showAlert("Không lấy được dữ liệu SSI");
            return;
        }
      }

      if (!response?.tsv) {
        showAlert("Dữ liệu trả về rỗng");
        return;
      }

      stockListText.value = response.tsv;
      renderTable(response.tsv);
      await copyToClipboard(response.tsv);
      showCustomToast(fetchSsiListBtn, "Copied to clipboard", "button");
    } catch (err) {
      console.error("[FETCH_SSI_LIST]", err);
      showAlert("Có lỗi xảy ra");
    } finally {
      setButtonInNormal(fetchSsiListBtn, "Fetch SSI List");
    }
  });
  // ==============================
  // 🔔 Listen for completion
  // ==============================

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case "GET_FIREANT_DONE":
        setButtonInNormal(getFireantBtn, "Get Fireant");
        break;

      case "IMPORT_FIREANT_DONE":
        setButtonInNormal(importFireantBtn, "Import Fireant");
        window.close();
        break;

      case "CLEAR_FIREANT_DONE":
        setButtonInNormal(clearFireantBtn, "Clear Fireant");
        break;

      case "GET_VNDIRECT_DONE":
        setButtonInNormal(getVndBtn, "Get Vndirect");
        break;

      case "IMPORT_VNDIRECT_DONE":
        setButtonInNormal(importVndBtn, "Import Vndirect");
        window.close();
        break;

      case "CLEAR_VNDIRECT_DONE":
        setButtonInNormal(clearVndBtn, "Clear Vndirect");
        break;

      case "GET_VPS_LIST_DONE":
        setButtonInNormal(getVPSListBtn, "Get VPS List");
        break;

      case "GET_VND_LIST_DONE":
        setButtonInNormal(getVndListBtn, "Get VND List");
        break;

      default:
        break;
    }
  });

  // ==============================
  // Auto Token VND
  // ==============================
  autoVndTokenUpdateBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("trade.vndirect.com.vn")) {
      result.textContent = "Vui lòng mở trang trade.vndirect.com.vn";
      return;
    }

    result.textContent = "Đang bắt request...";

    chrome.runtime.sendMessage(
      { type: "GET_VND_AFTYPE_CURL", tabId: tab.id },
      (res) => {
        if (res?.error) {
          result.textContent = res.error;
        } else if (res?.success) {
          result.textContent = "✅ VND Token đã được cập nhật tự động!";
          showCustomToast(autoVndTokenUpdateBtn, "VND Token Updated", "button");
        } else {
          result.textContent = "Không tìm thấy request /aftype";
        }
      },
    );
  });

  // ==============================
  // Auto Token VPS
  // ==============================
  autoVpsTokenUpdateBtn.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("smartoneweb.vps.com.vn")) {
      result.textContent = "Vui lòng mở trang smartoneweb.vps.com.vn";
      return;
    }

    result.textContent = "Đang bắt request VPS...";

    chrome.runtime.sendMessage(
      { type: "GET_VPS_GETACCOUNTINFO_CURL", tabId: tab.id },
      (res) => {
        if (res?.error) {
          result.textContent = res.error;
        } else if (res?.success) {
          result.textContent = "✅ VPS Token đã được cập nhật tự động!";
          showCustomToast(autoVpsTokenUpdateBtn, "VPS Token Updated", "button");
        } else {
          result.textContent = "Không tìm thấy request /getAccountInfo";
        }
      },
    );
  });

  // ==============================
  // Auto Token SSI
  // ==============================
  autoSsiTokenUpdateBtn.addEventListener("click", () => {
    result.textContent = "Tính năng tự động cho SSI đang được phát triển.";
  });
});
