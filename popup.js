
document.getElementById("importBtn").addEventListener("click", async () => {
  const rawText = document.getElementById("textInput").value;
  if (!rawText) return;

  // Extract words
  const words = rawText
    .split(",")
    .map(w => w.trim())
    .filter(Boolean);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Inject content script (once)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });

  // Send word list once
  chrome.tabs.sendMessage(tab.id, {
    type: "START_PROCESS",
    words,
    delay: 200
  });
});


