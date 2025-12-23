//-------------------------------
let isRunning = false;


function waitForMenu(timeout = 2000) {
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

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "START_PROCESS") return;

  if (isRunning) {
    console.warn("Already running");
    return;
  }

  const { words, delay } = message;
  isRunning = true;

  const textAreaSelector = 'input[placeholder="Thêm mã CK vào watchlist..."]';

  const addBtn = [...document.querySelectorAll("button")].find(
    (btn) => btn.textContent.trim() === "Thêm mã CK"
  );


  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    if (addBtn) {
      addBtn.click();
    }

    for (const word of words) {
      await sleep(50);

      const textArea = document.querySelector(textAreaSelector);
      if (!textArea) break;

      // Clear + insert word
      textArea.focus();
      textArea.value = "";
      textArea.dispatchEvent(new Event("input", { bubbles: true }));

      textArea.value = word;
      textArea.dispatchEvent(new Event("input", { bubbles: true }));
      textArea.dispatchEvent(new Event("change", { bubbles: true }));


      // Select 1st item in list
      try {
        const items = await waitForMenu();

        console.log("[AUTO] Menu found, items:", items.length);
        console.log("[AUTO] First item text:", items[0].innerText.trim());

        items[0].click();
      } catch (e) {
        console.warn("[AUTO] Menu not found, pressing Enter");
        pressEnter(input);
      }

      // ⏳ Wait while page processes word
      await sleep(delay);
    }

    isRunning = false;
  })();
});
