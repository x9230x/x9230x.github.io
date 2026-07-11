import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname.slice(1));
const SOURCE = 'https://omoikiri.ru';
const CATEGORIES = [
  'sinks',
  'bathsinks',
  'taps',
  'filters',
  'disposers',
  'dispenser',
  'acs',
  'omoikiri-home',
];

function outPath(...parts) {
  return path.join(ROOT, ...parts);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 OMOIKIRI-KZ catalog sync',
      accept: 'text/html,application/xhtml+xml',
    },
  });

  if (!response.ok) {
    if (attempt < 3) {
      await sleep(650 * attempt);
      return fetchText(url, attempt + 1);
    }
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return response.text();
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function pageUrls(category, html) {
  const urls = [`${SOURCE}/${category}`];
  const nav = html.match(/<nav class="woocommerce-pagination"[\s\S]*?<\/nav>/)?.[0] || '';
  for (const match of nav.matchAll(/href="([^"]+)"/g)) {
    const href = match[1].replace(/&amp;/g, '&');
    if (href.includes(`/${category}/page/`)) urls.push(href);
  }
  return unique(urls).sort((a, b) => pageNumber(a) - pageNumber(b));
}

function pageNumber(url) {
  return Number(url.match(/\/page\/(\d+)/)?.[1] || 1);
}

