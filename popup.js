document.addEventListener("DOMContentLoaded", () => {
  const stockListText = document.getElementById("stockListText");
  const importFireantBtn = document.getElementById("importFireantBtn");
  const getVndBtn = document.getElementById("getVndBtn");

  // ==============================
  // 🔁 AUTO LOAD SAVED DATA
  // ==============================
  chrome.storage.local.get(["stockList"], ({ stockList }) => {
    if (stockList) stockListText.value = stockList;
  });

  // ==============================
  // 🔧 Utils
  // ==============================
  async function getTabId() {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });

    return tab.id;
  }

  function setButtonInNormal(btn, text = "Button") {
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
    // Disable button
    setButtonInProcessing(importFireantBtn);

    const words = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!words.length) {
      setButtonInNormal(importFireantBtn, "Import Fireant");
      return;
    }

    const tabId = await getTabId();

    chrome.tabs.sendMessage(tabId, {
      type: "IMPORT_TO_FIREANT",
      words,
      delay: 200,
    });
  });

  // Listen for completion message
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "IMPORT_FIREANT_DONE") {
      setButtonInNormal(importFireantBtn, "Import Fireant");
    }
    if (message.type === "GET_VNDIRECT_DONE") {
      setButtonInNormal(getVndBtn, "Get Vndirect Data");
    }
  });

  // ==============================
  // 📥 GET VNDIRECT DATA
  // ==============================
  getVndBtn.addEventListener("click", async () => {
     // Disable button
    setButtonInProcessing(getVndBtn);

    const tabId = await getTabId();

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (!res?.symbols?.length) return;

      const text = res.symbols.join(",");
      stockListText.value = text;

      chrome.storage.local.set({ stockList: text });
    });
  });
});
