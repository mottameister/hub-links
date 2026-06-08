(function () {
  const themeKey = "motta-theme";
  const langKey = "motta-lang";
  const root = document.documentElement;
  const originalText = new WeakMap();

  const translations = {
    "← voltar ao hub": "← back to hub",
    "← voltar para Coruja Cup": "← back to Coruja Cup",
    "Toca da Coruja apresenta": "Owl's Nest presents",
    "Primeira Edição": "First Edition",
    "Torneio quinzenal de Double Battle no estilo VGC, transmitido em live, com regras simples para todo mundo que começou do zero no servidor.": "A biweekly VGC-style Double Battle tournament, streamed live, with simple rules for everyone who started from zero on the server.",
    "Domingo 28/jun": "Sunday, Jun 28",
    "Preencha seus dados para entrar na chave da primeira edição. Depois das 9 vagas, novas inscrições entram como lista de espera.": "Fill in your details to enter the first edition bracket. After 9 spots, new registrations go to the waitlist.",
    "Li e aceito as regras: Double Battle, Level 50, Species Clause, Item Clause e lista de banidos.": "I have read and accept the rules: Double Battle, Level 50, Species Clause, Item Clause, and the ban list.",
    "Consigo jogar domingo 28/jun: check-in às 19h e início às 19h30 (Horário BR).": "I can play on Sunday, Jun 28: check-in at 7 PM and start at 7:30 PM (Brazil time).",
    "Não é monotype. Seu time não precisa seguir um tipo específico nesta edição.": "This is not monotype. Your team does not need to follow a specific type for this edition.",
    "Banidos: lendários, míticos, Paradox, Treasures of Ruin, Ultra Beasts e pseudolendários.": "Banned: legendary Pokemon, mythical Pokemon, Paradox Pokemon, Treasures of Ruin, Ultra Beasts, and pseudo-legendary Pokemon.",
    "Check-in às 19h, início às 19h30.": "Check-in at 7 PM, starts at 7:30 PM.",
    "9 vagas": "9 spots",
    "Primeira edição enxuta para testar o formato.": "A lean first edition to test the format.",
    "Leve 6 Pokémon, escolha 4 na Team Preview.": "Bring 6 Pokemon, choose 4 in Team Preview.",
    "confirmados": "confirmed",
    "vagas livres": "open spots",
    "lista de espera": "waitlist",
    "Inscrição": "Registration",
    "Nick no Minecraft": "Minecraft nickname",
    "Nome no Discord": "Discord name",
    "Fuso/país": "Timezone/country",
    "Observações": "Notes",
    "Enviar inscrição": "Submit registration",
    "Formato": "Format",
    "Double Battle inspirado em VGC, com Level 50 fixo e timer padrão do jogo.": "VGC-inspired Double Battle, fixed Level 50, and the game's default timer.",
    "Cada jogador leva 6 Pokémon e escolhe 4 na Team Preview.": "Each player brings 6 Pokemon and chooses 4 in Team Preview.",
    "Chaveamento em Single Elimination: perdeu, saiu.": "Single Elimination bracket: lose and you are out.",
    "O organizador transmite e coordena, mas não participa das batalhas.": "The organizer streams and coordinates, but does not battle.",
    "Permitidos: Terastal, Hidden Abilities, shinies, breed competitivo e Pokémon treinados no servidor.": "Allowed: Terastal, Hidden Abilities, shinies, competitive breeding, and Pokemon trained on the server.",
    "Banidos: lendários, míticos, Paradox, Treasures of Ruin e Ultra Beasts.": "Banned: legendary Pokemon, mythical Pokemon, Paradox Pokemon, Treasures of Ruin, and Ultra Beasts.",
    "O campeão recebe shiny competitivo exclusivo, cargo no Discord e Hall da Fama na arena.": "The champion receives an exclusive competitive shiny, a Discord role, and a Hall of Fame spot in the arena.",
    "Organização": "Organization",
    "Inscrições": "Registrations",
    "Use o token admin para carregar os inscritos, acompanhar confirmados/lista de espera e exportar CSV.": "Use the admin token to load registrations, track confirmed/waitlist players, and export CSV.",
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
