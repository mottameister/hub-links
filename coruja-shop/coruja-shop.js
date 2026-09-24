(function () {
  const apiBase = "https://mottameister-services-api.mottameister.xyz";
  const nickInput = document.querySelector("[data-shop-nick]");
  const couponInput = document.querySelector("[data-shop-coupon]");
  const status = document.querySelector("[data-shop-status]");
  const checkoutButtons = document.querySelectorAll("[data-shop-checkout]");
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
    if (loading) {
      quantityDec.disabled = true;
      quantityInc.disabled = true;
    } else {
      setQuantity(quantityValue.value);
    }
  };

  const setQuantity = (value) => {
    const quantity = Math.max(1, Math.min(10, Number(value) || 1));
    quantityValue.value = String(quantity);
    quantityDec.disabled = quantity <= 1;
    quantityInc.disabled = quantity >= 10;
  };
  quantityDec.addEventListener("click", () => setQuantity(Number(quantityValue.value) - 1));
  quantityInc.addEventListener("click", () => setQuantity(Number(quantityValue.value) + 1));
  setQuantity(1);

  const loadGoal = async () => {
    try {
      const response = await fetch(`${apiBase}/api/shop/server-goal`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Goal unavailable");
      const goal = await response.json();
      if (!goal.active) return;
      const percent = Math.max(0, Math.min(100, Number(goal.progressPercent) || 0));
      goalPercent.textContent = `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(percent)}%`;
      goalFill.style.width = `${percent}%`;
      goalTrack.setAttribute("aria-valuenow", String(percent));
      goalState.textContent = goal.reached
        ? "Meta alcançada! Acompanhe no Discord os próximos passos da compra e da migração."
        : `Neste mês, as compras aprovadas somaram ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(Math.max(0, Number(goal.monthContributionPercent) || 0))}% da meta.`;
    } catch {
      goalState.textContent = isPreview
        ? "A meta começa quando esta versão da loja for publicada."
        : "O progresso está temporariamente indisponível. Tente novamente mais tarde.";
    }
  };

  const createCheckout = async (sku) => {
    if (isPreview) {
      setStatus(`Prévia do produto ${sku}: compras ficam desativadas até a publicação.`, "ok");
      return;
    }
    const minecraftNick = nickInput.value.trim();
    const coupon = couponInput.value.trim();
    const button = document.querySelector(`[data-shop-checkout][data-sku="${CSS.escape(sku)}"]`);
    const quantity = button?.dataset.fixedQuantity === "1" ? 1 : Number(quantityValue.value);
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
        body: JSON.stringify({ sku, minecraftNick, coupon, quantity }),
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
  loadGoal();
})();
