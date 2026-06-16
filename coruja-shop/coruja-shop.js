(function () {
  const themeKey = "motta-theme";
  const root = document.documentElement;
  const nickInput = document.querySelector("[data-shop-nick]");
  const couponInput = document.querySelector("[data-shop-coupon]");
  const status = document.querySelector("[data-shop-status]");
  const checkoutButtons = document.querySelectorAll("[data-shop-checkout]");
  const leaderboardList = document.querySelector("[data-leaderboard-list]");
  const leaderboardState = document.querySelector("[data-leaderboard-state]");
  const apiBase = "https://mottameister-services-api.mottameister.xyz";

  const fallbackLeaderboard = [
    { rank: 1, name: "jotinha7b", amount: "11.6M" },
    { rank: 2, name: "Muniz_XD", amount: "10M" },
    { rank: 3, name: "Marru_XD", amount: "10M" },
    { rank: 4, name: "yRuizx", amount: "1.07M" },
    { rank: 5, name: "Shyad0u", amount: "878K" },
    { rank: 6, name: "Fortalzera", amount: "567K" },
    { rank: 7, name: "Fethr7350", amount: "323K" },
    { rank: 8, name: "yLoorenzoo", amount: "277K" },
    { rank: 9, name: "BiggieSm4llz", amount: "261K" },
    { rank: 10, name: "Miquesl", amount: "215K" },
  ];

  const getStoredTheme = () => {
    try {
      return localStorage.getItem(themeKey) || "dark";
    } catch {
      return "dark";
    }
  };

  const setStoredTheme = (theme) => {
    try {
      localStorage.setItem(themeKey, theme);
    } catch {}
  };

  let currentTheme = getStoredTheme();

  const applyTheme = () => {
    root.dataset.theme = currentTheme;
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.themeChoice === currentTheme);
    });
  };

  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      currentTheme = button.dataset.themeChoice;
      setStoredTheme(currentTheme);
      applyTheme();
    });
  });

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-ok", type === "ok");
  };

  const setLoading = (isLoading) => {
    checkoutButtons.forEach((button) => {
      button.disabled = isLoading;
    });
  };

  const parseLeaderboardText = (text) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.match(/^(\d+)\.\s+(.+?)\s+\$?\s*([\d.,]+[KMB]?)/i))
      .filter(Boolean)
      .map((match) => ({
        rank: Number(match[1]),
        name: match[2].trim(),
        amount: match[3].replace(",", ".").toUpperCase(),
      }));
  };

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const renderLeaderboard = (entries, stateText = "snapshot") => {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = entries
      .slice(0, 10)
      .map((entry) => `
        <li>
          <span class="leaderboard-rank">#${escapeHtml(entry.rank)}</span>
          <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
          <span class="leaderboard-amount">$ ${escapeHtml(entry.amount)}</span>
        </li>
      `)
      .join("");

    if (leaderboardState) {
      leaderboardState.textContent = stateText;
    }
  };

  const loadLeaderboard = async () => {
    renderLeaderboard(fallbackLeaderboard, "snapshot");

    try {
      const response = await fetch(`${apiBase}/api/shop/pending?leaderboard=1`, { headers: { Accept: "application/json,text/plain" } });
      if (!response.ok) return;

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json") ? await response.json() : await response.text();
      const entries = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.entries)
          ? payload.entries
          : parseLeaderboardText(String(payload.text || payload));

      if (entries.length) {
        renderLeaderboard(entries, payload.source === "server" ? "ao vivo" : "snapshot");
      }
    } catch {}
  };

  const createCheckout = async (sku) => {
    const minecraftNick = nickInput.value.trim();
    const coupon = couponInput ? couponInput.value.trim() : "";

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftNick)) {
      setStatus("Use seu nick original com 3 a 16 letras, numeros ou underline.", "error");
      nickInput.focus();
      return;
    }

    setLoading(true);
    setStatus("Criando checkout seguro no Mercado Pago...", "ok");

    try {
      const response = await fetch(`${apiBase}/api/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, minecraftNick, coupon }),
      });
      const payload = await response.json();

      if (payload.couponApplied) {
        setStatus("Cupom aplicado. Pedido entrou na fila de entrega do servidor.", "ok");
        setLoading(false);
        return;
      }

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Nao foi possivel iniciar o pagamento.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setStatus(error.message || "Nao foi possivel iniciar o pagamento agora.", "error");
      setLoading(false);
    }
  };

  checkoutButtons.forEach((button) => {
    button.addEventListener("click", () => createCheckout(button.dataset.sku));
  });

  loadLeaderboard();
  applyTheme();
})();
