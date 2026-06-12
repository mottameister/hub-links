(function () {
  const themeKey = "motta-theme";
  const root = document.documentElement;
  const nickInput = document.querySelector("[data-shop-nick]");
  const status = document.querySelector("[data-shop-status]");
  const checkoutButtons = document.querySelectorAll("[data-shop-checkout]");

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

  const createCheckout = async (sku) => {
    const minecraftNick = nickInput.value.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(minecraftNick)) {
      setStatus("Use seu nick original com 3 a 16 letras, numeros ou underline.", "error");
      nickInput.focus();
      return;
    }

    setLoading(true);
    setStatus("Criando checkout seguro no Mercado Pago...", "ok");

    try {
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku, minecraftNick }),
      });
      const payload = await response.json();

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

  applyTheme();
})();
