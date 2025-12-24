// ==========================
// 🛡 Prevent duplicate setup
// ==========================
if (window.__CONTENT_SCRIPT_LOADED__) {
  console.warn("[CONTENT] Script already loaded, skipping");
} else {
  window.__CONTENT_SCRIPT_LOADED__ = true;

  console.log("[CONTENT] Script loaded once");

  // ==================
  // Utils
  // ==================
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

  // ==================
  // Message Listener
  // ==================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ====================================
    // ▶ IMPORT TO FIREANT
    // ====================================
    if (message.type === "IMPORT_TO_FIREANT") {
      const { words, delay } = message;

      (async () => {
        const inputSelector =
          'input[placeholder="Thêm mã CK vào watchlist..."]';

        const addBtn = [...document.querySelectorAll("button")].find(
          (btn) => btn.textContent.trim() === "Thêm mã CK"
        );

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
            const items = await waitForLoadingFireAntMenu();
            items[0].click();
            console.log("[AUTO] Added:", word);
          } catch {
            console.warn("[AUTO] Menu not found:", word);
          }

          await sleep(delay);
        }

        chrome.runtime.sendMessage({
          type: "IMPORT_FIREANT_DONE",
        });
      })();

      return true;
    }

    // ========================================
    // 📥 GET STOCK LIST FROM VNDIRECT
    // ========================================
    if (message.type === "GET_STOCK_LIST_VND") {
      const tbody = document.getElementById("banggia-khop-lenh-body");

      const symbols = tbody
        ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean)
        : [];

      console.log("[CONTENT] Symbols:", symbols);

      sendResponse({ symbols });

      chrome.runtime.sendMessage({
        type: "GET_VNDIRECT_DONE",
      });

      return true;
    }
  });
}
