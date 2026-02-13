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

  const normalizeHeader = (text = "") => normalizeText(text).toLowerCase();

  function findHeaderIndex(headers, key) {
    const normalizedKey = normalizeHeader(key);
    return headers.findIndex((h) => normalizeHeader(h).includes(normalizedKey));
  }

  const buildTSV = (headers, rows) =>
    [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");

  const respondEmpty = (sendResponse) => {
    sendResponse({ tsv: "", headers: [], rows: [] });
  };

  function divideBy1000(value) {
    if (!value) return "";

    const num = Number(value.replace(/,/g, "").replace(/\s/g, ""));

    return Number.isNaN(num) ? value : num / 1000;
  }

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
  // Table parsing
  // ==================
  function parseTable({
    tableSelector,
    bodySelector = "tbody",
    headerCleaner,
  }) {
    const table = document.querySelector(tableSelector);
    if (!table) return null;

    const headers = [...table.querySelectorAll("thead th")]
      .map((th) => {
        const node = headerCleaner ? th.cloneNode(true) : th;
        headerCleaner?.(node);
        return normalizeText(node.textContent || node.innerText);
      })
      .filter(Boolean);

    const body = table.querySelector(bodySelector);
    const rows = body
      ? [...body.querySelectorAll("tr")].map((tr) =>
          [...tr.querySelectorAll("td")].map((td) =>
            normalizeText(td.textContent || td.innerText),
          ),
        )
      : [];

    return { headers, rows };
  }

  /**
   * Map / reorder / rename columns from a parsed HTML table
   */
  function mapTableColumns({ outputColumns, headers, rows }) {
    if (!headers?.length || !rows?.length) {
      return { headers: [], rows: [] };
    }

    const mappedHeaders = outputColumns.map((c) => c.label);

    const mappedRows = rows.map((row) =>
      outputColumns.map((c) => {
        const idx = findHeaderIndex(headers, c.key);
        if (idx === -1) return "";

        const raw = row[idx] ?? "";
        return typeof c.transform === "function" ? c.transform(raw) : raw;
      }),
    );

    return { headers: mappedHeaders, rows: mappedRows };
  }

  // ==================
  // Message Listener
  // ==================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // ========= FIREANT =========
    if (message.type === "GET_STOCK_LIST_FIREANT") {
      const symbols = [...document.querySelectorAll("div.sc-eLoUSf.iTbAOj")]
        .map((div) =>
          div
            .querySelector('a[href^="/charts/content/symbols/"]')
            ?.textContent.trim(),
        )
        .filter(Boolean);

      sendResponse({ symbols });
      chrome.runtime.sendMessage({ type: "GET_FIREANT_DONE" });
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
        .map((div) =>
          div
            .querySelector('a[href^="/charts/content/symbols/"]')
            ?.textContent.trim(),
        )
        .filter(Boolean);

      addSymbolFireant(symbols).then(() =>
        chrome.runtime.sendMessage({ type: "CLEAR_FIREANT_DONE" }),
      );
      return true;
    }

    // ========= VNDIRECT =========
    if (message.type === "GET_STOCK_LIST_VND") {
      const tbody = document.getElementById("banggia-khop-lenh-body");
      const symbols = tbody
        ? [...tbody.querySelectorAll("tr")].map((tr) => tr.id).filter(Boolean)
        : [];

      sendResponse({ symbols });
      chrome.runtime.sendMessage({ type: "GET_VNDIRECT_DONE" });
      return true;
    }

    if (message.type === "IMPORT_TO_VNDIRECT") {
      addSymbolVndirect(message.symbols).then(() =>
        chrome.runtime.sendMessage({ type: "IMPORT_VNDIRECT_DONE" }),
      );
      return true;
    }

    // ========= VPS =========
    if (message.type === "GET_VPS_LIST") {
      const result = parseTable({
        tableSelector: 'table[data-testid="portfolio-table-table"]',
        bodySelector: 'tbody[data-testid="portfolio-table-body"]',
      });

      if (!result) {
        respondEmpty(sendResponse);
        return true;
      }

      const mapped = mapTableColumns({
        ...result,
        outputColumns: [
          { key: "Mã CK", label: "Mã" },
          { key: "Tổng", label: "KL" },
          { key: "Có thể bán", label: "GD" },
          { key: "Giá TB", label: "Giá TB" },
          { key: "Giá TT", label: "Giá hiện tại" },
        ],
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);
      sendResponse({ ...mapped, tsv });
      chrome.runtime.sendMessage({ type: "GET_VPS_LIST_DONE" });
      return true;
    }

    // ========= VND =========
    if (message.type === "GET_VND_LIST") {
      const result = parseTable({
        tableSelector: "table.portfolio-data",
        headerCleaner: (clone) =>
          clone.querySelectorAll("i, span").forEach((el) => el.remove()),
      });

      if (!result) {
        respondEmpty(sendResponse);
        return true;
      }

      const mapped = mapTableColumns({
        ...result,
        outputColumns: [
          { key: "Mã", label: "Mã" },
          { key: "KL", label: "KL" },
          { key: "GD", label: "GD" },
          { key: "Giá vốn", label: "Giá TB", transform: divideBy1000 },
          {
            key: "Giá hiện tại",
            label: "Giá hiện tại",
            transform: divideBy1000,
          },
        ],
      });

      const tsv = buildTSV(mapped.headers, mapped.rows);
      sendResponse({ ...mapped, tsv });
      chrome.runtime.sendMessage({ type: "GET_VND_LIST_DONE" });
      return true;
    }

    // ========= FETCH VND LIST (API) =========
    if (message.type === "FETCH_VND_LIST") {
      (async () => {
        try {
          const res = await fetch(
            "https://trade-api.vndirect.com.vn/am/statement" +
              "?type=REALTIME" +
              "&accountNo=0001145256" +
              "&pageSize=1500" +
              "&pageIndex=0" +
              "&secTypeName=Normal+share,Special+share,Fund+unit,ETF:+Exchange+Traded+Fund,Covered+Warrant",
            {
              headers: {
                Accept: "application/json, text/plain, */*",
                "X-AUTH-TOKEN": message.token,
              },
            },
          );

          if (!res.ok) {
            sendResponse({ error: `HTTP_${res.status}` });
            return;
          }

          const json = await res.json();

          const headers = [
            "symbol",
            "quantity",
            "averagePrice",
            "currentPrice",
          ];

          const rows = json.hits.map((item) =>
            headers.map((h) => item[h]).join("\t"),
          );

          const tsv = [headers.join("\t"), ...rows].join("\n");

          sendResponse({ tsv });
        } catch {
          sendResponse({ error: "FETCH_FAILED" });
        }
      })();

      return true;
    }
    // ====================================
    // FETCH VPS PORTFOLIO LIST
    // ====================================
    if (message.type === "FETCH_VPS_LIST") {
      (async () => {
        try {
          const res = await fetch(
            "https://webtrading-proxy.vps.com.vn/rest-api/Q/web.portfolio.portfoliostatus",
            {
              method: "POST",
              headers: {
                Accept: "application/json, text/plain, */*",
                "Content-Type": "application/json",
                "X-Device-New": message.deviceNew, // truyền từ popup
                "X-Session": message.session, // truyền từ popup
                "X-User": message.user, // truyền từ popup
                "X-Ext-Info": "goline",
              },
              body: JSON.stringify({
                type: "string",
                cmd: "Web.Portfolio.PortfolioStatus",
                p1: message.account, // truyền từ popup
                p2: "1",
                p3: "20",
                p4: "",
                p5: "",
              }),
            },
          );

          if (!res.ok) {
            sendResponse({ error: `HTTP_${res.status}` });
            return;
          }

          const json = await res.json();

          // VPS thường trả data trong json.data hoặc json.result
          const list = json?.data || json?.result || [];

          if (!Array.isArray(list)) {
            sendResponse({ error: "INVALID_RESPONSE" });
            return;
          }

          // Bỏ dòng TOTAL
          const filteredList = list.filter((item) => item.symbol !== "TOTAL");

          // Header mới
          const headers = [
            "symbol",
            "quantity",
            "averagePrice",
            "currentPrice",
          ];

          const rows = filteredList.map((item) => {
            const symbol = item.symbol ?? "";

            const quantity = (item.actual_vol ?? "").toString().trim();

            const averagePrice =
              parseFloat((item.avg_price ?? "0").toString().trim()) * 1000;

            const currentPrice =
              parseFloat((item.market_price ?? "0").toString().trim()) * 1000;

            return [
              symbol,
              quantity,
              averagePrice || "",
              currentPrice || "",
            ].join("\t");
          });

          const tsv = [headers.join("\t"), ...rows].join("\n");

          sendResponse({ tsv });
        } catch (err) {
          console.error("[FETCH_VPS_LIST]", err);
          sendResponse({ error: "FETCH_FAILED" });
        }
      })();

      return true;
    }
  });
}
