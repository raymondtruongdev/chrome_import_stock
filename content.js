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

  const normalizeText = (text = "") =>
    text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  // ==================
  // FireAnt helpers
  // ==================
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
    const inputSelector = 'input[placeholder="Thêm mã CK vào watchlist..."]';

    const addBtn = [...document.querySelectorAll("button")].find(
      (btn) => btn.textContent.trim() === "Thêm mã CK",
    );

    addBtn?.click();
    await sleep(100);

    for (const symbol of symbols) {
      const input = document.querySelector(inputSelector);
      if (!input) break;

      input.focus();
      input.value = symbol;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      try {
        const items = await waitForLoadingFireAntMenu();
        items[0].click();
        console.log("[AUTO] Added:", symbol);
      } catch {
        console.warn("[AUTO] Menu not found:", symbol);
      }

      await sleep(delay);
    }
  }

  async function addSymbolVndirect(symbols) {
    const input = document.querySelector(
      'input.react-autosuggest__input[placeholder="Nhập mã CK..."]',
    );

    const addBtn = document
      .querySelector('button.button[type="submit"] i.fa-plus')
      ?.closest("button");

    for (const symbol of symbols) {
      if (!input) break;

      input.focus();
      input.value = symbol;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));

      addBtn?.click();
      input.value = "";

      console.log("[AUTO] Added:", symbol);
      await sleep(100);
    }
  }

  // ==================
  // Message Listener
  // ==================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ========= FIREANT =========
    if (message.type === "GET_STOCK_LIST_FIREANT") {
      const symbols = [...document.querySelectorAll("div.sc-eLoUSf.iTbAOj")]
        .map((div) => div.querySelector("a")?.textContent.trim())
        .filter((text) => text && text.length === 3);

      if (symbols.length === 0) {
        sendResponse({ error: "[CONTENT] FireAnt symbols not found" });
        return;
      }
      sendResponse({ symbols });
      return true;
    }

    if (message.type === "IMPORT_TO_FIREANT") {
      addSymbolFireant(message.symbols).then(() =>
        chrome.runtime.sendMessage({ type: "IMPORT_FIREANT_DONE" }),
      );
      return true;
    }

    if (message.type === "CLEAR_FIREANT") {
      const symbols = [...document.querySelectorAll("div.sc-eLoUSf.iTbAOj")]
        .map((div) => div.querySelector("a")?.textContent.trim())
        .filter((text) => text && text.length === 3);

      if (symbols.length === 0) {
        sendResponse({ error: "[CONTENT] FireAnt symbols not found" });
        return;
      }
      addSymbolFireant(symbols).then(() => sendResponse({ success: true }));
      return true;
    }

    // ========= VNDIRECT =========
    if (message.type === "GET_STOCK_LIST_VND") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      const symbols = tbody
        ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean)
        : [];
      sendResponse({ symbols });
      return true;
    }

    if (message.type === "IMPORT_TO_VNDIRECT") {
      addSymbolVndirect(message.symbols).then(() =>
        chrome.runtime.sendMessage({ type: "IMPORT_VNDIRECT_DONE" }),
      );
      return true;
    }

    // ====================================
    // ▶ CLEAR VNDIRECT
    // ====================================
    if (message.type === "CLEAR_VNDIRECT") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      if (!tbody) {
        sendResponse({ error: "[CONTENT] Vndirect Table body not found" });
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
        sendResponse({ success: true });
      })();
      return true; // keep message channel alive
    }

    // ========= VPS =========
    if (message.type === "GET_VPS_LIST") {
      const table =
        document.querySelector('table[data-testid="portfolio-table-table"]') ||
        document.querySelector(".vps-portfolio-table table") ||
        document.querySelector("table.portfolio-table");

      if (!table) {
        sendResponse({ error: "VPS Portfolio table not found" });
        return true;
      }

      const headers = [...table.querySelectorAll("thead th")]
        .map((th) => {
          const clone = th.cloneNode(true);
          clone.querySelectorAll("i, span").forEach((el) => el.remove());
          return normalizeText(clone.textContent || clone.innerText);
        })
        .filter(Boolean);

      const body =
        table.querySelector('tbody[data-testid="portfolio-table-body"]') ||
        table.querySelector("tbody");

      const rows = body
        ? [...body.querySelectorAll("tr")].map((tr) =>
            [...tr.querySelectorAll("td")].map((td) =>
              normalizeText(td.textContent || td.innerText),
            ),
          )
        : [];
      // The first row VPS retunrs is Total row, we can ignore it if it's the only row
      if (body == null || rows.length === 1) {
        sendResponse({ error: "VPS Portfolio table body not found or empty" });
        return true;
      }
      sendResponse({ success: true, headers, rows });

      return true;
    }

    // ========= VND =========
    if (message.type === "GET_VND_LIST") {
      // Thử tìm bảng với nhiều selector khác nhau của VNDirect
      const table =
        document.querySelector("table.portfolio-data") ||
        document.querySelector("table.table-statement") ||
        document.querySelector(".portfolio-table table");

      if (!table) {
        sendResponse({ error: "VND Portfolio table not found" });
        return true;
      }

      const headers = [...table.querySelectorAll("thead th")]
        .map((th) => {
          const clone = th.cloneNode(true);
          clone.querySelectorAll("i, span").forEach((el) => el.remove());
          return normalizeText(clone.textContent || clone.innerText);
        })
        .filter(Boolean);

      const body = table.querySelector("tbody");
      const rows = body
        ? [...body.querySelectorAll("tr")].map((tr) =>
            [...tr.querySelectorAll("td")].map((td) =>
              normalizeText(td.textContent || td.innerText),
            ),
          )
        : [];

      if (body == null || rows.length === 0) {
        sendResponse({ error: "VND Portfolio table body not found or empty" });
        return true;
      }
      sendResponse({ success: true, headers, rows });

      return true;
    }
    // ========= AUTO FIND SSI TOKEN =========
    if (message.type === "AUTO_FIND_SSI_TOKEN") {
      // SSI token is stored in localStorage of ssi website, we can read it directly
      try {
        const ssi_token = localStorage.getItem("token");
        const ssi_device_id = localStorage.getItem("deviceId");
        const ssi_account = localStorage.getItem("ssiChatbotUserId");
        sendResponse({ success: true, ssi_token, ssi_device_id, ssi_account });
      } catch (err) {
        sendResponse({ error: "CANNOT FIND SSI TOKEN: " + err.message });
      }
    }
  });
}
