(function () {
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeIcon = document.querySelector("[data-theme-icon]");
  const setTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#172635" : "#e8eef4");
    themeToggle?.setAttribute("aria-label", theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro");
    if (themeIcon) themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    try { localStorage.setItem("mottameister-theme", theme); } catch {}
  };
  setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  themeToggle?.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
  const apiBase = "https://mottameister-services-api.mottameister.xyz";
  const nickInput = document.querySelector("[data-shop-nick]");
  const couponInput = document.querySelector("[data-shop-coupon]");
  const status = document.querySelector("[data-shop-status]");
  const checkoutButtons = document.querySelectorAll("[data-shop-checkout]");
  const comboButtons = [...document.querySelectorAll("[data-combo-sku]")];
  const comboCheckout = document.querySelector("[data-combo-checkout]");
  const selected = new Set();
  const currency = (amount) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  const quantityValue = document.querySelector("[data-shop-quantity-value]");
  const quantityDec = document.querySelector("[data-shop-quantity-dec]");
  const quantityInc = document.querySelector("[data-shop-quantity-inc]");
  const goalPercent = document.querySelector("[data-goal-percent]");
  const goalFill = document.querySelector("[data-goal-fill]");
  const goalTrack = document.querySelector("[data-goal-track]");
  const goalState = document.querySelector("[data-goal-state]");
  const isPreview = !["mottameister.xyz", "www.mottameister.xyz"].includes(window.location.hostname);

  if (isPreview) {
    const banner = document.createElement("div");
    banner.className = "preview-banner";
    banner.textContent = "PRÉVIA LOCAL · compras desativadas";
    document.body.prepend(banner);
  }

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.classList.toggle("is-error", type === "error");
    status.classList.toggle("is-ok", type === "ok");
  };

  const setLoading = (loading) => {
    checkoutButtons.forEach((button) => { button.disabled = loading; });
    if (comboCheckout) comboCheckout.disabled = loading || selected.size === 0;
    if (loading && quantityDec && quantityInc) {
      quantityDec.disabled = true;
      quantityInc.disabled = true;
    } else if (quantityValue) {
      setQuantity(quantityValue.value);
    }
  };

  const setQuantity = (value) => {
    const quantity = Math.max(1, Math.min(10, Number(value) || 1));
    if (!quantityValue || !quantityDec || !quantityInc) return;
    quantityValue.value = String(quantity);
    quantityDec.disabled = quantity <= 1;
    quantityInc.disabled = quantity >= 10;
  };
  quantityDec?.addEventListener("click", () => setQuantity(Number(quantityValue.value) - 1));
  quantityInc?.addEventListener("click", () => setQuantity(Number(quantityValue.value) + 1));
  if (quantityValue) setQuantity(1);

  const renderCombo = () => {
    const chosen = comboButtons.filter((button) => selected.has(button.dataset.comboSku));
    const subtotal = chosen.reduce((sum, button) => sum + Number(button.dataset.price), 0);
    const discount = chosen.length >= 4 ? 15 : chosen.length === 3 ? 10 : chosen.length === 2 ? 5 : 0;
    const total = Math.round(subtotal * (1 - discount / 100) * 100) / 100;
    comboButtons.forEach((button) => {
      const active = selected.has(button.dataset.comboSku);
      button.classList.toggle("is-selected", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const list = document.querySelector("[data-combo-items]");
    if (list) list.textContent = chosen.length ? chosen.map((button) => button.querySelector("span")?.textContent?.trim()).join(" · ") : "Nenhum benefício selecionado.";
    const subtotalNode = document.querySelector("[data-combo-subtotal]");
    const discountNode = document.querySelector("[data-combo-discount]");
    const totalNode = document.querySelector("[data-combo-total]");
    const buttonPrice = document.querySelector("[data-combo-button-price]");
    if (subtotalNode) subtotalNode.textContent = currency(subtotal);
    if (discountNode) discountNode.textContent = `${discount}%`;
    if (totalNode) totalNode.textContent = currency(total);
    if (buttonPrice) buttonPrice.textContent = currency(total);
    if (comboCheckout) comboCheckout.disabled = chosen.length === 0;
  };
  comboButtons.forEach((button) => button.addEventListener("click", () => {
    const sku = button.dataset.comboSku;
    if (selected.has(sku)) selected.delete(sku);
    else {
      if (button.hasAttribute("data-combo-membership")) comboButtons.filter((other) => other.hasAttribute("data-combo-membership")).forEach((other) => selected.delete(other.dataset.comboSku));
      selected.add(sku);
    }
    renderCombo();
  }));
  if (comboButtons.length) renderCombo();

  const loadGoal = async () => {
    try {
      const response = await fetch(`${apiBase}/api/shop/server-goal`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Goal unavailable");
      const goal = await response.json();
      if (!goal.active) return;
      const percent = Math.max(0, Math.min(100, Number(goal.progressPercent) || 0));
      if (goalPercent) goalPercent.textContent = `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(percent)}%`;
      if (goalFill) goalFill.style.width = `${percent}%`;
      goalTrack?.setAttribute("aria-valuenow", String(percent));
      if (goalState) goalState.textContent = goal.reached
        ? "Meta alcançada! Acompanhe no Discord os próximos passos da compra e da migração."
        : `Neste mês, as compras aprovadas somaram ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.max(0, Number(goal.monthContributionPercent) || 0))}% da meta.`;
    } catch {
      if (goalState) goalState.textContent = isPreview
        ? "A meta começa quando esta versão da loja for publicada."
        : "O progresso está temporariamente indisponível. Tente novamente mais tarde.";
    }
  };

  const createCheckout = async (sku, items) => {
    if (isPreview) {
      setStatus(`Prévia do produto ${sku}: compras ficam desativadas até a publicação.`, "ok");
      return;
    }
    const minecraftNick = nickInput.value.trim();
    const coupon = couponInput.value.trim();
    const button = document.querySelector(`[data-shop-checkout][data-sku="${CSS.escape(sku)}"]`);
    const quantity = button?.dataset.fixedQuantity === "1" || !quantityValue ? 1 : Number(quantityValue.value);
    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftNick)) {
      setStatus("Use seu nick original com 3 a 16 letras, números ou underline.", "error");
      nickInput.focus();
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setStatus(coupon ? "Aplicando cupom..." : "Criando checkout seguro no Mercado Pago...", "ok");

    try {
      const response = await fetch(`${apiBase}/api/shop/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, minecraftNick, coupon, quantity, ...(items ? { items } : {}) }),
        signal: controller.signal,
      });
      const payload = await response.json();
      if (payload.couponApplied) {
        setStatus(payload.deliveryId ? "Cupom aplicado. Seu pedido entrou na fila de entrega." : "Cupom aplicado. O pedido ficou registrado para entrega manual.", "ok");
        return;
      }
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || "Não foi possível iniciar o pagamento.");
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      setStatus(error.name === "AbortError" ? "A conexão demorou demais. Tente novamente." : error.message || "Não foi possível iniciar o pagamento.", "error");
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  checkoutButtons.forEach((button) => button.addEventListener("click", () => createCheckout(button.dataset.sku)));
  comboCheckout?.addEventListener("click", () => createCheckout("combo_personalizado", [...selected].map((sku) => ({ sku, quantity: 1 }))));
  loadGoal();
  window.setInterval(() => { if (!document.hidden) loadGoal(); }, 60_000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loadGoal(); });
})();
