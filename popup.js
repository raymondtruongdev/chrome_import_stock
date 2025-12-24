document.addEventListener("DOMContentLoaded", async () => {
  const stockListText = document.getElementById("stockListText");
  const importFireantBtn = document.getElementById("importFireantBtn");
  const clearFireantBtn = document.getElementById("clearFireantBtn");
  const getVndBtn = document.getElementById("getVndBtn");
  const getFireantBtn = document.getElementById("getFireantBtn");

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
  // ▶ IMPORT SYMBOLS TO FIREANT
  // ==============================
  importFireantBtn.addEventListener("click", async () => {
    setButtonInProcessing(importFireantBtn);

    const words = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!words.length) {
      setButtonInNormal(importFireantBtn, "Import Fireant");
      return;
    }

    const tabId = await initActiveTab();

    chrome.tabs.sendMessage(tabId, {
      type: "IMPORT_TO_FIREANT",
      words,
    });
  });

  // ==============================
  // ▶ CLEAR  FIREANT SYMBOLS
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
  // 🔔 Listen for completion
  // ==============================

  chrome.runtime.onMessage.addListener((message) => {
    switch (message.type) {
      case "IMPORT_FIREANT_DONE":
        setButtonInNormal(importFireantBtn, "Import Fireant");
        break;

      case "GET_VNDIRECT_DONE":
        setButtonInNormal(getVndBtn, "Get Vndirect");
        break;

      case "GET_FIREANT_DONE":
        setButtonInNormal(getFireantBtn, "Get Fireant");
        break;

      case "CLEAR_FIREANT_DONE":
        setButtonInNormal(clearFireantBtn, "Clear Fireant");
        break;

      default:
        break;
    }
  });
});
