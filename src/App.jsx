import { useEffect, useState } from 'react';

const featured = [
  {
    title: 'Trabalhe comigo',
    description: 'Parcerias para games, tecnologia, setup e lifestyle.',
    meta: 'PARA MARCAS',
    icon: '🤝',
    tone: 'gold',
    featured: true,
    href: '/media-kit/'
  },
  {
    title: 'Produtos que eu uso',
    description: 'Setup, jogos, casa e recomendações reais.',
    meta: 'CURADORIA MOTTA',
    icon: '🛍️',
    tone: 'violet',
    wide: true,
    action: 'shop'
  },
  {
    title: 'Anuncie no Corujão',
    description: 'Sua marca em vídeos para uma comunidade que joga junto.',
    meta: 'MÍDIA NA COMUNIDADE',
    icon: '📣',
    tone: 'cyan',
    featured: true,
    href: 'mailto:contato@mottameister.xyz?subject=An%C3%BAncio%20no%20Coruj%C3%A3o'
  }
];

const tocaLinks = [
  {
    title: 'Entrar no Discord',
    description: 'Comunidade, avisos, eventos e suporte.',
    meta: 'COMUNIDADE',
    icon: '💬',
    href: 'https://discord.com/invite/TcSFAXGr6a',
    tone: 'discord'
  },
  {
    title: 'Coruja Shop',
    description: 'CobbleDollars, shops do spawn e ranking.',
    meta: 'ECONOMIA',
    icon: '🪙',
    href: '/coruja-shop/',
    tone: 'gold'
  },
  {
    title: 'Coruja Cup',
    description: 'Inscrições abertas para a próxima edição.',
    meta: 'VAGAS LIMITADAS',
    icon: '🏆',
    href: '/coruja-cup/',
    tone: 'violet'
  },
  {
    title: 'Server Toca da Coruja',
    description: 'Consulte o status do servidor em um só lugar.',
    meta: 'AO VIVO',
    icon: '📡',
    tone: 'green',
    action: 'server'
  },
  {
    title: 'Baixar o Modpack',
    description: 'Instale a Toca da Coruja pelo Modrinth.',
    meta: 'MODRINTH',
    icon: '📦',
    tone: 'green',
    action: 'modpack'
  },
  {
    title: 'Campanha',
    description: 'Trainers, progressão e desafios.',
    meta: 'RCT',
    icon: '⚔️',
    href: 'https://modrinth.com/mod/toca-da-coruja-campanha',
    tone: 'cyan'
  },
  {
    title: 'Download do Mundo',
    description: 'Mapa oficial para jogar em single player.',
    meta: 'CORUJA SHOP',
    icon: '🌍',
    href: '/coruja-shop/#mundo-toca',
    tone: 'gold'
  },
  {
    title: 'Virar Ace Trainer',
    description: 'Trainer personalizado combinado por conversa.',
    meta: 'CORUJA SHOP',
    icon: '🎓',
    href: '/coruja-shop/#ace-trainer',
    tone: 'pink'
  }
];

const specialLinks = [
  { title: 'GT Engineer', description: 'Ferramenta para acertar carros, pistas e eventos no Gran Turismo 7.', icon: '🏎️', href: '/gt-engineer/', tone: 'gold', featured: true },
  { title: 'Prompt Lab', description: 'Prompts para criar, editar e brincar com IA.', icon: '✨', href: '/prompts/', tone: 'violet' },
  { title: 'GitHub', description: 'Projetos, código e coisas em construção.', icon: '💻', href: 'https://github.com/mottameister', tone: 'neutral' },
  { title: 'Wallpapers favoritos', description: 'Minha curadoria do Wallpaper Engine.', icon: '🖼️', href: 'https://steamcommunity.com/id/mottameister/myworkshopfiles?appid=431960&browsefilter=mysubscriptions', tone: 'cyan' }
];

const modalContent = {
  shop: {
    title: 'Produtos que eu uso',
    subtitle: 'Links de curadoria, sem papo de vendedor.',
    links: [
      ['Amazon BR', 'Setup, jogos, casa e recomendações no Brasil.', 'https://www.amazon.com.br/shop/mottameister'],
      ['Amazon US', 'Setup, jogos, casa e recomendações nos EUA.', 'https://www.amazon.com/shop/mottameister?ccs_id=e601d8bd-0a1b-421a-bc96-e0ce5841f050'],
      ['Temu', 'Achadinhos do programa de influencer.', 'https://temu.to/k/p3fxhtj7nzz']
    ]
  },
  live: {
    title: 'Escolha a plataforma',
    subtitle: 'A live é a mesma. O sofá digital é você quem escolhe.',
    links: [
      ['Twitch', 'Acompanhe as transmissões ao vivo.', 'https://www.twitch.tv/mottameister'],
      ['Kick', 'Outro ponto para encontrar as lives.', 'https://kick.com/mottameister'],
      ['YouTube', 'Lives, vídeos e reprises no canal.', 'https://www.youtube.com/@mottameister']
    ]
  },
  server: {
    title: 'Server Toca da Coruja',
    subtitle: 'Tudo que está acontecendo no mundo agora.',
    links: [
      ['Status do Servidor', 'Veja se a Toca está online e quem está jogando.', '/status/']
    ]
  },
  modpack: {
    title: 'Baixar o Modpack',
    subtitle: 'Escolha a versão da Toca da Coruja no Modrinth.',
    links: [
      ['Full', 'Experiência completa da Toca da Coruja.', 'https://modrinth.com/modpack/toca-da-coruja'],
      ['Lite', 'Versão mais leve para baixar e jogar.', 'https://modrinth.com/modpack/toca-da-coruja-lite']
    ]
  }
};

