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
  // 🔧 HELPER: get active tab + inject
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

  // ==============================
  // ▶ IMPORT SYMBOLS TO FIREANT
  // ==============================
  importFireantBtn.addEventListener("click", async () => {
    const words = stockListText.value
      .split(",")
      .map((w) => w.trim())
      .filter(Boolean);

    if (!words.length) return;

    const tabId = await getTabId();

    chrome.tabs.sendMessage(tabId, {
      type: "IMPORT_TO_FIREANT",
      words,
      delay: 200,
    });
  });

  // ==============================
  // 📥 GET VNDIRECT DATA
  // ==============================
  getVndBtn.addEventListener("click", async () => {
    getVndBtn.ariaDisabled = true;
    const tabId = await getTabId();

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (!res?.symbols?.length) return;

      const text = res.symbols.join(",");
      stockListText.value = text;

      chrome.storage.local.set({ stockList: text });
    });
  });
});
