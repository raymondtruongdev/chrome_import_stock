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

  function showCopiedToast(
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

  // ==============================
  //  CLEAR TEXTBOX CONTENT
  // ==============================
  clearTextboxBtn.addEventListener("click", async () => {
    // Clear UI
    stockListText.value = "";
    chrome.storage.local.set({ stockList: "" });
  });

  // ==============================
  // COPY TEXTBOX TO CLIPBOARD
  // ==============================
  copyTextboxBtn.addEventListener("click", async () => {
    const text = stockListText.value;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    showCopiedToast(null, "Copied to clipboard", "corner");
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
        }
        stockListText.value = text;
        chrome.storage.local.set({ stockList: text });
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
      }
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

      // Auto copy to CLIPBOARD
      await copyToClipboard(res.tsv);

      // Show TOAST 2s
      showCopiedToast(getVPSListBtn, "Copied to clipboard", "button");

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

      // Show in Textbox
      stockListText.value = res.tsv;

      // Auto copy to CLIPBOARD
      await copyToClipboard(res.tsv);

      // Show TOAST 2s
      showCopiedToast(getVndListBtn, "Copied to clipboard", "button");
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
});
