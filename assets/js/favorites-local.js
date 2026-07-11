(function () {
  const FAVORITES_KEY = 'omoikiri:favorites';
  const DISCONTINUED_SKUS = new Set([
    '4993469', '4993459', '4993487', '4993744', '4993291',
    '4993935', '4993845', '4993875', '4993917', '4993247',
    '4993508', '4973056', '4994174', '4994139', '4994270'
  ]);
  const DISCONTINUED_BY_SLUG_COLOR = {
    'tasogare-86': ['bl', 'gr'],
    'tasogare-65': ['gr'],
    'tasogare-78': ['be'],
    'maru-86-2': ['ch'],
    'tedori-86-2-lb': ['wh'],
    'yasugata-100': ['be'],
    'yasugata-86': ['pl'],
    'tedori-100': ['be'],
    'bosen-38-u': ['ch'],
    'miya-50-r': ['ch'],
    'akisame-41': ['in'],
    'tateyama-s': ['ca', 'ev'],
    'umi': ['bl']
  };
  const tableBody = document.getElementById('favoritesTableBody');
  const empty = document.getElementById('emptyState');
  const pdfButton = document.getElementById('pdfButton');
  const excelButton = document.getElementById('excelButton');
  const clearButton = document.getElementById('clearButton');
  const copyShareLink = document.getElementById('copyShareLink');
  const shareLinkText = document.getElementById('shareLinkText');
  const printTotal = document.getElementById('printTotal');
  const detailsCache = new Map();
  const colorNames = {
    az: 'азур',
    be: 'бежевый',
    bl: 'черный',
    cc: 'кофе',
    ch: 'шоколад',
    cn: 'карбон',
    dc: 'темный шоколад',
    es: 'эверест',
    ev: 'эверест',
    gb: 'графит',
    gm: 'вороненая сталь',
    gr: 'серый',
    ib: 'индиго',
    in: 'нержавеющая сталь',
    lg: 'светлое золото',
    mo: 'мокка',
    ol: 'олива',
    pa: 'пастила',
    pe: 'жемчуг',
    pl: 'платина',
    rg: 'розовое золото',
    sa: 'сахара',
    sb: 'серо-бежевый',
    sl: 'серебристый',
    wh: 'белый',
    wg: 'белое золото',
    wd: 'дерево'
  };

  function readFavorites() {
    const cookieValue = document.cookie
      .split('; ')
      .find((row) => row.startsWith(encodeURIComponent(FAVORITES_KEY) + '='))
      ?.split('=')
      .slice(1)
      .join('=');

    try {
      return JSON.parse(window.localStorage.getItem(FAVORITES_KEY) || cookieValue && decodeURIComponent(cookieValue) || '[]')
        .filter((item) => !isDiscontinuedFavorite(item));
    } catch (error) {
      try {
        return JSON.parse(cookieValue ? decodeURIComponent(cookieValue) : '[]')
          .filter((item) => !isDiscontinuedFavorite(item));
      } catch (cookieError) {
        return [];
      }
    }
  }

  function writeFavorites(items) {
    const value = JSON.stringify(items.filter((item) => !isDiscontinuedFavorite(item)));

    try {
      window.localStorage.setItem(FAVORITES_KEY, value);
    } catch (error) {}

    document.cookie = encodeURIComponent(FAVORITES_KEY) + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function cleanPrice(value) {
    const compact = String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/Original price was:[^.]*\./gi, '')
      .replace(/Current price is:/gi, '')
      .replace(/руб\./gi, '₸')
      .trim();

    const tengeParts = compact.match(/\d[\d\s]*\s*₸/g);
    if (tengeParts?.length) return tengeParts[tengeParts.length - 1].replace(/\s+/g, ' ').trim();

    return compact;
  }

  function roundKzt(value) {
    return Math.ceil((value * 6.1 - 880) / 1000) * 1000 + 880;
  }

  function numericPrice(value) {
    const match = cleanPrice(value).match(/\d[\d\s]*/);
    return match ? Number(match[0].replace(/\s/g, '')) : 0;
  }

  function formatKzt(value) {
    return new Intl.NumberFormat('ru-KZ').format(value) + ' ₸';
  }

  function priceFromRub(value) {
    const rub = Number(String(value || '').replace(/[^\d.]/g, ''));
    return rub ? formatKzt(roundKzt(rub)) : '';
  }

  function priceFromRubText(value) {
    const values = String(value || '')
      .match(/\d[\d\s\u00a0]*/g)
      ?.map((part) => Number(part.replace(/\D/g, '')))
      .filter((part) => part > 0 && part <= 10000000) || [];

    return values.length ? priceFromRub(values[values.length - 1]) : '';
  }

  function article(item) {
    return item.sku || item.article || item.variationId || item.variation_id || item.id || '';
  }

  function cleanColorName(value) {
    return String(value || '')
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanProductTitle(value) {
    return String(value || '')
      .replace(/\s+[a-z0-9-]+-p(\s+\([^)]*\))?\s*$/i, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function titleWithColor(title, color) {
    title = cleanProductTitle(title);
    const cleanColor = cleanColorName(color);
    if (!cleanColor || new RegExp('\\(' + cleanColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'i').test(title)) return title;
    return title + ' (' + cleanColor + ')';
  }

  function colorCodeFromHref(href) {
    try {
      return new URL(href, window.location.href).searchParams.get('attribute_pa_color') || '';
    } catch (error) {
      return '';
    }
  }

  function slugFromHref(href) {
    try {
      const match = new URL(href, window.location.href).pathname.match(/\/product\/([^/]+)/);
      return match ? match[1] : '';
    } catch (error) {
      return '';
    }
  }

  function isDiscontinuedSlugColor(slug, colorCode) {
    const colors = DISCONTINUED_BY_SLUG_COLOR[slug] || [];
    return colors.includes(String(colorCode || '').toLowerCase());
  }

  function isDiscontinuedFavorite(item) {
    const sku = String(article(item)).trim();
    const slug = item?.slug || slugFromHref(item?.href) || '';
    const colorCode = String(item?.colorCode || colorCodeFromHref(item?.href) || '').toLowerCase();
    return DISCONTINUED_SKUS.has(sku) || isDiscontinuedSlugColor(slug, colorCode);
  }

  function favoriteKey(slug, value) {
    return (slug || 'product') + '-' + String(value || 'default').toLowerCase().replace(/[^a-z0-9а-яё-]+/gi, '-');
  }

  function parseDetails(html, colorCode) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const details = { sku: '', color: '', price: '' };
    const select = doc.querySelector('select[name="attribute_pa_color"]');

    if (select && colorCode) {
      const option = [...select.options].find((item) => item.value === colorCode);
      details.color = cleanColorName(option?.textContent || '');
    }

    const rawVariations = doc.querySelector('form.variations_form[data-product_variations]')?.getAttribute('data-product_variations');
    if (rawVariations) {
      try {
        const slug = slugFromHref(doc.querySelector('link[rel="canonical"]')?.href || '');
        const variations = JSON.parse(rawVariations).filter((item) => {
          const sku = String(item?.sku || '').trim();
          const itemColor = item?.attributes?.attribute_pa_color || '';
          return !DISCONTINUED_SKUS.has(sku) && !isDiscontinuedSlugColor(slug, itemColor);
        });
        const variation = variations.find((item) => item.attributes?.attribute_pa_color === colorCode) || variations[0];
        details.sku = variation?.sku || '';
        details.price = priceFromRub(variation?.display_price) || priceFromRubText(variation?.price_html);
      } catch (error) {}
    }

    if (!details.price) {
      const priceNode = doc.querySelector('.summary .rrc, .summary .price, .entry-summary .price, .woocommerce-variation-price');
      details.price = priceFromRubText(priceNode?.textContent);
    }

    if (!details.sku || !details.price) {
      for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(script.textContent);
          if (data?.sku) {
            details.sku = data.sku;
          }
          const offers = Array.isArray(data?.offers) ? data.offers : data?.offers ? [data.offers] : [];
          const offerPrice = offers.map((offer) => offer?.price || offer?.lowPrice).find(Boolean);
          details.price = details.price || priceFromRub(offerPrice);
          if (details.sku && details.price) break;
        } catch (error) {}
      }
    }

    return details;
  }

  async function fetchDetails(item) {
    if (!item.href) return { sku: '', color: '' };

    const colorCode = item.colorCode || colorCodeFromHref(item.href);
    const key = item.href + '|' + colorCode;
    if (detailsCache.has(key)) return detailsCache.get(key);

    const promise = fetch(new URL(item.href, window.location.href), { credentials: 'same-origin' })
      .then((response) => response.ok ? response.text() : '')
      .then((html) => html ? parseDetails(html, colorCode) : { sku: '', color: '' })
      .catch(() => ({ sku: '', color: '' }));

    detailsCache.set(key, promise);
    return promise;
  }

  async function repairFavorites(items) {
    const repaired = await Promise.all(items.map(async (item) => {
      const currentArticle = article(item);
      const shortArticle = /^\d{1,5}$/.test(String(currentArticle));
      const missingColor = !item.color && !/\([^)]{2,}\)/.test(item.title || '');
      const missingPrice = !numericPrice(item.price);
      const slug = slugFromHref(item.href) || item.slug || '';
      const legacyId = slug && currentArticle && item.id !== favoriteKey(slug, currentArticle);
      const messyTitle = cleanProductTitle(item.title) !== String(item.title || '').replace(/\s+/g, ' ').trim();

      if (!shortArticle && !missingColor && !missingPrice && !legacyId && !messyTitle) return item;

      const details = await fetchDetails(item);
      const color = cleanColorName(item.color || details.color || colorNames[colorCodeFromHref(item.href)] || '');
      const sku = details.sku || item.sku || item.article;
      return {
        ...item,
        id: favoriteKey(slug || item.title, sku || item.variationId || item.colorCode || color || item.id),
        article: sku || item.article,
        sku: sku || item.sku,
        color,
        price: cleanPrice(item.price) || details.price,
        title: titleWithColor(item.title, color)
      };
    }));

    if (JSON.stringify(repaired) !== JSON.stringify(items)) {
      writeFavorites(repaired);
      render();
    }
  }

  function updateFavoritesCount(items) {
    document.querySelectorAll('#favorites-count, [data-favorites-count]').forEach((node) => {
      node.textContent = String(items.length);
      node.toggleAttribute('data-count-zero', items.length === 0);
      node.style.display = '';
    });
  }

  function render() {
    const items = readFavorites();
    tableBody.innerHTML = '';
    empty.classList.toggle('is-visible', items.length === 0);
    clearButton.style.display = items.length ? 'inline-flex' : 'none';
    updateFavoritesCount(items);

    items.forEach((item) => {
      const row = document.createElement('tr');
      row.innerHTML = [
        '<td><img src="' + escapeHtml(item.image) + '" alt=""></td>',
        '<td><a href="' + escapeHtml(item.href) + '">' + escapeHtml(item.title) + '</a></td>',
        '<td>' + escapeHtml(article(item)) + '</td>',
        '<td>' + escapeHtml(cleanPrice(item.price)) + '</td>',
        '<td><button class="remove-from-favorites" type="button" aria-label="Убрать из избранного"></button></td>'
      ].join('');

      row.querySelector('.remove-from-favorites').addEventListener('click', () => {
        writeFavorites(readFavorites().filter((favorite) => favorite.id !== item.id));
        render();
      });

      tableBody.appendChild(row);
    });

    const total = items.reduce((sum, item) => sum + numericPrice(item.price), 0);
    printTotal.textContent = total ? 'Итого: ' + formatKzt(total) : '';

    if (shareLinkText) {
      shareLinkText.textContent = window.location.href.split('?')[0];
    }

    repairFavorites(items);
  }

  function exportExcel() {
    const items = readFavorites();
    const rows = [['фото', 'наименование', 'артикул', 'цена']].concat(items.map((item) => [
      item.image || '',
      item.title || '',
      article(item),
      cleanPrice(item.price)
    ]));

    const csv = rows
      .map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(';'))
      .join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'omoikiri_favorites.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  pdfButton.addEventListener('click', () => window.print());
  excelButton.addEventListener('click', exportExcel);
  clearButton.addEventListener('click', () => {
    writeFavorites([]);
    render();
  });

  copyShareLink.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(shareLinkText.textContent);
    } catch (error) {}
  });

  render();
})();
