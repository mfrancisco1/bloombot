// ─── Shared Bloombot Navigation ─────────────────────────────────
// Single source of truth for the site nav. Each page just needs:
//   <nav id="main-nav" data-active="pageName"></nav>
//   <script src="nav.js"></script>
// Pages in subfolders use: <script src="../nav.js"></script>
// The script auto-detects its depth and prefixes paths accordingly.

(function () {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  // ─── Self-contained nav CSS ────────────────────────────────────
  // Injected on every page so the nav renders identically everywhere,
  // even on artifact pages that don't carry the site stylesheet.
  // ID selectors win over any page-level .nav-* rules.
  if (!document.getElementById('bb-nav-css')) {
    const css = document.createElement('style');
    css.id = 'bb-nav-css';
    css.textContent = [
      'nav#main-nav{position:sticky;top:0;z-index:100;background:#1a1612;display:flex;align-items:center;justify-content:space-between;padding:0 2rem;height:56px;border-bottom:3px solid #c4541a;}',
      "#main-nav .nav-brand{font-family:'Space Mono',monospace;font-size:1.2rem;font-weight:700;color:#e0662a;text-decoration:none;letter-spacing:-0.03em;white-space:nowrap;}",
      '#main-nav .nav-links{display:flex;list-style:none;margin:0;padding:0;overflow:visible;}',
      '#main-nav .nav-links li{position:relative;list-style:none;margin:0;padding:0;}',
      '#main-nav .nav-links li>a{display:flex;align-items:center;gap:0.3rem;height:56px;padding:0 0.9rem;color:rgba(255,255,255,0.65);text-decoration:none;font-size:0.78rem;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;transition:color 0.2s,background 0.2s;}',
      '#main-nav .nav-links li>a:hover{color:#fff;background:rgba(255,255,255,0.07);}',
      '#main-nav .nav-links li>a.active{color:#e0662a;}',
      '#main-nav .caret{font-size:0.55rem;opacity:0.5;}',
      '#main-nav .dropdown{display:none;position:absolute;top:56px;left:0;background:#111;border:1px solid rgba(255,255,255,0.1);border-top:2px solid #c4541a;border-radius:0 0 8px 8px;min-width:200px;list-style:none;margin:0;padding:0;z-index:200;box-shadow:0 8px 24px rgba(0,0,0,0.4);}',
      '#main-nav .nav-links li:hover .dropdown{display:block;}',
      '#main-nav .dropdown li a{display:block;height:auto;padding:0.6rem 1rem;font-size:0.78rem;color:rgba(255,255,255,0.65);border-bottom:1px solid rgba(255,255,255,0.06);white-space:nowrap;text-decoration:none;text-transform:none;letter-spacing:0;}',
      '#main-nav .dropdown li:last-child a{border-bottom:none;}',
      '#main-nav .dropdown li a:hover{color:#fff;background:rgba(255,255,255,0.07);}',
      '@media(max-width:680px){#main-nav .nav-links{display:none;}}'
    ].join('\n');
    document.head.appendChild(css);
  }

  // Detect path prefix: if nav.js is loaded as "../nav.js", we're one level deep
  const scripts = document.getElementsByTagName('script');
  let prefix = '';
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].getAttribute('src') || '';
    if (src.match(/nav\.js$/)) {
      const m = src.match(/^((?:\.\.\/)+)/);
      if (m) prefix = m[1];
      break;
    }
  }

  // Active page identifier from data attribute
  const active = nav.getAttribute('data-active') || '';

  // ─── Menu definitions (edit here to update ALL pages) ─────────
  const menus = [
    {
      id: 'i101',
      label: 'I101',
      href: 'bloombot-i101.html',
      items: [
        { label: 'Networks',    href: 'bloombot-i101.html#networks' },
        { label: 'Standards',   href: 'bloombot-i101.html#standards' },
        { label: 'Electricity', href: 'bloombot-i101.html#electricity' },
        { label: 'Ethics',      href: 'bloombot-i101.html#ethics' },
        { label: 'Diversity',     href: 'bloombot-i101.html#diversity' },
        { label: 'Design & Data', href: 'bloombot-i101.html#design' },
        { label: 'Security',    href: 'bloombot-i101.html#security' },
      ],
    },
    {
      id: 'stories',
      label: 'Stories',
      href: 'bloombot-stories.html',
      items: [
        { label: 'Lightning', href: 'bloombot - Lightning.html' },
        { label: 'Coffee',    href: 'bloombot - Coffee.html' },
      ],
    },
    {
      id: 'prototyping',
      label: 'Prototyping',
      href: 'bloombot-prototyping.html',
      items: [
        { label: '3D Graph Paper', href: 'bloombot - 3D Graph Paper.html' },
        { label: 'Lattice',        href: 'bloombot - Lattice.html' },
        { label: 'Encoder Wheel',  href: 'bloombot - Encoder Wheel.html' },
        { label: 'Gear Generator', href: 'gear-generator.html' },
        { label: '3D Model Viewer', href: 'webpage-main/stlM2.html' },
      ],
    },
    {
      id: 'studio',
      label: 'Studio',
      href: 'bloombot-home.html',
      items: [],
    },
    {
      id: 'about',
      label: 'About',
      href: 'about.html',
      items: [],
    },
  ];

  // ─── Build HTML ───────────────────────────────────────────────
  function p(href) { return prefix + href; }

  let html = `<a class="nav-brand" href="${p('opening.html')}">bloombot</a>`;
  html += '<ul class="nav-links">';

  menus.forEach(function (menu) {
    const isActive = active === menu.id;
    const activeCls = isActive ? ' class="active"' : '';
    const hasDrop = menu.items.length > 0;
    const caret = hasDrop ? ' <span class="caret">\u25BC</span>' : '';

    html += '<li>';
    html += '<a href="' + p(menu.href) + '"' + activeCls + '>' + menu.label + caret + '</a>';

    if (hasDrop) {
      html += '<ul class="dropdown">';
      menu.items.forEach(function (item) {
        html += '<li><a href="' + p(item.href) + '">' + item.label + '</a></li>';
      });
      html += '</ul>';
    }

    html += '</li>';
  });

  html += '</ul>';
  nav.innerHTML = html;
})();
