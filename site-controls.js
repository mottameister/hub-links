(function () {
  const themeKey = "motta-theme";
  const langKey = "motta-lang";
  const root = document.documentElement;

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

  const translations = {
    "@mottameister": "@mottameister",
    "voltar ao hub": "back to hub",
    "Principais links": "Main links",
    "Produtos que eu uso": "Products I use",
    "Setup, jogos, casa, comidas, bebidas e recomendações reais.": "Setup, games, home, food, drinks, and real recommendations.",
    "Lives": "Live streams",
    "Escolha onde assistir as transmissões.": "Choose where to watch the streams.",
    "Parcerias": "Partnerships",
    "Propostas, projetos, collabs e mídia.": "Proposals, projects, collabs, and media.",
    "Enviar email": "Send email",
    "Projetos, collabs, mídia e propostas comerciais.": "Projects, collabs, media, and commercial proposals.",
    "Proposta": "Proposal",
    "Acesso restrito para propostas comerciais.": "Restricted access for commercial proposals.",
    "Toca da Coruja": "Owl's Nest",
    "Mais Conteúdo": "More content",
    "Projetos Especiais": "Special projects",
    "Prompt Lab": "Prompt Lab",
    "Prompts para editar fotos com IA: Minecraft, LEGO, avatars e estilos criativos.": "Prompts to edit photos with AI: Minecraft, LEGO, avatars, and creative styles.",
    "Área de propostas": "Proposal area",
    "Digite a senha recebida para acessar a proposta comercial relacionada.": "Enter the password you received to access the related commercial proposal.",
    "Senha de acesso": "Access password",
    "Entrar": "Enter",
    "Voltar para mottameister.xyz": "Back to mottameister.xyz",
    "Digite a senha recebida para continuar.": "Enter the password you received to continue.",
    "Senha incorreta. Confira e tente novamente.": "Incorrect password. Check it and try again.",
    "Prompts para transformar fotos em mundos criativos.": "Prompts to transform photos into creative worlds.",
    "Ideias prontas para copiar e usar em ferramentas de edição com IA. Escolha um estilo, envie sua foto e cole o prompt.": "Ready-to-copy ideas for AI editing tools. Choose a style, upload your photo, and paste the prompt.",
    "Os prompts são pensados para preservar o rosto e a identidade da pessoa, mudando principalmente fundo, iluminação e estética.": "These prompts are designed to preserve the person's face and identity, changing mainly the background, lighting, and aesthetic.",
    "Todas as categorias": "All categories",
    "Nenhum prompt encontrado com esse filtro.": "No prompts found with this filter.",
    "Copiar prompt": "Copy prompt",
    "Copiado": "Copied",
    "Proposta para Trix Investimentos": "Proposal for Trix Investimentos",
    "Creator economy, comunidade e lifestyle com confiança real.": "Creator economy, community, and lifestyle with real trust.",
    "@mottameister é um criador brasileiro morando nos EUA, com conteúdo de cozy gaming, vida real, família e rotina. A oportunidade é transformar educação financeira em uma conversa natural, útil e próxima.": "@mottameister is a Brazilian creator living in the U.S., with content around cozy gaming, real life, family, and routine. The opportunity is to turn financial education into a natural, useful, and relatable conversation.",
    "Ver proposta comercial": "View commercial proposal",
    "Explorar números": "Explore numbers",
    "Sobre o criador": "About the creator",
    "Audiência": "Audience",
    "Performance dos últimos 30 dias": "Last 30 days performance",
    "Conversão e comunidade": "Conversion and community",
    "Diferenciais": "Differentiators",
    "Formatos de conteúdo": "Content formats",
    "Proposta comercial": "Commercial proposal",
    "Observações importantes": "Important notes",
    "Contato": "Contact",
    "Vamos construir algo relevante.": "Let's build something meaningful.",
    "Mídia paga": "Paid media",
    "Uso de imagem": "Image usage",
    "Whitelisting": "Whitelisting",
    "Não incluso no escopo base.": "Not included in the base scope.",
    "Negociada separadamente.": "Negotiated separately.",
    "Negociado separadamente.": "Negotiated separately.",
  };

  const originalText = new WeakMap();

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
      if (state.lang === "en-US" && translated) {
        node.nodeValue = base.replace(key, translated);
      } else if (state.lang === "pt-BR") {
        node.nodeValue = base;
      }
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
    document.querySelectorAll("[data-pt][data-en]").forEach((node) => {
      node.textContent = state.lang === "en-US" ? node.dataset.en : node.dataset.pt;
    });
    if (document.body) translateTextNodes();
  };

  root.dataset.theme = state.theme;
  root.dataset.lang = state.lang;
  root.lang = state.lang;

  const buildControls = () => {
    if (document.querySelector(".site-controls")) return;

    const controls = document.createElement("div");
    controls.className = "site-controls";
    controls.setAttribute("aria-label", "Preferências do site");
    controls.innerHTML = `
      <div class="site-control-group" aria-label="Tema">
        <button class="site-control" type="button" data-theme-choice="dark" aria-label="Dark mode">Dark</button>
        <button class="site-control" type="button" data-theme-choice="light" aria-label="Light mode">Light</button>
      </div>
      <div class="site-control-group" aria-label="Idioma">
        <button class="site-control" type="button" data-lang-choice="pt-BR" aria-label="Português">PT</button>
        <button class="site-control" type="button" data-lang-choice="en-US" aria-label="English">EN</button>
      </div>
    `;

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

    document.body.append(controls);
    apply();
    new MutationObserver(() => apply()).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildControls);
  } else {
    buildControls();
  }
})();
