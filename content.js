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

  const normalizeText = (text = "") => text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

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

    const addBtn = [...document.querySelectorAll("button")].find((btn) => btn.textContent.trim() === "Thêm mã CK");

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
    const input = document.querySelector('input.react-autosuggest__input[placeholder="Nhập mã CK..."]');

    const addBtn = document.querySelector('button.button[type="submit"] i.fa-plus')?.closest("button");

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

  async function addChartStyle(symbol, sendResponse) {
    let iframe = null;
    // Do Chart được nhúng dưới dạng iframe, nên chúng ta cần tìm đúng iframe chứa chart của VNDirect để thao tác
    const iframes = document.querySelectorAll("iframe");
    for (const ifr of iframes) {
      if (ifr.name?.startsWith("tradingview") || ifr.src?.includes("dchart.vndirect.com.vn")) {
        iframe = ifr;
        break;
      }
    }
    if (!iframe) {
      sendResponse({ error: "Không tìm thấy TradingView iframe" });
      return;
    }
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      sendResponse({ error: "Không truy cập được iframe document" });
      return;
    }
    // Tìm và điền mã mới vào input search trong popup sau đó chọn kết quả đầu tiên
    const input = iframeDoc.querySelector('input[data-role="search"]');
    if (!input) {
      sendResponse({ error: "Không tìm thấy search input" });
      return;
    }
    input.focus();
    input.value = "VCK"; //symbol;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(500);
    // chọn suggestion đầu tiên
    const first = iframeDoc.querySelector('[data-role="list-item"]');
    if (first) {
      first.click();
    }
    await sleep(1000);
  }

  async function addSymbolChartVndirect_v2_notrun(symbols, sendResponse) {
    // B1: Đăng nhập VND
    // B2: Mở trang: https://dchart.vndirect.com.vn/?symbol=DCM&domain=https%3A%2F%2Ftrade.vndirect.com.vn&timeframe=D&language=vi&theme=dark&disablesyncsymbol=true&&indicator=&ignoreIndicator=ma,ema,macd,rsi,boll&autosave=true
    // B3: Load chart xong mới bấm nút

    const rows = document.querySelectorAll("#banggia-khop-lenh-body tr");

    for (const row of rows) {
      // Click vào mã để mở chart
      const symbolOpenChart = row.querySelector("td:first-child a.symbol");
      const symbol = row?.id;
      if (!symbolOpenChart) continue;
      symbolOpenChart.click();
      await sleep(1000);

      addChartStyle(symbol, sendResponse);

      // Close chart by clicking outside the chart area
      const x = 50;
      const y = window.innerHeight - 50;
      const el = document.elementFromPoint(x, y);
      el?.click();
      await sleep(1000);
    }
    return;
  }

  async function addSymbolChartVndirect(symbols, sendResponse) {
    // B1: Đăng nhập VND
    // B2: Mở trang: https://dchart.vndirect.com.vn/?symbol=DCM&domain=https%3A%2F%2Ftrade.vndirect.com.vn&timeframe=D&language=vi&theme=dark&disablesyncsymbol=true&&indicator=&ignoreIndicator=ma,ema,macd,rsi,boll&autosave=true
    // B3: Load chart xong mới bấm nút

    let iframe = null;
    // Do Chart được nhúng dưới dạng iframe, nên chúng ta cần tìm đúng iframe chứa chart của VNDirect để thao tác
    const iframes = document.querySelectorAll("iframe");
    for (const ifr of iframes) {
      if (ifr.name?.startsWith("tradingview") || ifr.src?.includes("dchart.vndirect.com.vn")) {
        iframe = ifr;
        break;
      }
    }
    if (!iframe) {
      sendResponse({ error: "Không tìm thấy TradingView iframe" });
      return;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) {
      sendResponse({ error: "Không truy cập được iframe document" });
      return;
    }

    // button mở search
    const symbolBtn = iframeDoc.querySelector('[data-tooltip="Tìm kiếm Mã giao dịch"]');

    if (!symbolBtn) {
      sendResponse({ error: "Không tìm thấy nút tìm kiếm symbol" });
      return;
    }

    for (const symbol of symbols) {
      // mở search popup
      symbolBtn.click();

      await sleep(200);

      // Tìm và điền mã mới vào input search trong popup sau đó chọn kết quả đầu tiên
      const input = iframeDoc.querySelector('input[data-role="search"]');

      if (!input) {
        sendResponse({ error: "Không tìm thấy search input" });
        return;
      }

      input.focus();
      input.value = symbol;
      input.dispatchEvent(new Event("input", { bubbles: true }));

      await sleep(500);

      // chọn suggestion đầu tiên
      const first = iframeDoc.querySelector('[data-role="list-item"]');

      if (first) {
        first.click();
      }

      await sleep(1000); // chờ chart load
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
      addSymbolFireant(message.symbols).then(() => chrome.runtime.sendMessage({ type: "IMPORT_FIREANT_DONE" }));
      return true;
    }

    if (message.type === "CLEAR_FIREANT") {
      // const symbols = [...document.querySelectorAll("sc-kkZjDP iXDapN list-striped-row-even bp5-context-menu")]
      const symbols = [...document.querySelectorAll("div.bp5-context-menu")]
        .map((div) => div.querySelector("a")?.textContent.trim())
        .filter((text) => text && text.length === 3);

      if (symbols.length === 0) {
        sendResponse({ error: "[CONTENT] FireAnt symbols not found" });
        return;
      }
      // Trong file Ant add sẽ toogle việc thêm/xóa một symbol
      addSymbolFireant(symbols).then(() => sendResponse({ success: true }));
      return true;
    }

    // ========= VNDIRECT =========
    if (message.type === "GET_STOCK_LIST_VND") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      const symbols = tbody ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean) : [];
      sendResponse({ symbols });
      return true;
    }

    if (message.type === "IMPORT_TO_VNDIRECT") {
      addSymbolVndirect(message.symbols).then(() => chrome.runtime.sendMessage({ type: "IMPORT_VNDIRECT_DONE" }));
      return true;
    }

    if (message.type === "ADD_SYMBOLS_TO_VND_CHART") {
      addSymbolChartVndirect(message.symbols, sendResponse).then(() =>
        chrome.runtime.sendMessage({ type: "ADD_SYMBOLS_TO_VND_CHART_DONE" }),
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

      const symbols = tbody ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean) : [];

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

    // ====================================
    // ▶ IMPORT LIST VPS
    // ====================================
    // async function addSymbolVPS(symbols) {
    //   const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    //   for (const symbol of symbols) {
    //     const input = document.querySelector('input[name="search"]');

    //     if (!input) {
    //       console.log("[AUTO] Không tìm thấy input");
    //       return;
    //     }

    //     // ===== 1. Reset + focus =====
    //     input.focus();
    //     input.value = "";
    //     input.dispatchEvent(new Event("input", { bubbles: true }));

    //     // ===== 2. Gõ từng ký tự (simulate user typing) =====
    //     for (const char of symbol) {
    //       input.value += char;

    //       input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
    //       input.dispatchEvent(new Event("input", { bubbles: true }));
    //       input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));

    //       await sleep(120); // chỉnh nếu cần
    //     }

    //     console.log("[AUTO] Typed:", symbol);

    //     // ===== 3. Đợi listbox xuất hiện =====
    //     let firstItem = null;
    //     const start = Date.now();

    //     while (Date.now() - start < 2000) {
    //       firstItem = document.querySelector('[role="listbox"] [role="option"]');
    //       if (firstItem) break;
    //       await sleep(100);
    //     }

    //     // ===== 4. Chọn item đầu tiên =====
    //     if (firstItem) {
    //       // cách 1: click
    //       firstItem.click();

    //       // cách 2 (ổn định hơn nếu click fail):
    //       // input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    //       // input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    //       console.log("[AUTO] Selected:", symbol);
    //     } else {
    //       console.log("[AUTO] Không thấy kết quả:", symbol);
    //     }

    //     // ===== 5. Delay giữa các lần =====
    //     await sleep(500);
    //   }
    // }
    async function addSymbolVPS(symbols) {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;

      for (const symbol of symbols) {
        const input = document.querySelector('input[name="search"]');

        if (!input) {
          console.log("[AUTO] Không tìm thấy input");
          return;
        }

        // ===== 1. Focus =====
        input.focus();

        // ===== 2. Clear input bằng native setter =====
        nativeSetter.call(input, "");
        input.dispatchEvent(new Event("input", { bubbles: true }));

        // ===== 3. Gõ từng ký tự (REAL typing) =====
        for (const char of symbol) {
          // set value qua native setter
          nativeSetter.call(input, input.value + char);

          // fire event đúng thứ tự
          input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));

          await sleep(150);
        }

        console.log("[AUTO] Typed:", symbol);

        // ===== 4. Đợi listbox =====
        let firstItem = null;
        const start = Date.now();

        while (Date.now() - start < 3000) {
          firstItem = document.querySelector('[role="listbox"] [role="option"]');
          if (firstItem) break;
          await sleep(100);
        }

        // ===== 5. Select =====
        if (firstItem) {
          // Cách 1: click
          firstItem.click();

          // Cách 2 (backup giống user hơn):
          // input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
          // input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

          console.log("[AUTO] Selected:", symbol);
        } else {
          console.log("[AUTO] Không thấy listbox:", symbol);
        }

        await sleep(500);
      }
    }

    if (message.type === "IMPORT_TO_VPS") {
      addSymbolVPS(message.symbols).then(() => chrome.runtime.sendMessage({ type: "IMPORT_VPS_DONE" }));
      return true;
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

      const body = table.querySelector('tbody[data-testid="portfolio-table-body"]') || table.querySelector("tbody");

      const rows = body
        ? [...body.querySelectorAll("tr")].map((tr) =>
            [...tr.querySelectorAll("td")].map((td) => normalizeText(td.textContent || td.innerText)),
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
            [...tr.querySelectorAll("td")].map((td) => normalizeText(td.textContent || td.innerText)),
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
