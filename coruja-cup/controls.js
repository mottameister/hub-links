(function () {
  const themeKey = "motta-theme";
  const langKey = "motta-lang";
  const root = document.documentElement;
  const originalText = new WeakMap();

  const translations = {
    "← voltar ao hub": "← back to hub",
    "← voltar para Coruja Cup": "← back to Coruja Cup",
    "Toca da Coruja apresenta": "Owl's Nest presents",
    "Próxima edição": "Next edition",
    "A Coruja Cup volta em uma próxima edição no servidor Toca da Coruja. Deixe sua inscrição para a organização chamar quando a data e o formato forem definidos.": "Coruja Cup returns for a next edition on the Toca da Coruja server. Register so the organizers can contact you when the date and format are defined.",
    "Data a definir": "Date TBD",
    "A próxima edição ainda não tem dia e horário fechados.": "The next edition does not have a confirmed date and time yet.",
    "Vagas limitadas": "Limited spots",
    "A quantidade de participantes será anunciada mais perto do evento.": "The participant count will be announced closer to the event.",
    "Regras a definir": "Rules TBD",
    "Formato, banimentos e premiação serão atualizados antes da chave.": "Format, bans, and prizes will be updated before the bracket.",
    "Vagas": "Spots",
    "limitadas": "limited",
    "Data": "Date",
    "a definir": "TBD",
    "Preencha seus dados para demonstrar interesse na próxima edição. A organização chama no Discord quando a data, as vagas e as regras forem definidas.": "Fill in your details to show interest in the next edition. The organizers will contact you on Discord when the date, spots, and rules are defined.",
    "Entendo que as regras da próxima edição ainda serão definidas pela organização.": "I understand that the next edition's rules will still be defined by the organizers.",
    "Quero receber o aviso da próxima edição e confirmarei presença quando a data for anunciada.": "I want to receive the next-edition notice and will confirm attendance when the date is announced.",
    "Inscrição": "Registration",
    "Nick no Minecraft": "Minecraft nickname",
    "Nome no Discord": "Discord name",
    "Fuso/país": "Timezone/country",
    "Observações": "Notes",
    "Enviar inscrição": "Submit registration",
    "A data e o horário ainda serão definidos.": "The date and time are still to be defined.",
    "As vagas serão limitadas, com quantidade anunciada mais perto do evento.": "Spots will be limited, with the amount announced closer to the event.",
    "As inscrições atuais servem para a organização saber quem tem interesse em participar.": "Current registrations help the organizers know who is interested in participating.",
    "Os jogadores serão chamados no Discord quando os detalhes estiverem fechados.": "Players will be contacted on Discord when the details are final.",
    "Regras": "Rules",
    "Formato, cláusulas, banimentos e premiação ainda estão a definir.": "Format, clauses, bans, and prizes are still to be defined.",
    "A organização vai publicar as regras completas antes da confirmação final dos participantes.": "The organizers will publish the full rules before final participant confirmation.",
    "Ao se inscrever agora, você entra apenas na lista de interessados da próxima edição.": "By registering now, you only join the interest list for the next edition.",
    "Organização": "Organization",
    "Inscrições": "Registrations",
    "Use o token admin para carregar interessados da próxima edição e exportar CSV.": "Use the admin token to load next-edition interested players and export CSV.",
    "Token admin": "Admin token",
    "Carregar": "Load",
    "Exportar CSV": "Export CSV",
  };

  const getStored = (key, fallback) => {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const setStored = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  };

  const state = {
    theme: getStored(themeKey, "dark"),
    lang: getStored(langKey, "pt-BR"),
  };

  const translateTextNodes = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEXTAREA"].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue);
      const base = originalText.get(node);
      const key = base.trim();
      const translated = translations[key];
      node.nodeValue = state.lang === "en-US" && translated ? base.replace(key, translated) : base;
    });
  };

  const apply = () => {
    root.dataset.theme = state.theme;
    root.dataset.lang = state.lang;
    root.lang = state.lang;

    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.themeChoice === state.theme);
    });
    document.querySelectorAll("[data-lang-choice]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.langChoice === state.lang);
    });

    translateTextNodes();
    window.dispatchEvent(new CustomEvent("coruja-cup-langchange"));
  };

  document.querySelectorAll(".site-controls").forEach((controls) => {
    controls.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.themeChoice) {
        state.theme = button.dataset.themeChoice;
        setStored(themeKey, state.theme);
      }

      if (button.dataset.langChoice) {
        state.lang = button.dataset.langChoice;
        setStored(langKey, state.lang);
      }

      apply();
    });
  });

  apply();
})();