function Arrow() {
  return <span className="arrow" aria-hidden="true">➡️</span>;
}

function formatStat(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return fallback;
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  if (number >= 1_000) return `${(number / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}K`;
  return String(number);
}

function StatCounter({ value, duration }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(value);
      return;
    }
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setCount(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  const display = formatStat(count, '0');
  return (
    <strong className="follower-counter" aria-label={formatStat(value, '0')}>
      <span className="follower-counter-visual" aria-hidden="true">
        {[...display].map((character, index) => /\d/.test(character) ? (
          <span className="follower-digit" key={index}>
            <span className="follower-reel" style={{ transform: `translateY(-${Number(character) * 10}%)` }}>
              {'0123456789'.split('').map((digit) => <span key={digit}>{digit}</span>)}
            </span>
          </span>
        ) : <span className="follower-symbol" key={index}>{character}</span>)}
      </span>
    </strong>
  );
}

function LinkCard({ item, compact = false, onOpen }) {
  const className = `link-card glass-surface tone-${item.tone} ${compact ? 'is-compact' : ''}`;
  const content = (
    <>
      <span className="card-icon" aria-hidden="true">{item.icon}</span>
      <div className="card-copy">
        {item.meta && <span className="card-meta">{item.meta}</span>}
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
      <Arrow />
    </>
  );

  if (item.action) {
    return <button className={className} type="button" onClick={() => onOpen(item.action)}>{content}</button>;
  }

  return (
    <a className={className} href={item.href} target={item.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
      {content}
    </a>
  );
}

function Modal({ type, onClose }) {
  const content = type ? modalContent[type] : null;

  useEffect(() => {
    if (!content) return undefined;
    const handleKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [content, onClose]);

  if (!content) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()} role="presentation">
      <div className="modal-card glass-surface" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <span className="eyebrow">ATALHO RÁPIDO</span>
            <h2 id="modal-title">{content.title}</h2>
            <p>{content.subtitle}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">✖️</button>
        </div>
        <div className="modal-links">
          {content.links.map(([title, description, href]) => (
            <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              <span><strong>{title}</strong><small>{description}</small></span>
              <Arrow />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [modal, setModal] = useState(null);
  const [tocaOpen, setTocaOpen] = useState(false);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [communityStats, setCommunityStats] = useState(null);
  const [followers, setFollowers] = useState(() => {
    try {
      const cached = Number(localStorage.getItem('mottameister-followers-v1'));
      if (Number.isFinite(cached) && cached > 0) return cached;
    } catch { /* Storage may be unavailable. */ }
    return 89900;
  });
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#172635' : '#e8eef4');
    try { localStorage.setItem('mottameister-theme', theme); } catch { /* Private browsing can disable storage. */ }
  }, [theme]);

  useEffect(() => {
    let active = true;
    let timer;
    let controller;
    const refresh = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      let hasFollowers = false;
      try {
        const cacheHour = new Date().toISOString().slice(0, 13);
        const response = await fetch(`/api/community-stats?hour=${cacheHour}`, { signal: controller.signal });
        const payload = response.ok ? await response.json() : null;
        if (!active) return;
        if (payload?.ok) {
          setCommunityStats(payload);
          const total = Number(payload.instagram?.followers);
          if (Number.isFinite(total) && total > 0) {
            hasFollowers = true;
            setFollowers(total);
            try { localStorage.setItem('mottameister-followers-v1', String(total)); } catch { /* Storage may be unavailable. */ }
          }
        }
      } catch { /* Keep the last known total while offline. */ }
      finally {
        clearTimeout(timeout);
        if (active) timer = setTimeout(refresh, hasFollowers ? 300000 : 60000);
      }
    };
    refresh();
    return () => { active = false; clearTimeout(timer); controller?.abort(); };
  }, []);

  const positiveStat = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  const instagramViews = positiveStat(communityStats?.instagramViews?.totalViews, 28900000);
  const discordMembers = positiveStat(communityStats?.discord?.members, 1200);
  const counterValues = [followers, discordMembers, instagramViews];
  const counterOrder = [...new Set(counterValues)].sort((a, b) => a - b);
  const counterKey = counterValues.join('-');
  const renderCounter = (value, index) => <StatCounter key={`${counterKey}-${index}`} value={value} duration={1000 + counterOrder.indexOf(value) * 800} />;
  const discordOnline = formatStat(communityStats?.discord?.online, null);
  return (
    <div className="app-shell">
      <header className="site-header">
          <a href="#top" className="wordmark">MOTTA<span>MEISTER</span></a>
          <nav aria-label="Navegação principal">
            <a href="#toca">A Toca</a>
            <a href="#parcerias">Parcerias</a>
            <a href="#projetos">Projetos</a>
            <a className="nav-pill" href="https://discord.com/invite/TcSFAXGr6a" target="_blank" rel="noreferrer">Entrar no Discord <Arrow /></a>
        </nav>
        <button
          className="theme-toggle"
          type="button"
          onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}
          aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
          aria-pressed={theme === 'dark'}
          title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
        >
          <span className="theme-emoji" aria-hidden="true">{theme === 'light' ? '🌙' : '☀️'}</span>
        </button>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><i /> VIDA REAL · COMUNIDADE · JOGOS</span>
            <h1>Uma comunidade<br /><em>que vira conteúdo, projeto e história.</em></h1>
            <p>Corujões, setup e Cobblemon para uma audiência que acompanha, comenta e volta.</p>
            <div className="hero-actions">
              <a className="primary-cta" href="#parcerias">Trabalhe comigo <Arrow /></a>
              <a className="ghost-cta" href="https://discord.com/invite/TcSFAXGr6a" target="_blank" rel="noreferrer"><span className="live-dot" /> Conheça a Toca</a>
              <button className="text-cta" type="button" onClick={() => setModal('live')}>Onde estou ao vivo</button>
            </div>
            <div className="proof-stats" aria-label="Indicadores da comunidade">
              <div>{renderCounter(followers, 0)}<span>seguidores no Instagram</span></div>
              <div>{renderCounter(discordMembers, 1)}<span>membros na Toca{discordOnline ? ` · ${discordOnline} online` : ''}</span></div>
              <div>{renderCounter(instagramViews, 2)}<span>views em Reels e vídeos</span></div>
            </div>
          </div>

          <div className="portrait-wrap">
            <img src="/profile.jpeg" alt="@mottameister" />
            <span className="portrait-tag">VIRGINIA, USA · BRASIL NO CORAÇÃO</span>
          </div>
        </section>

        <section className="featured-section" id="parcerias" aria-label="Parcerias e recomendações">
          <div className="section-intro">
            <span className="eyebrow">PARCERIAS E RECOMENDAÇÕES</span>
            <p>Para marcas: formatos que integram com a comunidade. Para quem acompanha: os produtos que realmente aparecem nos vídeos.</p>
          </div>
          <div className="featured-grid">
            {featured.map((item) => <LinkCard key={item.title} item={item} onOpen={setModal} />)}
          </div>
        </section>

        <section className="toca-section" id="toca">
          <button className="section-toggle glass-surface" type="button" onClick={() => setTocaOpen((current) => !current)} aria-expanded={tocaOpen} aria-controls="toca-links">
            <span className="section-symbol" aria-hidden="true">🦉</span>
            <span className="section-toggle-copy"><small>NOSSO MUNDO</small><strong>Toca da Coruja</strong><span>Servidor, comunidade e tudo para jogar junto.</span></span>
            <span className="section-toggle-end"><small>{tocaLinks.length} links</small><span className="toggle-icon" aria-hidden="true">{tocaOpen ? '🔼' : '🔽'}</span></span>
          </button>
          <div className="submenu glass-surface" id="toca-links" hidden={!tocaOpen}>
            {tocaLinks.map((item) => <LinkCard key={item.title} item={item} compact onOpen={setModal} />)}
          </div>
        </section>

        <section className="projects-section" id="projetos">
          <button className="section-toggle glass-surface" type="button" onClick={() => setSpecialOpen((current) => !current)} aria-expanded={specialOpen} aria-controls="special-links">
            <span className="section-symbol" aria-hidden="true">🛠️</span>
            <span className="section-toggle-copy"><small>FORA DA TOCA</small><strong>Projetos especiais</strong><span>Ideias, ferramentas e coisas em construção.</span></span>
            <span className="section-toggle-end"><small>{specialLinks.length} links</small><span className="toggle-icon" aria-hidden="true">{specialOpen ? '🔼' : '🔽'}</span></span>
          </button>
          <div className="submenu glass-surface" id="special-links" hidden={!specialOpen}>
            {specialLinks.map((item) => <LinkCard key={item.title} item={item} compact onOpen={setModal} />)}
          </div>
        </section>
      </main>

      <footer>
        <span>MOTTAMEISTER.XYZ</span>
        <p>Feito entre um café, uma live e outra ideia perigosa.</p>
        <span>© 2026</span>
      </footer>

      <Modal type={modal} onClose={() => setModal(null)} />
    </div>
  );
}
