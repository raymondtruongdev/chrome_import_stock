let isRunning = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForLoadingFireAntMenu(timeout = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const timer = setInterval(() => {
      const menu = document.querySelector("ul.bp5-menu");

      if (menu) {
        const items = menu.querySelectorAll('a[role="menuitem"]');
        if (items.length > 0) {
          clearInterval(timer);
          resolve(items);
        }
      }

      if (Date.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error("Menu timeout"));
      }
    }, 50);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ====================================
  // ▶ START IMPORT TO FIREANT STOCK LIST
  // ====================================
  if (message.type === "IMPORT_TO_FIREANT") {
    if (isRunning) {
      return;
    }

    isRunning = true;
    const { words, delay } = message;

    const inputSelector = 'input[placeholder="Thêm mã CK vào watchlist..."]';

    const addBtn = [...document.querySelectorAll("button")].find(
      (btn) => btn.textContent.trim() === "Thêm mã CK"
    );

    (async () => {

      if (addBtn) {
        addBtn.click();
        await sleep(100);
      }

      for (const word of words) {
        const input = document.querySelector(inputSelector);
        if (!input) {
          console.error("[AUTO] Input not found");
          break;
        }

        input.focus();
        input.value = word;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));

        try {
          // Wait for talbe item list then click 1st item
          const items = await waitForLoadingFireAntMenu();
          items[0].click();
          console.log("[AUTO] Menu found, items:", items.length);
          console.log("[AUTO] First item text:", items[0].innerText.trim());

        } catch {
          console.warn("[AUTO] Menu not found");
        }

       // ⏳ Wait while page processes word
        await sleep(delay);
      }

      isRunning = false;
    })();
  }

  // ========================================
  // 📥 GET STOCK LIST FROM VNDIRECT WEB PAGE
  // ========================================
  if (message.type === "GET_STOCK_LIST_VND") {
    const tbody = document.getElementById("banggia-khop-lenh-body");
    if (!tbody) {
      console.warn("[CONTENT] Table not found");
      sendResponse({ symbols: [] });
      return true;
    }

    const symbols = [...tbody.querySelectorAll("tr")]
      .map((tr) => tr.id)
      .filter(Boolean);

    console.log("[CONTENT] Symbols:", symbols);
    sendResponse({ symbols });
    return true; 
  }
});
