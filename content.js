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

  async function addSymbolFireant(symbols) {
    const delay = 200;
    console.log("[CONTENT] Symbols will be deleted:", symbols);

    const inputSelector = 'input[placeholder="Thêm mã CK vào watchlist..."]';

    const addBtn = [...document.querySelectorAll("button")].find(
      (btn) => btn.textContent.trim() === "Thêm mã CK"
    );

    if (addBtn) {
      addBtn.click();
      await sleep(100);
    }

    for (const word of symbols) {
      const input = document.querySelector(inputSelector);
      if (!input) {
        console.warn("[CONTENT] Fireant table input not found");
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
  }

  async function addSymbolVndirect(symbols) {
    console.log("[CONTENT] Symbols will be added:", symbols);
    const input = document.querySelector(
      'input.react-autosuggest__input[placeholder="Nhập mã CK..."]'
    );

    const addBtn = document
      .querySelector('button.button[type="submit"] i.fa-plus')
      ?.closest("button");

    for (const word of symbols) {
      if (!input) {
        console.warn("[CONTENT] Vndirect table input not found");
        break;
      }

      input.focus();
      input.value = word;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      console.log("[AUTO] Added:", word);

      if (addBtn) {
        await sleep(100);
        addBtn.click();

        input.value = "";
      }
    }
  }

  // ==================
  // Message Listener
  // ==================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ========================================
    // 📥 GET STOCK LIST FROM FIREANT
    // ========================================
    if (message.type === "GET_STOCK_LIST_FIREANT") {
      // const symbols = Array.from(
      //   document.querySelectorAll('a[href^="/charts/content/symbols/"]'),
      //   (a) => a.textContent.trim()
      // );
      const symbols = [...document.querySelectorAll("div.sc-eLoUSf.iTbAOj")]
        .map((div) => {
          const a = div.querySelector('a[href^="/charts/content/symbols/"]');
          return a ? a.textContent.trim() : null;
        })
        .filter(Boolean);

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
      const { symbols } = message;

      (async () => {
        await addSymbolFireant(symbols);

        chrome.runtime.sendMessage({
          type: "IMPORT_FIREANT_DONE",
        });
      })();

      return true;
    }

    // ====================================
    // ▶ CLEAR FIREANT
    // ====================================
    if (message.type === "CLEAR_FIREANT") {
      const symbols = [...document.querySelectorAll("div.sc-eLoUSf.iTbAOj")]
        .map((div) => {
          const a = div.querySelector('a[href^="/charts/content/symbols/"]');
          return a ? a.textContent.trim() : null;
        })
        .filter(Boolean);
        
      (async () => {
        if (symbols?.length) {
          await addSymbolFireant(symbols);
        }
        chrome.runtime.sendMessage({
          type: "CLEAR_FIREANT_DONE",
        });
      })();

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
      const { symbols } = message;

      (async () => {
        await addSymbolVndirect(symbols);

        chrome.runtime.sendMessage({
          type: "IMPORT_VNDIRECT_DONE",
        });
      })();

      return true;
    }

    // ====================================
    // ▶ CLEAR VNDIRECT
    // ====================================
    if (message.type === "CLEAR_VNDIRECT") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      if (!tbody) {
        console.warn("[CONTENT] Vndirect Table body not found");
        // notify background AFTER done
        chrome.runtime.sendMessage({
          type: "CLEAR_VNDIRECT_DONE",
        });
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
            console.log("[CONTENT] Removed:", symbol);
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