function productLinks(html) {
  const links = [];
  for (const match of html.matchAll(/<a[^>]+href="(https:\/\/omoikiri\.ru\/product\/[^"?/#]+)(?:\?[^"]*)?"[^>]*class="[^"]*woocommerce-LoopProduct-link/g)) {
    links.push(match[1]);
  }
  for (const match of html.matchAll(/<a[^>]+class="[^"]*woocommerce-LoopProduct-link[^"]*"[^>]+href="(https:\/\/omoikiri\.ru\/product\/[^"?/#]+)(?:\?[^"]*)?"/g)) {
    links.push(match[1]);
  }
  return unique(links);
}

function productSlug(url) {
  return new URL(url).pathname.split('/').filter(Boolean).pop();
}

function categoryScript(rootPrefix) {
  return `
<script id="dealer-local-sinks-layer-script" src="${rootPrefix}assets/js/sinks-local.js?v=20260711-09" data-root="${rootPrefix}"></script>
<script src="${rootPrefix}assets/js/lang-switch.js" data-root="${rootPrefix}"></script>
<script src="${rootPrefix}assets/js/local-router.js" data-root="${rootPrefix}"></script>`;
}

function productScript() {
  return `
<script id="dealer-local-product-script" src="../../assets/js/product-local.js"></script>
<script src="../../assets/js/lang-switch.js" data-root="../../"></script>
<script src="../../assets/js/local-router.js" data-root="../../"></script>`;
}

function normalizeCommon(html) {
  let next = html;
  next = next.replace(/\s*<base\s+href=["']https:\/\/omoikiri\.ru\/?["']\s*>\s*/gi, '\n');
  if (!/<meta\s+name=["']robots["']/i.test(next)) {
    next = next.replace(/<head[^>]*>/i, (tag) => `${tag}
  <meta name="robots" content="noindex">`);
  }
  next = next.replace(/https:\/\/omoikiri\.ru\/cart/g, '/cart');
  next = next.replace(/https:\/\/omoikiri\.ru\/favorites/g, '/favorites');
  next = rewriteLocalLinks(next);
  next = next.replace(/"priceCurrency":"RUB"/g, '"priceCurrency":"KZT"');
  next = next.replace(/&#8381;|&amp;#8381;|₽/g, '₸');
  return next;
}

function rewriteLocalLinks(html) {
  const categoryPaths = [
    'sinks',
    'bathsinks',
    'taps',
    'filters',
    'disposers',
    'dispenser',
    'acs',
    'omoikiri-home',
  ];

  let next = html;
  for (const category of categoryPaths) {
    next = next.replace(new RegExp(`href=["']https://omoikiri\\\\.ru/${category}/page/(\\\\d+)/?["']`, 'g'), `href="/${category}/page/$1/index.html"`);
    next = next.replace(new RegExp(`href=["']https://omoikiri\\\\.ru/${category}/?(\\\\?[^"']*)?["']`, 'g'), `href="/${category}/index.html$1"`);
    next = next.replace(new RegExp(`href=["']/product-category/${category}/?(\\\\?[^"']*)?["']`, 'g'), `href="/${category}/index.html$1"`);
  }

  next = next.replace(/href=["']https:\/\/omoikiri\.ru\/product\/([^"'?/#]+)(\?[^"']*)?["']/g, 'href="/product/$1/index.html$2"');
  next = next.replace(/href=["']\/product\/([^"'?/#]+)(\?[^"']*)?["']/g, 'href="/product/$1/index.html$2"');
  return next;
}

function injectBeforeBody(html, snippet) {
  let next = html
    .replace(/<script[^>]+src="[^"]*assets\/js\/sinks-local\.js"[^>]*><\/script>\s*/g, '')
    .replace(/<script[^>]+src="[^"]*assets\/js\/product-local\.js"[^>]*><\/script>\s*/g, '')
    .replace(/<script[^>]+src="[^"]*assets\/js\/lang-switch\.js"[^>]*><\/script>\s*/g, '')
    .replace(/<script[^>]+src="[^"]*assets\/js\/local-router\.js"[^>]*><\/script>\s*/g, '');

  return next.replace(/<\/body>/i, `${snippet}
</body>`);
}

async function saveCategoryPage(category, url, html) {
  const page = pageNumber(url);
  const rootPrefix = page === 1 ? '../' : '../../../';
  const dir = page === 1
    ? outPath(category)
    : outPath(category, 'page', String(page));
  const file = path.join(dir, 'index.html');
  await mkdir(dir, { recursive: true });
  const prepared = injectBeforeBody(normalizeCommon(html), categoryScript(rootPrefix));
  await writeFile(file, prepared, 'utf8');
}

async function saveProductPage(url) {
  const slug = productSlug(url);
  const file = outPath('product', slug, 'index.html');
  if (await exists(file)) return { slug, skipped: true };

  const html = await fetchText(url);
  const prepared = injectBeforeBody(normalizeCommon(html), productScript());
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, prepared, 'utf8');
  return { slug, skipped: false };
}

async function readPreviousSinks() {
  const file = outPath('product', 'sinks-products.json');
  if (!(await exists(file))) return [];
  const data = JSON.parse(await readFile(file, 'utf8'));
  return data.products || [];
}

async function main() {
  const products = new Map();
  const report = [];

  for (const category of CATEGORIES) {
    const firstUrl = `${SOURCE}/${category}`;
    const firstHtml = await fetchText(firstUrl);
    const urls = pageUrls(category, firstHtml);
    let cards = 0;

    for (const url of urls) {
      const html = url === firstUrl ? firstHtml : await fetchText(url);
      await saveCategoryPage(category, url, html);
      const links = productLinks(html);
      cards += links.length;
      for (const link of links) products.set(productSlug(link), { slug: productSlug(link), url: link, category });
    }

    report.push({ category, pages: urls.length, cards });
  }

  for (const item of await readPreviousSinks()) {
    if (item?.slug && item?.url && !products.has(item.slug)) {
      products.set(item.slug, { ...item, category: 'sinks' });
    }
  }

  let created = 0;
  let skipped = 0;
  for (const item of products.values()) {
    const result = await saveProductPage(item.url);
    if (result.skipped) skipped += 1;
    else created += 1;
    await sleep(90);
  }

  const allProducts = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    categories: report,
    count: products.size,
    created,
    skipped,
    products: [...products.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
  };

  await writeFile(outPath('product', 'all-products.json'), JSON.stringify(allProducts, null, 2), 'utf8');
  console.log(JSON.stringify(allProducts, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
