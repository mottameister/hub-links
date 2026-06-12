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
    "Fechar menu de produtos": "Close products menu",
    "Amazon": "Amazon",
    "Setup, jogos, casa e recomendações que eu uso.": "Setup, games, home, and recommendations I use.",
    "Temu": "Temu",
    "Achadinhos e recomendações do programa de influencer.": "Finds and recommendations from the influencer program.",
    "achados": "finds",
    "influencer": "influencer",
    "Lives": "Live streams",
    "Escolha onde assistir as transmissões.": "Choose where to watch the streams.",
    "Parcerias": "Partnerships",
    "Propostas, projetos, collabs e mídia.": "Proposals, projects, collabs, and media.",
    "Enviar email": "Send email",
    "Projetos, collabs, mídia e propostas comerciais.": "Projects, collabs, media, and commercial proposals.",
    "Proposta": "Proposal",
    "Acesso restrito para propostas comerciais.": "Restricted access for commercial proposals.",
    "Toca da Coruja": "Owl's Nest",
    "Lojinha do Servidor": "Server Shop",
    "Pacotes de CobbleDollars para acelerar a economia da Toca.": "CobbleDollars packages to speed up the server economy.",
    "Fechar lojinha do servidor": "Close server shop",
    "1 mi CobbleDollars": "1M CobbleDollars",
    "5 mi CobbleDollars": "5M CobbleDollars",
    "10 mi CobbleDollars": "10M CobbleDollars",
    "Para comprar itens nos merchants do spawn e treinar o time sem pular toda a jornada.": "For buying items from spawn merchants and training your team without skipping the whole journey.",
    "Pacote intermediário para quem quer acelerar builds, consumíveis e ajustes de equipe.": "Mid-tier package for speeding up builds, consumables, and team adjustments.",
    "Mais economia para treinar, testar estratégias e movimentar os merchants do spawn.": "More currency to train, test strategies, and use the spawn merchants.",
    "Pagamento automático em preparação. CobbleDollars são moeda interna da Toca da Coruja, podem ser obtidos jogando, não têm valor real fora do servidor, não podem ser sacados e não são afiliados à Mojang, Microsoft, Nintendo, Creatures, GAME FREAK ou Pokémon.": "Automatic payment is being prepared. CobbleDollars are an internal Owl's Nest currency, can be earned by playing, have no real-world value outside the server, cannot be cashed out, and are not affiliated with Mojang, Microsoft, Nintendo, Creatures, GAME FREAK, or Pokemon.",
    "Nick do Minecraft": "Minecraft nickname",
    "Seu nick original": "Your official username",
    "Digite seu nick antes de escolher o pacote.": "Enter your username before choosing a package.",
    "Use seu nick original com 3 a 16 letras, números ou underline.": "Use your official username with 3 to 16 letters, numbers, or underscores.",
    "Criando checkout seguro...": "Creating secure checkout...",
    "Não foi possível iniciar o pagamento.": "Could not start payment.",
    "Não foi possível iniciar o pagamento agora.": "Could not start payment right now.",
    "Ambiente de teste em preparação. CobbleDollars são moeda interna da Toca da Coruja, podem ser obtidos jogando, não têm valor real fora do servidor, não podem ser sacados e não são afiliados à Mojang, Microsoft, Nintendo, Creatures, GAME FREAK ou Pokémon.": "Test environment is being prepared. CobbleDollars are an internal Owl's Nest currency, can be earned by playing, have no real-world value outside the server, cannot be cashed out, and are not affiliated with Mojang, Microsoft, Nintendo, Creatures, GAME FREAK, or Pokemon.",
    "Pagamento seguro via Mercado Pago. CobbleDollars são moeda interna da Toca da Coruja, podem ser obtidos jogando, não têm valor real fora do servidor, não podem ser sacados e não são afiliados à Mojang, Microsoft, Nintendo, Creatures, GAME FREAK ou Pokémon.": "Secure payment through Mercado Pago. CobbleDollars are an internal Owl's Nest currency, can be earned by playing, have no real-world value outside the server, cannot be cashed out, and are not affiliated with Mojang, Microsoft, Nintendo, Creatures, GAME FREAK, or Pokemon.",
    "Mais Conteúdo": "More content",
    "Projetos Especiais": "Special projects",
    "Prompt Lab": "Prompt Lab",
    "Coruja Cup": "Coruja Cup",
    "Torneio quinzenal de VGC no servidor. Primeira edição em 28/jun.": "Biweekly VGC tournament on the server. First edition on Jun 28.",
    "28/jun": "Jun 28",
    "Primeira Edição": "First Edition",
    "Torneio quinzenal de Double Battle no estilo VGC, transmitido em live, com regras simples para todo mundo que começou do zero no servidor.": "A biweekly VGC-style Double Battle tournament, streamed live, with simple rules for everyone who started from zero on the server.",
    "Domingo 28/jun": "Sunday, Jun 28",
    "Preencha seus dados para entrar na chave da primeira edição. Depois das 9 vagas, novas inscrições entram como lista de espera.": "Fill in your details to enter the first edition bracket. After 9 spots, new registrations go to the waitlist.",
    "Li e aceito as regras: Double Battle, Level 50, Species Clause, Item Clause e lista de banidos.": "I have read and accept the rules: Double Battle, Level 50, Species Clause, Item Clause, and the ban list.",
    "Consigo jogar domingo 28/jun: check-in às 19h e início às 19h30 (Horário BR).": "I can play on Sunday, Jun 28: check-in at 7 PM and start at 7:30 PM (Brazil time).",
    "Não é monotype. Seu time não precisa seguir um tipo específico nesta edição.": "This is not monotype. Your team does not need to follow a specific type for this edition.",
    "Banidos: lendários, míticos, Paradox, Treasures of Ruin, Ultra Beasts e pseudolendários.": "Banned: legendary Pokemon, mythical Pokemon, Paradox Pokemon, Treasures of Ruin, Ultra Beasts, and pseudo-legendary Pokemon.",
    "Mapa 3D do Servidor": "3D Server Map",
    "Monitore a Toca da Coruja em tempo real com render 3D.": "Monitor Toca da Coruja in real time with a 3D render.",
    "ao vivo": "live",
    "3D": "3D",
    "server": "server",
    "9 vagas": "9 spots",
    "vgc": "vgc",
    "Toca da Coruja apresenta": "Owl's Nest presents",
    "Check-in às 19h, início às 19h30.": "Check-in at 7 PM, starts at 7:30 PM.",
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
    "Vida real, comunidade e influência orgânica.": "Real life, community, and organic influence.",
    "@mottameister é um criador brasileiro morando nos EUA, com conteúdo de cozy gaming, vida real, família e rotina. A oportunidade é transformar educação financeira em uma conversa natural, útil e próxima.": "@mottameister is a Brazilian creator living in the U.S., with content around cozy gaming, real life, family, and routine. The opportunity is to turn financial education into a natural, useful, and relatable conversation.",
    "Ver proposta comercial": "View commercial proposal",
    "Explorar números": "Explore numbers",
    "Sobre o criador": "About the creator",
    "Audiência": "Audience",
    "Performance dos últimos 30 dias": "Last 30 days performance",
    "Conteúdos em destaque": "Featured content",
    "Conversão e comunidade": "Conversion and community",
    "Diferenciais": "Differentiators",
    "Formatos de conteúdo": "Content formats",
    "Proposta comercial": "Commercial proposal",
    "Observações importantes": "Important notes",
    "Contato": "Contact",
    "Vamos construir algo relevante.": "Let's build something meaningful.",
    "visualizações no Instagram em 30 dias": "Instagram views in 30 days",
    "seguidores com audiência majoritariamente PT-BR": "followers with a mostly PT-BR audience",
    "Mídia paga": "Paid media",
    "Uso de imagem": "Image usage",
    "Whitelisting": "Whitelisting",
    "Não incluso no escopo base.": "Not included in the base scope.",
    "Negociada separadamente.": "Negotiated separately.",
    "Negociado separadamente.": "Negotiated separately.",
    "Gaming, comunidade e vida real. A casa da Toca da Coruja, do servidor, do modpack e dos projetos que estamos construindo juntos.": "Gaming, community, and real life. Home of Toca da Coruja, the server, the modpack, and the projects we are building together.",
    "setup": "setup",
    "curadoria": "curation",
    "propostas": "proposals",
    "contato": "contact",
    "senha": "password",
    "downloads": "downloads",
    "assinatura": "membership",
    "bate papo": "chat",
    "eventos": "events",
    "suporte": "support",
    "spawn": "spawn",
    "pix": "pix",
    "farmável": "earnable",
    "melhor começo": "best start",
    "maior valor": "best value",
    "instalar": "install",
    "comandos": "commands",
    "desafios": "challenges",
    "mapa": "map",
    "vídeos": "videos",
    "ia": "ai",
    "foto": "photo",
    "projetos": "projects",
    "presente": "gift",
    "Entrar no Discord": "Join Discord",
    "Comunidade, avisos e eventos, FAQ e contato comigo.": "Community, updates and events, FAQ, and direct contact.",
    "Comunidade, avisos, eventos, FAQ e contato comigo.": "Community, updates, events, FAQ, and direct contact.",
    "Baixar o Modpack": "Download the Modpack",
    "A Toca da Coruja no Modrinth.": "Toca da Coruja on Modrinth.",
    "Wiki da Campanha": "Campaign Wiki",
    "Guias, mecânicas e progresso.": "Guides, mechanics, and progress.",
    "Campanha": "Campaign",
    "Trainers, progressão e desafios.": "Trainers, progression, and challenges.",
    "Download do Mundo": "World Download",
    "Mapa oficial para single player.": "Official map for single player.",
    "Virar Ace Trainer": "Become an Ace Trainer",
    "Treinador de end-game na campanha.": "End-game trainer in the campaign.",
    "Guias, campanhas e updates.": "Guides, campaigns, and updates.",
    "Cortes do Motta": "Motta Clips",
    "Dicas rápidas, clips e gameplay.": "Quick tips, clips, and gameplay.",
    "Projetos, código e coisas em construção.": "Projects, code, and things in progress.",
    "Fotos extras da aventura escolar do Dom.": "Extra photos from Dom's school adventure.",
    "Escolha a plataforma": "Choose a platform",
    "Acompanhe as transmissões ao vivo.": "Watch the live streams.",
    "Outro ponto para encontrar as lives.": "Another place to catch the live streams.",
    "Lives, vídeos e reprises no canal.": "Live streams, videos, and replays on the channel.",
    "Um criador brasileiro nos EUA com narrativa orgânica e conexão emocional.": "A Brazilian creator in the U.S. with organic storytelling and emotional connection.",
    "O conteúdo une cozy gaming, rotina real, família e lifestyle. Isso cria um espaço seguro para marcas que precisam falar de decisões importantes sem soar frias ou distantes.": "The content blends cozy gaming, real routine, family, and lifestyle. It creates a trusted space for brands that need to talk about important decisions without sounding cold or distant.",
    "Vida real": "Real life",
    "Rotina de pai, família, casa, escolhas e bastidores com tom humano.": "Fatherhood, family, home, choices, and behind-the-scenes moments with a human tone.",
    "Cozy gaming": "Cozy gaming",
    "Gaming sem exagero infantil, com estética confortável e comunidade.": "Gaming without childish excess, with a comfortable aesthetic and community.",
    "Integrações que entram na história em vez de interromper o conteúdo.": "Integrations that become part of the story instead of interrupting the content.",
    "Ambiente adequado para marcas de confiança, educação e longo prazo.": "A suitable environment for trust-driven, educational, long-term brands.",
    "Alcance PT-BR com público adulto, engajado e próximo da vida prática.": "PT-BR reach with an adult, engaged audience close to practical life.",
    "Forte presença no Instagram, com público principal formado por adultos jovens, gamers, casais, pais e pessoas interessadas em lifestyle.": "Strong Instagram presence, with a core audience of young adults, gamers, couples, parents, and people interested in lifestyle.",
    "seguidores": "followers",
    "público PT-BR": "PT-BR audience",
    "principal canal": "main channel",
    "Perfis com fit para Trix": "Audience fit for Trix",
    "adultos jovens": "young adults",
    "gamers": "gamers",
    "casais": "couples",
    "pais": "parents",
    "lifestyle": "lifestyle",
    "brasileiros no exterior": "Brazilians abroad",
    "O alcance orgânico vem acompanhado de interação e intenção.": "Organic reach is paired with interaction and intent.",
    "Instagram concentra o momento de maior força. TikTok amplia descoberta e o site confirma presença fora das plataformas sociais.": "Instagram is the strongest channel right now. TikTok expands discovery, and the website confirms presence beyond social platforms.",
    "Visualizações": "Views",
    "Contas alcançadas": "Accounts reached",
    "Interações": "Interactions",
    "Contas engajadas": "Engaged accounts",
    "Visitas ao perfil": "Profile visits",
    "Cliques externos": "External clicks",
    "TikTok e website": "TikTok and website",
    "Visualizações TikTok": "TikTok views",
    "Curtidas": "Likes",
    "Compartilhamentos": "Shares",
    "Views de perfil": "Profile views",
    "Visitantes únicos no site": "Unique website visitors",
    "A audiência já clica, compra, entra na comunidade e retorna.": "The audience already clicks, buys, joins the community, and comes back.",
    "Para uma empresa financeira, esse é o sinal mais importante: confiança suficiente para transformar atenção em ação.": "For a financial company, this is the key signal: enough trust to turn attention into action.",
    "cliques": "clicks",
    "pedidos": "orders",
    "em receita": "in revenue",
    "conversão": "conversion",
    "Membros": "Members",
    "Onboarding completo": "Completed onboarding",
    "Membros Cobblemon": "Cobblemon members",
    "Whitelistados": "Whitelisted",
    "Retenção semanal": "Weekly retention",
    "Downloads modpack": "Modpack downloads",
    "Downloads campanha": "Campaign downloads",
    "O valor está na mistura entre alcance, confiança e contexto.": "The value is in the mix of reach, trust, and context.",
    "A proposta não depende de “gamer” como fantasia visual. Ela usa lifestyle, comunidade e storytelling para criar credibilidade.": "The proposal does not depend on “gamer” as a visual costume. It uses lifestyle, community, and storytelling to build credibility.",
    "Alto alcance orgânico": "High organic reach",
    "2.2M views em 30 dias no Instagram.": "2.2M views in 30 days on Instagram.",
    "Storytelling natural": "Natural storytelling",
    "Integrações com narrativa de rotina.": "Integrations through everyday narratives.",
    "Forte engajamento": "Strong engagement",
    "238k interações e 134k contas engajadas.": "238k interactions and 134k engaged accounts.",
    "Comunidade ativa": "Active community",
    "Discord com onboarding e retenção semanal.": "Discord with onboarding and weekly retention.",
    "Conteúdo brand-safe": "Brand-safe content",
    "Tom confiável para marcas sérias.": "A trustworthy tone for serious brands.",
    "Lifestyle autêntico": "Authentic lifestyle",
    "Família, rotina real, setup e vida nos EUA.": "Family, real routine, setup, and life in the U.S.",
    "Conversão comprovada": "Proven conversion",
    "Cliques, pedidos e receita registrada.": "Clicks, orders, and recorded revenue.",
    "Público fiel": "Loyal audience",
    "Relação próxima com audiência PT-BR.": "Close relationship with a PT-BR audience.",
    "Finanças podem entrar como parte da vida, não como pausa publicitária.": "Finance can become part of life, not an ad break.",
    "Reels reais ajudam a mostrar como a marca pode entrar no universo do criador.": "Real Reels help show how the brand can enter the creator's world.",
    "Abaixo, três conteúdos públicos do Instagram como referência de linguagem, presença e conexão com audiência.": "Below, three public Instagram posts as references for tone, presence, and audience connection.",
    "Lifestyle real": "Real lifestyle",
    "Rotina, família e escolhas do dia a dia com tom humano.": "Routine, family, and everyday choices with a human tone.",
    "Comunidade e gaming": "Community and gaming",
    "Conteúdo com energia de comunidade sem perder maturidade visual.": "Content with community energy without losing visual maturity.",
    "Setup e creator economy": "Setup and creator economy",
    "Espaço natural para tecnologia, organização, objetivos e planejamento.": "A natural space for technology, organization, goals, and planning.",
    "Ver Reel no Instagram": "View Reel on Instagram",
    "Embed do Instagram carregando": "Instagram embed loading",
    "A melhor rota para a Trix é conectar planejamento, família, rotina, escolhas e futuro com uma linguagem direta e humana.": "The strongest path for Trix is connecting planning, family, routine, choices, and future with direct, human language.",
    "Reels integrados": "Integrated Reels",
    "história + rotina": "story + routine",
    "Stories": "Stories",
    "toques recorrentes": "recurring touchpoints",
    "Territórios editoriais": "Editorial territories",
    "Setup/cozy gaming": "Setup/cozy gaming",
    "Rotina real": "Real routine",
    "Família": "Family",
    "Lifestyle": "Lifestyle",
    "Tech/gaming": "Tech/gaming",
    "Três caminhos para começar, validar e escalar a parceria.": "Three paths to start, validate, and scale the partnership.",
    "Valores e escopo podem ser ajustados por objetivo, exclusividade, fluxo de aprovação, uso de imagem e mídia paga.": "Pricing and scope can be adjusted by objective, exclusivity, approval flow, image usage, and paid media.",
    "Valores e escopo podem ser ajustados por objetivo, exclusividade, fluxo de aprovação, prazo de uso, mídia paga e whitelisting.": "Pricing and scope can be adjusted by objective, exclusivity, approval flow, usage period, paid media, and whitelisting.",
    "Starter": "Starter",
    "Mensal": "Monthly",
    "Premium": "Premium",
    "1 Reel": "1 Reel",
    "2 Reels": "2 Reels",
    "4 Reels": "4 Reels",
    "8 Reels": "8 Reels",
    "3 stories": "3 stories",
    "6 stories": "6 stories",
    "12 stories": "12 stories",
    "link na bio": "link in bio",
    "ideal para testar narrativa": "ideal for testing the narrative",
    "entrada alinhada ao budget inicial": "entry package aligned with the initial budget",
    "1 rodada simples de ajustes": "1 simple revision round",
    "publicação orgânica no perfil do criador": "organic publication on the creator's profile",
    "direito de uso em mídia paga Meta/TikTok por 30 dias": "paid media usage rights on Meta/TikTok for 30 days",
    "stories recorrentes": "recurring stories",
    "integração orgânica": "organic integration",
    "ritmo contínuo de educação e prova social": "continuous rhythm of education and social proof",
    "dobro de volume para consistência de campanha": "double the volume for campaign consistency",
    "campanha contínua": "continuous campaign",
    "múltiplos conteúdos": "multiple content pieces",
    "prioridade comercial": "commercial priority",
    "planejamento editorial dedicado": "dedicated editorial planning",
    "sob consulta": "upon request",
    "A proposta cobre distribuição orgânica do criador.": "The proposal covers the creator's organic distribution.",
    "A proposta define entrega, uso de imagem e limites de mídia.": "The proposal defines deliverables, image usage, and media limits.",
    "Termos adicionais podem ser negociados separadamente para proteger marca, criador e performance.": "Additional terms can be negotiated separately to protect the brand, creator, and performance.",
    "O pacote Starter inclui direito limitado de veiculação paga dos vídeos aprovados, com restrições claras de prazo, plataforma e escopo.": "The Starter package includes limited paid placement rights for approved videos, with clear restrictions on period, platform, and scope.",
    "Direito de mídia paga": "Paid media rights",
    "Incluso no Starter para Meta e TikTok por 30 dias, apenas com os vídeos aprovados da campanha Trix.": "Included in Starter for Meta and TikTok for 30 days, only with approved videos from the Trix campaign.",
    "Verba e operação de mídia": "Media budget and operation",
    "Budget de impulsionamento, gestão de anúncios, cortes adicionais e variações criativas não estão inclusos.": "Ad spend, ad management, additional cuts, and creative variations are not included.",
    "Whitelisting / Spark Ads": "Whitelisting / Spark Ads",
    "Uso via perfil do criador, Spark Ads, collab ads, extensão de prazo ou outras plataformas devem ser negociados separadamente.": "Use through the creator's profile, Spark Ads, collab ads, usage extensions, or other platforms must be negotiated separately.",
    "@mottameister x Trix Investimentos | Creator economy, confiança e comunidade.": "@mottameister x Trix Investimentos | Creator economy, trust, and community.",
    "@mottameister x Trix Investimentos | Vida real, comunidade e influência orgânica.": "@mottameister x Trix Investimentos | Real life, community, and organic influence.",
    "Para próximos passos, briefing ou ajustes de escopo:": "For next steps, briefing, or scope adjustments:",
    "Voltar ao hub": "Back to hub",
    "Fundo Minecraft": "Minecraft Background",
    "Fundo LEGO": "LEGO Background",
    "Fundo GTA V": "GTA V Background",
    "carro-chefe": "flagship",
    "Mantém a pessoa fotorrealista e transforma o fundo original em uma réplica voxel precisa.": "Keeps the person photorealistic and transforms the original background into a precise voxel replica.",
    "Preserva a pessoa real e reconstrói o ambiente como cenário LEGO fiel à referência.": "Preserves the real person and rebuilds the environment as a LEGO scene faithful to the reference.",
    "Transforma toda a imagem em um screenshot 3D com estética de gameplay high-end do GTA V.": "Transforms the whole image into a 3D screenshot with high-end GTA V gameplay aesthetics.",
    "Quarto Streamer Minecraft": "Minecraft Streamer Room",
    "Cria um cenário de quarto gamer/cozy com referências discretas de blocos.": "Creates a cozy gamer room scene with subtle block-inspired references.",
    "Treinador Cozy": "Cozy Trainer",
    "Retrato com vibe de treinador em mundo de aventura, sem usar marcas oficiais.": "A trainer-style portrait in an adventure world, without using official brands.",
    "Fundo Pixel Art": "Pixel Art Background",
    "Mantém a pessoa real e troca o fundo por um cenário pixel art bonito.": "Keeps the person real and replaces the background with a beautiful pixel art scene.",
    "Creator Profissional": "Professional Creator",
    "Para foto de proposta, mídia kit ou LinkedIn com vibe creator premium.": "For proposal, media kit, or LinkedIn photos with a premium creator feel.",
    "parcerias": "partnerships",
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
        const text = base.replace(key, translated);
        if (node.nodeValue !== text) node.nodeValue = text;
      } else if (state.lang === "pt-BR") {
        if (node.nodeValue !== base) node.nodeValue = base;
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
      const text = state.lang === "en-US" ? node.dataset.en : node.dataset.pt;
      if (node.textContent !== text) node.textContent = text;
    });
    document.querySelectorAll("[data-href-pt][data-href-en]").forEach((node) => {
      const href = state.lang === "en-US" ? node.dataset.hrefEn : node.dataset.hrefPt;
      if (node.getAttribute("href") !== href) node.href = href;
    });
    if (document.body) translateTextNodes();
  };

  root.dataset.theme = state.theme;
  root.dataset.lang = state.lang;
  root.lang = state.lang;

  const buildControls = () => {
    const bindControls = (controls) => {
      if (controls.dataset.controlsReady === "true") {
        apply();
        return;
      }

      controls.dataset.controlsReady = "true";
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

      apply();
    };

    const existingControls = document.querySelector(".site-controls");
    if (existingControls) {
      bindControls(existingControls);
      new MutationObserver(() => apply()).observe(document.body, { childList: true, subtree: true });
      return;
    }

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

    document.body.append(controls);
    bindControls(controls);
    new MutationObserver(() => apply()).observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildControls);
  } else {
    buildControls();
  }
})();

(function () {
  if (location.pathname.includes("/admin/")) return;

  const endpoint = "/api/analytics/click";
  const textOf = (node) => String(
    node.getAttribute("aria-label")
    || node.dataset.trackLabel
    || node.textContent
    || "",
  ).trim().replace(/\s+/g, " ").slice(0, 140);

  const send = (payload) => {
    const body = JSON.stringify({
      path: location.pathname,
      language: document.documentElement.dataset.lang || document.documentElement.lang || "",
      theme: document.documentElement.dataset.theme || "",
      ...payload,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      return;
    }

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (link) {
      send({
        href: link.href,
        label: textOf(link),
        source: link.className || "link",
      });
      return;
    }

    const button = event.target.closest("button");
    if (!button || button.closest(".site-controls")) return;

    const isTrackable = button.matches(".card, [data-shop-open], [data-server-shop-open], [data-live-open], [data-partner-open], [data-server-shop-checkout], [data-track-click]");
    if (!isTrackable) return;

    send({
      href: button.dataset.sku ? `shop:${button.dataset.sku}` : "",
      label: textOf(button),
      source: button.dataset.sku || button.dataset.trackClick || "button",
    });
  }, { capture: true });
})();
