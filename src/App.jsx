import { useEffect, useState } from 'react';
import BorderGlow from './components/BorderGlow';
import SoftAurora from './components/SoftAurora';

const featured = [
  {
    title: 'Produtos que eu uso',
    description: 'Setup, jogos, casa e recomendações reais.',
    eyebrow: 'CURADORIA MOTTA',
    icon: '⌁',
    tone: 'violet',
    action: 'shop'
  },
  {
    title: 'Lives',
    description: 'Twitch, Kick ou YouTube — você escolhe.',
    eyebrow: 'AGORA OU DEPOIS',
    icon: '▶',
    tone: 'pink',
    action: 'live'
  },
  {
    title: 'Parcerias',
    description: 'Projetos, collabs, mídia e propostas.',
    eyebrow: 'VAMOS CRIAR',
    icon: '✦',
    tone: 'cyan',
    action: 'partners'
  }
];

const tocaLinks = [
  {
    title: 'Entrar no Discord',
    description: 'Comunidade, avisos, eventos e suporte.',
    meta: 'COMUNIDADE',
    icon: '◉',
    href: 'https://discord.com/invite/TcSFAXGr6a',
    tone: 'discord'
  },
  {
    title: 'Coruja Shop',
    description: 'CobbleDollars, shops do spawn e ranking.',
    meta: 'ECONOMIA',
    icon: '◈',
    href: '/coruja-shop/',
    tone: 'gold'
  },
  {
    title: 'Coruja Cup',
    description: 'Inscrições abertas para a próxima edição.',
    meta: 'VAGAS LIMITADAS',
    icon: '♕',
    href: '/coruja-cup/',
    tone: 'violet'
  },
  {
    title: 'Server Toca da Coruja',
    description: 'Status online e mapa 3D em um só lugar.',
    meta: 'AO VIVO',
    icon: '⌾',
    tone: 'green',
    action: 'server'
  },
  {
    title: 'Baixar o Modpack',
    description: 'Instale a Toca da Coruja pelo Modrinth.',
    meta: 'MODRINTH',
    icon: '⬡',
    href: 'https://modrinth.com/modpack/toca-da-coruja',
    tone: 'green'
  },
  {
    title: 'Campanha',
    description: 'Trainers, progressão e desafios.',
    meta: 'RCT',
    icon: '⚔',
    href: 'https://modrinth.com/mod/toca-da-coruja-campanha',
    tone: 'cyan'
  },
  {
    title: 'Download do Mundo',
    description: 'Mapa oficial para jogar em single player.',
    meta: 'PATREON',
    icon: '⌖',
    href: 'https://www.patreon.com/posts/mundo-cobblemon-155150113',
    tone: 'gold'
  },
  {
    title: 'Virar Ace Trainer',
    description: 'Trainer personalizado combinado por conversa.',
    meta: 'CORUJA SHOP',
    icon: '△',
    href: '/coruja-shop/#ace-trainer',
    tone: 'pink'
  }
];

const specialLinks = [
  { title: 'Prompt Lab', description: 'Prompts para criar, editar e brincar com IA.', icon: '✧', href: '/prompts/', tone: 'violet' },
  { title: 'GitHub', description: 'Projetos, código e coisas em construção.', icon: '{ }', href: 'https://github.com/mottameister', tone: 'neutral' },
  { title: 'Wallpapers favoritos', description: 'Minha curadoria do Wallpaper Engine.', icon: '▧', href: 'https://steamcommunity.com/id/mottameister/myworkshopfiles?appid=431960&browsefilter=mysubscriptions', tone: 'cyan' },
  { title: 'Honey’s Adventure', description: 'Fotos extras da aventura escolar do Dom.', icon: '◇', href: '/honey', tone: 'pink' }
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
  partners: {
    title: 'Vamos criar alguma coisa?',
    subtitle: 'Projetos, mídia, collabs e boas ideias.',
    links: [
      ['Enviar email', 'contato@mottameister.xyz', 'mailto:contato@mottameister.xyz'],
      ['Abrir propostas', 'Área reservada para propostas comerciais.', '/propostas/'],
      ['Media kit', 'Números, formatos e possibilidades.', 'https://www.mottameister.xyz/media-kit/']
    ]
  },
  server: {
    title: 'Server Toca da Coruja',
    subtitle: 'Tudo que está acontecendo no mundo agora.',
    links: [
      ['Status do Servidor', 'Veja se a Toca está online e quem está jogando.', '/status/'],
      ['Mapa 3D', 'Explore a Toca em tempo real.', 'https://map.mottameister.xyz/']
    ]
  }
};

function Arrow() {
  return <span className="arrow" aria-hidden="true">↗</span>;
}

