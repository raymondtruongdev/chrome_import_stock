const tokenInput = document.getElementById("tokenInput");
const updateTokenBtn = document.getElementById("updateTokenBtn");

updateTokenBtn.addEventListener("click", () => {
  const token = tokenInput.value.trim();

  if (!token) {
    alert("Token cannot be empty");
    return;
  }

  chrome.storage.local.set(
    { authTokenVnd: token },
    () => {
      window.close(); // đóng popup
    }
  );
});