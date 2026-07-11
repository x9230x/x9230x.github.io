(function () {
  const root = new URL(document.currentScript?.dataset.root || './', window.location.href).href;
  const map = {
    '/': 'index.html',
    '/sinks': 'sinks/index.html',
    '/bathsinks': 'bathsinks/index.html',
    '/taps': 'taps/index.html',
    '/filters': 'filters/index.html',
    '/disposers': 'disposers/index.html',
    '/dispenser': 'dispenser/index.html',
    '/acs': 'acs/index.html',
    '/omoikiri-home': 'omoikiri-home/index.html',
    '/about': 'about/index.html',
    '/service': 'service/index.html',
    '/dealers': 'dealers/index.html',
    '/contact': 'contact/index.html',
    '/favorites': 'favorites/index.html',
    '/cart': 'cart.html'
  };

  function normalize(pathname) {
    let path = pathname.replace(/\/$/, '') || '/';
    path = path.replace(/\/index\.html$/i, '') || '/';
    if (/^\/[^/]+\.html$/i.test(path)) path = path.replace(/\.html$/i, '');
    return path;
  }

  function routeFor(href) {
    const localBase = window.location.href.startsWith('file:') && href.startsWith('/')
      ? 'https://omoikiri.local'
      : window.location.href;
    const url = new URL(href, localBase);
    let path = normalize(url.pathname);

    const categoryMatch = path.match(/^\/product-category\/([^/]+)/);
    if (categoryMatch) path = '/' + categoryMatch[1];
    if (/^\/[^/]+\/page\/\d+$/.test(path)) {
      return root + path.replace(/^\//, '') + '/index.html' + url.search + url.hash;
    }
    if (path.startsWith('/product/')) {
      const slug = path.split('/').filter(Boolean)[1];
      if (!slug) return null;
      return root + 'product/' + slug + '/index.html' + url.search + url.hash;
    }

    return map[path] ? root + map[path] : null;
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const local = routeFor(link.getAttribute('href'));
    if (!local) return;
    event.preventDefault();
    if (link.target === '_blank') window.open(local, '_blank', 'noopener');
    else window.location.href = local;
  });
})();
