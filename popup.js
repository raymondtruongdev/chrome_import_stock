document.addEventListener("DOMContentLoaded", async () => {
  const stockListText = document.getElementById("stockListText");
  const importFireantBtn = document.getElementById("importFireantBtn");
  const clearFireantBtn = document.getElementById("clearFireantBtn");
  const getFireantBtn = document.getElementById("getFireantBtn");
  const getVndBtn = document.getElementById("getVndBtn");
  const importVndBtn = document.getElementById("importVndBtn");
  const clearVndBtn = document.getElementById("clearVndBtn");

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
  // ==============================
  // 📥 GET FIREANT DATA
  // ==============================
  getFireantBtn.addEventListener("click", async () => {
    setButtonInProcessing(getFireantBtn);

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(
      tabId,
      { type: "GET_STOCK_LIST_FIREANT" },
      (res) => {
        if (!res?.symbols?.length) {
          stockListText.value = [];
          chrome.storage.local.set({ stockList: [] });
          return;
        }

        const text = res.symbols.join(",");
        stockListText.value = text;

        chrome.storage.local.set({ stockList: text });
      }
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

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (!res?.symbols?.length) return;

      const text = res.symbols.join(",");
      stockListText.value = text;

      chrome.storage.local.set({ stockList: text });
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

      default:
        break;
    }
  });
});
