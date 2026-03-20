// ─── Shared Bloombot Navigation ─────────────────────────────────
// Single source of truth for the site nav. Each page just needs:
//   <nav id="main-nav" data-active="pageName"></nav>
//   <script src="nav.js"></script>
// Pages in subfolders use: <script src="../nav.js"></script>
// The script auto-detects its depth and prefixes paths accordingly.

(function () {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

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
        { label: 'Diversity',   href: 'bloombot-i101.html#diversity' },
        { label: 'Data',        href: 'bloombot-i101.html#data' },
        { label: 'Design',      href: 'bloombot-i101.html#design' },
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
      id: 'scaffolds',
      label: 'Scaffolds',
      href: 'bloombot-scaffolds.html',
      items: [],
    },
    {
      id: 'about',
      label: 'About',
      href: 'bloombot-modern.html',
      items: [],
    },
  ];

  // ─── Build HTML ───────────────────────────────────────────────
  function p(href) { return prefix + href; }

  let html = `<a class="nav-brand" href="${p('index.html')}">bloombot</a>`;
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
