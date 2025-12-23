document.addEventListener("DOMContentLoaded", () => {
  const textInput = document.getElementById("textInput");
  const importBtn = document.getElementById("importFireAntBtn");
  const getVNDBtn = document.getElementById("getVNDBtn");

  // ==============================
  // 🔁 AUTO LOAD SAVED DATA
  // ==============================
  chrome.storage.local.get(["stockList"], ({ stockList }) => {
    if (stockList) textInput.value = stockList;
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
  importBtn.addEventListener("click", async () => {
    const words = textInput.value
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
  // 📥 GET VNDirect DATA
  // ==============================
  getVNDBtn.addEventListener("click", async () => {
    const tabId = await getTabId();

    chrome.tabs.sendMessage(tabId, { type: "GET_STOCK_LIST_VND" }, (res) => {
      if (!res?.symbols?.length) return;

      const text = res.symbols.join(",");
      textInput.value = text;

      chrome.storage.local.set({ stockList: text });
    });
  });
});
