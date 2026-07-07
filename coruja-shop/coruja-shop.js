(function () {
  const root = document.documentElement;
  const nickInput = document.querySelector("[data-shop-nick]");
  const couponInput = document.querySelector("[data-shop-coupon]");
  const quantityControl = document.querySelector("[data-shop-quantity]");
  const quantityValue = document.querySelector("[data-shop-quantity-value]");
  const quantityDec = document.querySelector("[data-shop-quantity-dec]");
  const quantityInc = document.querySelector("[data-shop-quantity-inc]");
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

  root.dataset.theme = "dark";

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-ok", type === "ok");
  };

  const isFixedQuantitySku = (sku) => {
    const button = document.querySelector(`[data-shop-checkout][data-sku="${CSS.escape(String(sku || ""))}"]`);
    return button?.dataset.fixedQuantity === "1";
  };

  const setLoading = (isLoading) => {
    checkoutButtons.forEach((button) => {
      button.disabled = isLoading;
    });
    if (isLoading) {
      [quantityDec, quantityInc].forEach((button) => {
        if (button) button.disabled = true;
      });
      return;
    }

    setQuantity(getQuantity());
  };

  const getQuantity = () => {
    const quantity = Number.parseInt(quantityValue?.dataset.value || "1", 10);
    return Number.isInteger(quantity) && quantity >= 1 && quantity <= 10 ? quantity : 1;
  };

  const setQuantity = (nextQuantity) => {
    const quantity = Math.min(10, Math.max(1, Number.parseInt(nextQuantity, 10) || 1));
    if (quantityValue) {
      quantityValue.dataset.value = String(quantity);
      quantityValue.textContent = `${quantity}x pacote${quantity > 1 ? "s" : ""}`;
    }
    if (quantityControl) quantityControl.dataset.value = String(quantity);
    if (quantityDec) quantityDec.disabled = quantity <= 1;
    if (quantityInc) quantityInc.disabled = quantity >= 10;
  };

  quantityDec?.addEventListener("click", () => setQuantity(getQuantity() - 1));
  quantityInc?.addEventListener("click", () => setQuantity(getQuantity() + 1));

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

  const renderLeaderboard = (entries, stateText = "prévia") => {
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
    renderLeaderboard(fallbackLeaderboard, "prévia");

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
        renderLeaderboard(entries, payload.source === "server" ? "ao vivo" : "prévia");
      }
    } catch {}
  };

  const createCheckout = async (sku) => {
    const minecraftNick = nickInput.value.trim();
    const coupon = couponInput ? couponInput.value.trim() : "";
    const fixedQuantity = isFixedQuantitySku(sku);
    const quantity = fixedQuantity ? 1 : getQuantity();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftNick)) {
      setStatus("Use seu nick original com 3 a 16 letras, números ou underline.", "error");
      nickInput.focus();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    setLoading(true);
    setStatus(coupon
      ? "Aplicando cupom de teste no servidor..."
      : fixedQuantity
        ? "Criando checkout seguro da assinatura no Mercado Pago..."
        : `Criando checkout seguro no Mercado Pago (${quantity}x)...`, "ok");

    try {
      const response = await fetch(`${apiBase}/api/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, minecraftNick, coupon, quantity }),
        signal: controller.signal,
      });
      const payload = await response.json();
      window.clearTimeout(timeoutId);

      if (payload.couponApplied) {
        setStatus("Cupom aplicado. O pedido entrou na fila de entrega do servidor.", "ok");
        setLoading(false);
        return;
      }

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Não foi possível iniciar o pagamento.");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      window.clearTimeout(timeoutId);
      setStatus(error.name === "AbortError" ? "A conexão demorou demais. Atualize a página e tente de novo." : error.message || "Não foi possível iniciar o pagamento agora.", "error");
      setLoading(false);
    }
  };

  checkoutButtons.forEach((button) => {
    button.addEventListener("click", () => createCheckout(button.dataset.sku));
  });

  loadLeaderboard();
  setQuantity(1);
})();