function LinkCard({ item, compact = false, onOpen }) {
  const shared = {
    className: `link-card tone-${item.tone} ${compact ? 'is-compact' : ''}`,
    colors: item.tone === 'gold'
      ? ['#ffbf38', '#ff8a3d', '#ff4fd8']
      : item.tone === 'green'
        ? ['#66f28b', '#43d9ff', '#b517ff']
        : ['#b517ff', '#ff4fd8', '#43d9ff'],
    glowColor: item.tone === 'gold' ? '40 95 65' : item.tone === 'green' ? '145 88 68' : '280 92 72'
  };

  const content = (
    <>
      <div className="card-heading">
        <span className="card-icon">{item.icon}</span>
        <Arrow />
      </div>
      <div className="card-copy">
        {item.meta && <span className="card-meta">{item.meta}</span>}
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    </>
  );

  if (item.action) {
    return <BorderGlow as="button" type="button" onClick={() => onOpen(item.action)} {...shared}>{content}</BorderGlow>;
  }

  return (
    <BorderGlow as="a" href={item.href} target={item.href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" {...shared}>
      {content}
    </BorderGlow>
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
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <BorderGlow className="modal-card" borderRadius={30} glowRadius={50} backgroundColor="rgba(10, 8, 17, .96)">
        <div className="modal-head">
          <div>
            <span className="eyebrow">ATALHO RÁPIDO</span>
            <h2>{content.title}</h2>
            <p>{content.subtitle}</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-links">
          {content.links.map(([title, description, href]) => (
            <a key={title} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
              <span><strong>{title}</strong><small>{description}</small></span>
              <Arrow />
            </a>
          ))}
        </div>
      </BorderGlow>
    </div>
  );
}

export default function App() {
  const [modal, setModal] = useState(null);
  const [specialOpen, setSpecialOpen] = useState(false);

  return (
    <div className="app-shell">
      <div className="aurora-layer">
        <SoftAurora />
      </div>
      <div className="ambient-noise" aria-hidden="true" />

      <header className="site-header">
        <a href="#top" className="wordmark">MOTTA<span>MEISTER</span></a>
        <nav aria-label="Navegação principal">
          <a href="#toca">A Toca</a>
          <a href="#projetos">Projetos</a>
          <a className="nav-pill" href="https://discord.com/invite/TcSFAXGr6a" target="_blank" rel="noreferrer">Entrar no Discord <Arrow /></a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow"><i /> VIDA REAL · COMUNIDADE · JOGOS</span>
            <h1>Um canto da internet<br />feito para <em>jogar junto.</em></h1>
            <p>A casa da Toca da Coruja, dos Corujões e das ideias que a gente tira do papel — uma aventura de cada vez.</p>
            <div className="hero-actions">
              <a className="primary-cta" href="#toca">Explorar a Toca <span>↓</span></a>
              <button className="ghost-cta" type="button" onClick={() => setModal('live')}><span className="live-dot" /> Onde estou ao vivo</button>
            </div>
          </div>

          <div className="portrait-wrap">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="portrait-halo" />
            <img src="/profile.jpeg" alt="@mottameister" />
            <span className="portrait-tag">ASHBURN, VA · BRASIL NO CORAÇÃO</span>
          </div>
        </section>

        <section className="featured-section" aria-label="Principais links">
          <div className="section-intro">
            <span className="eyebrow">COMECE POR AQUI</span>
            <p>Três portas. Um universo meio caótico, mas bem organizado.</p>
          </div>
          <div className="featured-grid">
            {featured.map((item) => <LinkCard key={item.title} item={item} onOpen={setModal} />)}
          </div>
        </section>

        <section className="toca-section" id="toca">
          <div className="section-heading">
            <div>
              <span className="eyebrow"><i /> NOSSO MUNDO</span>
              <h2>Toca da Coruja</h2>
              <p>Servidor Cobblemon, campanha própria e uma comunidade que já virou família.</p>
            </div>
          </div>

          <div className="toca-grid">
            {tocaLinks.map((item) => <LinkCard key={item.title} item={item} compact onOpen={setModal} />)}
          </div>
        </section>

        <section className="projects-section" id="projetos">
          <button className="projects-toggle" type="button" onClick={() => setSpecialOpen((current) => !current)} aria-expanded={specialOpen}>
            <span><small>FORA DA TOCA</small>Projetos especiais</span>
            <span className={specialOpen ? 'toggle-icon is-open' : 'toggle-icon'}>＋</span>
          </button>
          {specialOpen && (
            <div className="special-grid">
              {specialLinks.map((item) => <LinkCard key={item.title} item={item} compact onOpen={setModal} />)}
            </div>
          )}
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
