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

  function addSymbolFireant(words) {
    const delay = 200;
    (async () => {
      console.log("[CONTENT] Symbols will be deleted:", words);

      const inputSelector = 'input[placeholder="Thêm mã CK vào watchlist..."]';

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
    })();
  }

  function addSymbolVndirect(words) {
    (async () => {
      console.log("[CONTENT] Symbols will be added:", words);
      const input = document.querySelector(
        'input.react-autosuggest__input[placeholder="Nhập mã CK..."]'
      );

      const addBtn = document
        .querySelector('button.button[type="submit"] i.fa-plus')
        ?.closest("button");

      for (const word of words) {
        if (!input) {
          console.error("[AUTO] Input not found");
          break;
        }

        input.focus();
        input.value = word;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        console.log("[AUTO] Added:", word);

        if (addBtn) {
          addBtn.click();
          await sleep(50);
          input.value = "";
        }
      }
    })();
  }

  // ==================
  // Message Listener
  // ==================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ========================================
    // 📥 GET STOCK LIST FROM FIREANT
    // ========================================
    if (message.type === "GET_STOCK_LIST_FIREANT") {
      // Get list symbol in current webpage, need remove 1st element because it is a
      // symbol of current chart maybe not in the list
      const symbols = Array.from(
        document.querySelectorAll('a[href^="/charts/content/symbols/"]'),
        (a) => a.textContent.trim()
      );

      console.log("[CONTENT] Symbols:", symbols);

      sendResponse({ symbols });

      chrome.runtime.sendMessage({
        type: "GET_FIREANT_DONE",
      });

      return true;
    }
    // ====================================
    // ▶ IMPORT TO FIREANT
    // ====================================
    if (message.type === "IMPORT_TO_FIREANT") {
      const { words } = message;

      addSymbolFireant(words);

      chrome.runtime.sendMessage({
        type: "IMPORT_FIREANT_DONE",
      });

      return true;
    }

    // ====================================
    // ▶ CLEAR FIREANT
    // ====================================
    if (message.type === "CLEAR_FIREANT") {
      const symbols = Array.from(
        document.querySelectorAll('a[href^="/charts/content/symbols/"]'),
        (a) => a.textContent.trim()
      );

      if (symbols?.length) {
        addSymbolFireant(symbols);
      }

      chrome.runtime.sendMessage({
        type: "CLEAR_FIREANT_DONE",
      });

      return true; // keep message channel alive
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

    // ====================================
    // ▶ IMPORT TO VNDIRECT
    // ====================================
    if (message.type === "IMPORT_TO_VNDIRECT") {
      const { words } = message;

      addSymbolVndirect(words);

      chrome.runtime.sendMessage({
        type: "IMPORT_VNDIRECT_DONE",
      });

      return true;
    }

    // ====================================
    // ▶ CLEAR VNDIRECT
    // ====================================
    if (message.type === "CLEAR_VNDIRECT") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      if (!tbody) {
        console.warn("[EXT] Table body not found");
        return;
      }

      const symbols = tbody
        ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean)
        : [];

      console.log("[CONTENT] Symbols:", symbols);

      // async remove one-by-one
      (async () => {
        for (const symbol of symbols) {
          if (typeof window.removeSymbolFromBoard === "function") {
            window.removeSymbolFromBoard(symbol);
            console.log("[EXT] Removed:", symbol);
          } else {
            // fallback: click
            tbody.querySelector(`tr#${CSS.escape(symbol)} a.remove`)?.click();
          }

          // wait DOM update
          await new Promise((r) => setTimeout(r, 100));
        }

        // notify background AFTER done
        chrome.runtime.sendMessage({
          type: "CLEAR_VNDIRECT_DONE",
        });
      })();
      return true; // keep message channel alive
    }
  });
}
