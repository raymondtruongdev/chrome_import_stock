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
      (btn) => btn.textContent.trim() === "Thêm mã CK",
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
      'input.react-autosuggest__input[placeholder="Nhập mã CK..."]',
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

  const normalizeText = (text = "") =>
    text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

  const buildTSV = (headers, rows) =>
    [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");

  const respondEmpty = (sendResponse) => {
    sendResponse({ tsv: "", headers: [], rows: [] });
  };

  function parseTable({
    tableSelector,
    bodySelector = "tbody",
    headerCleaner,
  }) {
    const table = document.querySelector(tableSelector);
    if (!table) return null;

    // Headers
    const headers = [...table.querySelectorAll("thead th")]
      .map((th) => {
        if (headerCleaner) {
          const clone = th.cloneNode(true);
          headerCleaner(clone);
          return normalizeText(clone.textContent);
        }
        return normalizeText(th.innerText);
      })
      .filter(Boolean);

    // Rows
    const body = table.querySelector(bodySelector);
    const rows = body
      ? [...body.querySelectorAll("tr")].map((tr) =>
          [...tr.querySelectorAll("td")].map((td) =>
            normalizeText(td.innerText || td.textContent),
          ),
        )
      : [];

    return { headers, rows };
  }

  /**
   * Map / reorder / rename columns from a parsed HTML table
   *
   * Purpose:
   * - Pick only required columns from the original table
   * - Reorder columns based on configuration
   * - Rename headers for output (e.g. "Giá vốn" → "Giá TB")
   *
   * Typical usage:
   *   const parsed = parseTable(...)
   *   const mapped = mapTableColumns({ outputColumns, ...parsed })
   *
   * @param {Object} params
   * @param {Array<{ key: string, label: string }>} params.outputColumns
   *        - key   : original header name in the table
   *        - label : output header name
   * @param {string[]} params.headers
   *        - original table headers (from parseTable)
   * @param {string[][]} params.rows
   *        - original table rows (from parseTable)
   *
   * @returns {{ headers: string[], rows: string[][] }}
   *          - headers: mapped headers (renamed & reordered)
   *          - rows   : mapped rows (picked & reordered columns)
   */
  function mapTableColumns({ outputColumns, headers, rows }) {
    if (!headers?.length || !rows?.length) {
      return { headers: [], rows: [] };
    }

    // Normalize header text for reliable matching
    function normalizeHeader(text = "") {
      return normalizeText(text).toLowerCase();
    }

    // Find column index by matching normalized header (flexible match)
    function findHeaderIndex(headers, key) {
      const normalizedKey = normalizeHeader(key);
      return headers.findIndex((h) =>
        normalizeHeader(h).includes(normalizedKey),
      );
    }

    // Build output headers (renamed & reordered)
    const mappedHeaders = outputColumns.map((c) => c.label);

    // Build output rows (picked, reordered, transformed)
    const mappedRows = rows.map((row) =>
      outputColumns.map((c) => {
        const idx = findHeaderIndex(headers, c.key);
        if (idx === -1) return "";

        const rawValue = row[idx] ?? "";

        // Apply transform if provided
        return typeof c.transform === "function"
          ? c.transform(rawValue)
          : rawValue;
      }),
    );

    return {
      headers: mappedHeaders,
      rows: mappedRows,
    };
  }

  function divideBy1000(value) {
  if (!value) return "";

  const num = Number(
    value
      .replace(/,/g, "")
      .replace(/\s/g, ""),
  );

  if (Number.isNaN(num)) return value;

  return num / 1000;
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

    // ====================================
    // GET VPS LIST
    // ====================================

    if (message.type === "GET_VPS_LIST") {
      const result = parseTable({
        tableSelector: 'table[data-testid="portfolio-table-table"]',
        bodySelector: 'tbody[data-testid="portfolio-table-body"]',
      });

      if (!result) {
        console.warn("[CONTENT] VPS portfolio table not found");
        respondEmpty(sendResponse);
        return true;
      }

      const OUTPUT_COLUMNS = [
        { key: "Mã CK", label: "Mã" },
        { key: "Tổng", label: "KL" },
        { key: "Có thể bán", label: "GD" },
        { key: "Giá TB", label: "Giá TB " },
        { key: "Giá TT", label: "Giá hiện tại" }, // đổi tênz
      ];

      const mapped = mapTableColumns({
        outputColumns: OUTPUT_COLUMNS,
        headers: result.headers,
        rows: result.rows,
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);
      console.log("[CONTENT] VPS TSV generated\n", tsv);

      sendResponse({
        headers: mapped.headers,
        rows: mapped.rows,
        tsv,
      });

      chrome.runtime.sendMessage({ type: "GET_VPS_LIST_DONE" });
      return true;
    }
    // ====================================
    // GET VND LIST
    // ====================================

    if (message.type === "GET_VND_LIST") {
      const result = parseTable({
        tableSelector: "table.portfolio-data",
        headerCleaner: (clone) => {
          clone.querySelectorAll("i, span").forEach((el) => el.remove());
        },
      });

      if (!result) {
        console.warn("[CONTENT] VND portfolio table not found");
        respondEmpty(sendResponse);
        return true;
      }

      const OUTPUT_COLUMNS = [
        { key: "Mã", label: "Mã" },
        { key: "KL", label: "KL" },
        { key: "GD", label: "GD" },
        {
          key: "Giá vốn",
          label: "Giá TB", // đổi tên
          transform: divideBy1000,
        },
        {
          key: "Giá hiện tại",
          label: "Giá hiện tại",
          transform: divideBy1000,
        },
      ];

      const mapped = mapTableColumns({
        outputColumns: OUTPUT_COLUMNS,
        headers: result.headers,
        rows: result.rows,
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);
      console.log("[CONTENT] VND TSV generated\n", tsv);

      sendResponse({
        headers: mapped.headers,
        rows: mapped.rows,
        tsv,
      });

      chrome.runtime.sendMessage({ type: "GET_VND_LIST_DONE" });
      return true;
    }
  });
}
