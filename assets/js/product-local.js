(function () {
  const CART_KEY = 'omoikiriCart';
  const FAVORITES_KEY = 'omoikiri:favorites';
  const CATALOG_RETURN_PREFIX = 'omoikiri:catalog-return:';
  const PRODUCT_CATALOGS = ['sinks', 'bathsinks', 'taps', 'filters', 'disposers', 'dispenser', 'acs', 'omoikiri-home'];
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
  let applyingRequestedColor = false;
  let userChangedColor = false;
  const lastSelectedAttributes = {};

  function roundKzt(value) {
    return Math.ceil((value * 6.1 - 880) / 1000) * 1000 + 880;
  }

  function formatKzt(value) {
    return new Intl.NumberFormat('ru-KZ').format(value) + ' \u20b8';
  }

  function numeric(text) {
    return Number(String(text || '').replace(/\D/g, ''));
  }

  function productSlug() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
    try {
      const parts = new URL(canonical, window.location.href).pathname.split('/').filter(Boolean);
      const index = parts.indexOf('product');
      return index >= 0 ? parts[index + 1] : parts.pop();
    } catch (error) {
      return window.location.pathname.split('/').filter(Boolean).slice(-2, -1)[0] || 'product';
    }
  }

  function productCatalogKey() {
    const classText = [
      document.body.className || '',
      document.querySelector('.entry.product, .product')?.className || '',
      document.querySelector('.desc_info')?.className || ''
    ].join(' ');

    if (/\bproduct_cat-sinks\b|\bbread_sinks\b|\bdesc_info\s+sinks\b/i.test(classText)) return 'sinks';
    if (/\bproduct_cat-bathsinks\b/i.test(classText)) return 'bathsinks';
    if (/\bproduct_cat-taps\b/i.test(classText)) return 'taps';
    if (/\bproduct_cat-filters\b/i.test(classText)) return 'filters';
    if (/\bproduct_cat-disposers\b|\bdesc_info\s+disposers\b/i.test(classText)) return 'disposers';
    if (/\bproduct_cat-dispenser\b/i.test(classText)) return 'dispenser';
    if (/\bproduct_cat-acs\b|\bproduct_cat-accessories\b/i.test(classText)) return 'acs';
    if (/\bproduct_cat-omoikiri-home\b/i.test(classText)) return 'omoikiri-home';

    const categoryLink = document.querySelector('.bread a[href*="/sinks"], .bread a[href*="/taps"], .bread a[href*="/bathsinks"], .bread a[href*="/filters"], .bread a[href*="/disposers"], .bread a[href*="/dispenser"], .bread a[href*="/acs"], .bread a[href*="/omoikiri-home"]');
    if (categoryLink) {
      const path = categoryLink.getAttribute('href') || '';
      return PRODUCT_CATALOGS.find((key) => path.includes('/' + key)) || '';
    }

    return '';
  }

  function cleanCatalogReturnHref(key, value) {
    if (!key || !value) return '';

    try {
      const url = new URL(value, window.location.origin);
      if (!url.pathname.includes('/' + key)) return '';
      return url.pathname + url.search;
    } catch (error) {
      return '';
    }
  }

  function storedCatalogReturnHref(key) {
    try {
      const referrer = new URL(document.referrer || '', window.location.href);
      if (referrer.origin === window.location.origin && referrer.pathname.includes('/' + key) && referrer.search) {
        return referrer.pathname + referrer.search;
      }
    } catch (error) {}

    for (const storage of [window.sessionStorage, window.localStorage]) {
      try {
        const href = cleanCatalogReturnHref(key, storage?.getItem(CATALOG_RETURN_PREFIX + key));
        if (href) return href;
      } catch (error) {}
    }

    return '';
  }

  function restoreCatalogBreadcrumbLinks() {
    const key = productCatalogKey();
    const href = storedCatalogReturnHref(key);
    if (!key || !href) return;

    document.querySelectorAll(`a[href="/${key}"], a[href="/${key}/"], a[href="/${key}/index.html"]`).forEach((link) => {
      link.setAttribute('href', href);
    });
  }

  function addStyle() {
    if (document.getElementById('dealer-local-product-style')) return;

    const root = new URL(document.currentScript?.getAttribute('src') || '../assets/js/product-local.js', window.location.href);
    const assetRoot = new URL('../', root).href;
    const style = document.createElement('style');
    style.id = 'dealer-local-product-style';
    style.textContent = `
      @font-face {
        font-family: "GothamProRegular";
        src: url("${assetRoot}fonts/GothamProRegular.woff") format("woff");
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "GothamProMedium";
        src: url("${assetRoot}fonts/GothamProMedium.woff") format("woff");
        font-weight: 500;
        font-style: normal;
        font-display: swap;
      }

      @font-face {
        font-family: "GothamProBold";
        src: url("${assetRoot}fonts/GothamProBold.woff") format("woff");
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }

      body.single-product,
      body.single-product .card_info,
      body.single-product .add_info,
      body.single-product .summary {
        font-family: "GothamProRegular", Arial, Helvetica, sans-serif !important;
        letter-spacing: 0 !important;
      }

      body.single-product .woocommerce-breadcrumb,
      body.single-product .breadcrumbs,
      body.single-product .card_breadcrumbs,
      body.single-product .breadcrumb,
      body.single-product .bread,
      body.single-product .bread span,
      body.single-product .breadcrumb_last,
      body.single-product .product_meta,
      body.single-product .product_meta a {
        font-family: "GothamProMedium", Arial, Helvetica, sans-serif !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        line-height: 1.35 !important;
        letter-spacing: 0 !important;
      }

      body.single-product .woocommerce-breadcrumb a,
      body.single-product .breadcrumbs a,
      body.single-product .card_breadcrumbs a,
      body.single-product .breadcrumb a,
      body.single-product .bread a {
        font-family: "GothamProBold", Arial, Helvetica, sans-serif !important;
        font-weight: 700 !important;
        text-decoration: underline !important;
        text-decoration-thickness: 1px !important;
        text-underline-offset: 2px !important;
      }

      body.single-product .sku,
      body.single-product .dealer-product-sku {
        display: block !important;
        margin: 3px 0 16px !important;
        color: #202020 !important;
        font-family: "GothamProRegular", Arial, Helvetica, sans-serif !important;
        font-size: 17px !important;
        font-weight: 400 !important;
        line-height: 1.25 !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
      }

      body.single-product .card_actions .pin,
      body.single-product .card_actions .pin a,
      body.single-product .card_actions .pin span {
        font-family: "GothamProMedium", Arial, Helvetica, sans-serif !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        line-height: 1.2 !important;
        letter-spacing: 0 !important;
        color: #111 !important;
      }

      body.single-product .card_actions .pin a span {
        border-bottom: 1px solid currentColor !important;
        text-decoration: none !important;
      }

      body.single-product .add_info .dimensions h3 {
        font-family: "GothamProBold", Arial, Helvetica, sans-serif !important;
        font-size: 18px !important;
        line-height: 1.25 !important;
        font-weight: 700 !important;
        letter-spacing: 0 !important;
        text-transform: uppercase !important;
      }

      body.single-product .add_info .dimensions_text,
      body.single-product .add_info .dimensions_text span {
        font-family: "GothamProMedium", Arial, Helvetica, sans-serif !important;
        font-size: 16px !important;
        line-height: 1.45 !important;
        font-weight: 500 !important;
        letter-spacing: 0 !important;
      }

      body.single-product .add_info .dimensions_text span span:first-child,
      body.single-product .add_info .dimensions_text > span:first-child,
      body.single-product .add_info .dimensions_text .bowl {
        font-family: "GothamProMedium", Arial, Helvetica, sans-serif !important;
      }

      body.single-product .add_info .dimensions_text .bowl_size {
        font-family: "GothamProBold", Arial, Helvetica, sans-serif !important;
        font-size: 30px !important;
        line-height: 1 !important;
        font-style: normal !important;
        font-weight: 700 !important;
      }

      .dealer-local-cart-tab {
        position: fixed;
        z-index: 100000;
        right: 177px;
        top: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border: 0;
        border-radius: 0;
        background: transparent;
        color: #111;
        box-shadow: none;
        backdrop-filter: none;
      }

      .dealer-local-cart-tab svg {
        width: 30px;
        height: 30px;
        display: block;
        stroke-width: 2.05;
        transform: translateY(0);
      }

      @media (max-width: 900px) {
        .dealer-local-cart-tab {
          display: none !important;
        }
      }

      .dealer-local-toast {
        position: fixed;
        z-index: 100000;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        padding: 12px 18px;
        border-radius: 999px;
        background: #111;
        color: #fff;
        font: 700 13px/1.2 Arial, sans-serif;
        opacity: 0;
        pointer-events: none;
        transition: opacity .2s ease;
      }

      .dealer-local-toast.is-visible {
        opacity: 1;
      }

      #add-to-favorites {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 34px !important;
        width: 34px !important;
        height: 34px !important;
        border: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        color: #111 !important;
        cursor: pointer !important;
        font-size: 0 !important;
        line-height: 0 !important;
        overflow: hidden !important;
        vertical-align: middle !important;
      }

      #add-to-favorites svg {
        width: 32px !important;
        height: 32px !important;
        display: block !important;
        stroke: currentColor !important;
        stroke-width: 1.7 !important;
        fill: transparent !important;
      }

      #add-to-favorites.dealer-favorite-active svg {
        fill: currentColor !important;
      }

      .card_actions {
        display: flex !important;
        align-items: center !important;
        flex-wrap: nowrap !important;
        gap: 22px !important;
      }

      .card_actions .rrc {
        flex: 0 0 auto !important;
      }

      .card_actions .fav_button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: flex-start !important;
        flex: 0 0 auto !important;
        gap: 8px !important;
        white-space: nowrap !important;
        line-height: 1 !important;
        cursor: pointer !important;
        user-select: none !important;
      }

      .card_actions .fav_button > :not(#add-to-favorites):not(.dealer-favorite-label) {
        display: none !important;
      }

      .card_actions .fav_button #add-to-favorites,
      .card_actions .fav_button .dealer-favorite-label,
      .card_actions .fav_button #add-to-favorites svg {
        pointer-events: none !important;
      }

      .dealer-favorite-label {
        display: inline-flex !important;
        align-items: center !important;
        flex: 0 0 auto !important;
        margin-left: 0 !important;
        color: #111 !important;
        font: 700 14px/1.2 Arial, sans-serif !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
      }

      .card_actions .pin {
        flex: 0 0 auto !important;
        white-space: nowrap !important;
      }

      @media (max-width: 700px) {
        html,
        body,
        body.single-product,
        body.single-product .site,
        body.single-product .default,
        body.single-product .product,
        body.single-product .product_card,
        body.single-product .card_grid,
        body.single-product .card_grid_half,
        body.single-product .card_info,
        body.single-product .summary {
          max-width: 100% !important;
          overflow-x: hidden !important;
          box-sizing: border-box !important;
        }

        body.single-product .card_info {
          padding-left: 26px !important;
          padding-right: 26px !important;
        }

        body.single-product .prod_image,
        body.single-product .prod_image img,
        body.single-product .second_image_cont,
        body.single-product .second_image,
        body.single-product .second_image img,
        body.single-product .add_info,
        body.single-product .add_info img {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }

        body.single-product .card_title h1,
        body.single-product .prod_title {
          max-width: 100% !important;
          overflow-wrap: anywhere !important;
          word-break: normal !important;
        }

        body.single-product .card_actions {
          width: 100% !important;
          max-width: 100% !important;
          flex-wrap: wrap !important;
          gap: 14px 18px !important;
          align-items: center !important;
          overflow: visible !important;
        }

        body.single-product .card_actions .rrc {
          max-width: 100% !important;
          flex: 0 1 auto !important;
        }

        body.single-product .card_actions .fav_button,
        body.single-product .card_actions .pin {
          flex: 0 1 auto !important;
          min-width: 0 !important;
        }

        body.single-product .dealer-favorite-label,
        body.single-product .card_actions .pin a,
        body.single-product .card_actions .pin span {
          white-space: nowrap !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addCartLink() {
    if (document.querySelector('.dealer-local-cart-tab')) return;

    const link = document.createElement('a');
    link.className = 'dealer-local-cart-tab';
    link.href = '../../cart.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'Корзина');
    link.title = 'Корзина';
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 5h2.1l1.8 10.2a2 2 0 0 0 2 1.65h7.35a2 2 0 0 0 1.94-1.5L20.2 8H7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.15h.01M17 20.15h.01" stroke="currentColor" stroke-width="3.1" stroke-linecap="round"/></svg>';
    document.body.appendChild(link);
  }

  function convertAmount(amount) {
    const original = amount.dataset.originalRub || amount.textContent;
    if (amount.dataset.kztDone === '1' && amount.textContent.includes('\u20b8')) return;

    const raw = numeric(original);
    if (!raw || raw > 10000000) return;

    amount.dataset.originalRub = String(raw);
    amount.dataset.kztDone = '1';
    amount.textContent = formatKzt(roundKzt(raw));
  }

  function textWithoutRegularPrice(node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('.regular-price').forEach((regular) => regular.remove());
    return clone.textContent;
  }

  function convertRrc(root) {
    (root || document).querySelectorAll('.rrc').forEach((node) => {
      if (node.dataset.kztDone === '1' && node.textContent.includes('\u20b8')) return;

      const saleNode = node.querySelector('.sale-price');
      const regularNode = node.querySelector('.regular-price');
      const regular = numeric(regularNode?.textContent);
      const sale = numeric(saleNode ? textWithoutRegularPrice(saleNode) : node.textContent);

      if (!regular && !sale) return;

      node.dataset.kztDone = '1';

      if (regular && sale && regular !== sale) {
        node.innerHTML = '<span class="sale-price"><span class="regular-price" style="text-decoration: line-through;">' +
          formatKzt(roundKzt(regular)) + '</span> ' + formatKzt(roundKzt(sale)) + '</span>';
      } else {
        node.textContent = formatKzt(roundKzt(sale || regular));
      }
    });
  }

  function convertPrices(root) {
    (root || document).querySelectorAll('.woocommerce-Price-amount.amount').forEach(convertAmount);
    convertRrc(root);
    (root || document).querySelectorAll('.screen-reader-text').forEach((node) => {
      if (/[₽\u20bd]/.test(node.textContent)) node.setAttribute('aria-hidden', 'true');
    });
  }

  function updateVariationPriceDisplay() {
    const variation = variationData();
    const priceBox = document.querySelector('.woocommerce-variation-price');
    if (!variation || !priceBox) return;

    const sale = Number(variation.display_price || 0);
    const regular = Number(variation.display_regular_price || sale || 0);
    if (!sale && !regular) return;

    const saleKzt = formatKzt(roundKzt(sale || regular));
    const regularKzt = formatKzt(roundKzt(regular));
    let html = '';
    if (regular && sale && regular !== sale) {
      html = '<span class="price"><del><span class="woocommerce-Price-amount amount"><bdi>' +
        regularKzt + '</bdi></span></del> <ins><span class="woocommerce-Price-amount amount"><bdi>' +
        saleKzt + '</bdi></span></ins></span>';
    } else {
      html = '<span class="price"><span class="woocommerce-Price-amount amount"><bdi>' +
        saleKzt + '</bdi></span></span>';
    }

    if (priceBox.innerHTML === html) return;
    priceBox.innerHTML = html;

    priceBox.querySelectorAll('.woocommerce-Price-amount.amount').forEach((node) => {
      node.dataset.kztDone = '1';
    });
  }

  function visiblePrice() {
    const candidates = [
      '.card_actions .rrc',
      '.summary .rrc',
      '.summary .price ins .woocommerce-Price-amount',
      '.summary .price .woocommerce-Price-amount',
      '.entry-summary .woocommerce-Price-amount',
      '.woocommerce-variation-price .woocommerce-Price-amount',
      '.rrc'
    ];

    for (const selector of candidates) {
      const node = document.querySelector(selector);
      const value = numeric(node?.textContent);
      if (value) return value;
    }

    return 0;
  }

  function variationPrice() {
    const price = Number(variationData()?.display_price || 0);
    return price ? roundKzt(price) : 0;
  }

  function productImage() {
    return document.querySelector('.prod_image img, .woocommerce-product-gallery img, .rtwpvg-single-image-container img, .product img')?.currentSrc ||
      document.querySelector('.prod_image img, .woocommerce-product-gallery img, .rtwpvg-single-image-container img, .product img')?.src ||
      '';
  }

  function selectedColor() {
    const select = document.querySelector('select[name="attribute_pa_color"]');
    if (select && select.selectedIndex >= 0 && select.value) return select.options[select.selectedIndex]?.textContent.trim() || '';

    const active = document.querySelector('.thwvsf-selected, .selected, .rtwpvg-selected');
    return active?.textContent.trim() || active?.getAttribute('title') || '';
  }

  function selectedColorCode() {
    const active = document.querySelector('.thwvs-selected[data-value], .thwvsf-selected[data-value], .selected[data-value], .rtwpvg-selected[data-value]');
    return active?.getAttribute('data-value') ||
      document.querySelector('select[name="attribute_pa_color"]')?.value ||
      new URL(window.location.href).searchParams.get('attribute_pa_color') ||
      '';
  }

  function requestedColorCode() {
    try {
      return new URL(window.location.href).searchParams.get('attribute_pa_color') || '';
    } catch (error) {
      return '';
    }
  }

  function requestedAttributes() {
    const attributes = {};
    try {
      const params = new URL(window.location.href).searchParams;
      params.forEach((value, key) => {
        if (key.startsWith('attribute_') && value) attributes[key] = value;
      });
    } catch (error) {}
    return attributes;
  }

  function selectedAttributes() {
    const attributes = requestedAttributes();

    document.querySelectorAll('select[name^="attribute_"]').forEach((select) => {
      if (select.value) attributes[select.name] = select.value;
    });

    document.querySelectorAll('[data-attribute_name][data-value].thwvs-selected, [data-attribute_name][data-value].thwvsf-selected, [data-attribute_name][data-value].selected, [data-attribute_name][data-value].rtwpvg-selected').forEach((node) => {
      const name = node.getAttribute('data-attribute_name');
      const value = node.getAttribute('data-value');
      if (name && value) attributes[name] = value;
    });

    Object.entries(lastSelectedAttributes).forEach(([name, value]) => {
      if (name && value) attributes[name] = value;
    });

    return attributes;
  }

  function primaryAttributeValue() {
    const attributes = selectedAttributes();
    return attributes.attribute_pa_color || Object.values(attributes)[0] || '';
  }

  function isDiscontinuedSlugColor(slug, colorCode) {
    const colors = DISCONTINUED_BY_SLUG_COLOR[slug] || [];
    return colors.includes(String(colorCode || '').toLowerCase());
  }

  function isDiscontinuedVariation(variation, slug = productSlug()) {
    const sku = String(variation?.sku || '').trim();
    const colorCode = String(variation?.attributes?.attribute_pa_color || '').toLowerCase();
    return DISCONTINUED_SKUS.has(sku) || isDiscontinuedSlugColor(slug, colorCode);
  }

  function availableVariations() {
    const form = document.querySelector('form.variations_form[data-product_variations]');
    const raw = form?.getAttribute('data-product_variations');
    if (!raw) return [];

    try {
      const slug = productSlug();
      return JSON.parse(raw).filter((variation) => !isDiscontinuedVariation(variation, slug));
    } catch (error) {
      return [];
    }
  }

  function updateProductUrlColor(colorCode) {
    if (!colorCode) return;

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('attribute_pa_color', colorCode);
      window.history.replaceState(null, document.title, url.href);
    } catch (error) {}
  }

  function chooseAvailableColor() {
    const variations = availableVariations();
    return variations[0]?.attributes?.attribute_pa_color || '';
  }

  function removeDiscontinuedVariants() {
    const form = document.querySelector('form.variations_form[data-product_variations]');
    const raw = form?.getAttribute('data-product_variations');
    if (!raw) return;

    let variations = [];
    let removedColors = new Set();
    const currentBeforeCleanup = requestedColorCode() || selectedColorCode();

    try {
      const slug = productSlug();
      variations = JSON.parse(raw);
      const available = variations.filter((variation) => {
        const discontinued = isDiscontinuedVariation(variation, slug);
        if (discontinued) {
          const colorCode = variation.attributes?.attribute_pa_color;
          if (colorCode) removedColors.add(colorCode);
        }
        return !discontinued;
      });
      form.setAttribute('data-product_variations', JSON.stringify(available));
      variations = available;
    } catch (error) {
      return;
    }

    const slug = productSlug();
    (DISCONTINUED_BY_SLUG_COLOR[slug] || []).forEach((colorCode) => removedColors.add(colorCode));

    removedColors.forEach((colorCode) => {
      document.querySelectorAll(
        'select[name="attribute_pa_color"] option[value="' + CSS.escape(colorCode) + '"], ' +
        '[data-attribute_name="attribute_pa_color"][data-value="' + CSS.escape(colorCode) + '"], ' +
        '.attribute_pa_color[data-value="' + CSS.escape(colorCode) + '"]'
      ).forEach((node) => node.remove());
    });

    const current = currentBeforeCleanup || requestedColorCode() || selectedColorCode();
    if (current && (removedColors.has(current) || isDiscontinuedSlugColor(slug, current))) {
      const replacement = variations[0]?.attributes?.attribute_pa_color || '';
      if (replacement) {
        updateProductUrlColor(replacement);
        applyRequestedColor();
      }
    }

    if (!variations.length) {
      document.body.classList.add('dealer-product-discontinued');
      document.querySelectorAll('form.cart, .card_actions, .summary .price, .summary .rrc').forEach((node) => {
        node.style.display = 'none';
      });
    }
  }

  function applyRequestedColor() {
    if (userChangedColor) return;
    const requested = requestedAttributes();
    let colorCode = requested.attribute_pa_color || '';
    if (colorCode && isDiscontinuedSlugColor(productSlug(), colorCode)) {
      colorCode = chooseAvailableColor();
      updateProductUrlColor(colorCode);
      requested.attribute_pa_color = colorCode;
    }
    if (!Object.keys(requested).length) return;

    applyingRequestedColor = true;
    try {
      Object.entries(requested).forEach(([attributeName, attributeValue]) => {
        const select = document.querySelector('select[name="' + CSS.escape(attributeName) + '"]');
        const swatch = document.querySelector('[data-attribute_name="' + CSS.escape(attributeName) + '"][data-value="' + CSS.escape(attributeValue) + '"], .' + CSS.escape(attributeName) + '[data-value="' + CSS.escape(attributeValue) + '"]');

        if (select && select.value !== attributeValue && [...select.options].some((option) => option.value === attributeValue)) {
          select.value = attributeValue;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          if (window.jQuery) window.jQuery(select).trigger('change');
        }

        if (swatch && !swatch.classList.contains('thwvs-selected')) {
          swatch.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
      });
    } finally {
      applyingRequestedColor = false;
    }
  }

  function applyClickedAttribute(target) {
    const swatch = target.closest('[data-attribute_name][data-value], .attribute_pa_color[data-value]');
    if (!swatch) return;

    const attributeName = swatch.getAttribute('data-attribute_name') ||
      (swatch.classList.contains('attribute_pa_color') ? 'attribute_pa_color' : '');
    const attributeValue = swatch.getAttribute('data-value') || '';
    if (!attributeName || !attributeValue) return;
    lastSelectedAttributes[attributeName] = attributeValue;

    const select = document.querySelector('select[name="' + CSS.escape(attributeName) + '"]');
    if (select && [...select.options].some((option) => option.value === attributeValue)) {
      select.value = attributeValue;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) window.jQuery(select).trigger('change');
    }

    document.querySelectorAll('[data-attribute_name="' + CSS.escape(attributeName) + '"], .' + CSS.escape(attributeName) + '[data-value]').forEach((node) => {
      const selected = node.getAttribute('data-value') === attributeValue;
      node.classList.toggle('thwvs-selected', selected);
      node.classList.toggle('selected', selected);
      node.classList.toggle('rtwpvg-selected', selected);
    });

    if (attributeName === 'attribute_pa_color') updateProductUrlColor(attributeValue);
  }

  function cleanColorName(value) {
    return String(value || '')
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanProductTitle(value) {
    return String(value || '')
      .replace(/\s+[a-z0-9-]+-p\s*$/i, '')
      .replace(/\s+(?=[a-z0-9]*[a-z])[a-z0-9]{1,4}\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function selectedColorDisplayCode() {
    const code = selectedColorCode() || variationData()?.attributes?.attribute_pa_color || '';
    if (!/^[a-z0-9-]{1,8}$/i.test(code)) return '';
    return code.toUpperCase();
  }

  function isTapProduct() {
    return Boolean(document.querySelector('.product_cat-taps, .entry.product_cat-taps'));
  }

  const TAP_PAINTED_SUFFIX_SLUGS = new Set([
    'nagano',
    'nagano-pure-drop-lite',
    'nakagawa',
    'shinagawa',
    'yamada'
  ]);

  function tapUsesPaintedSuffix() {
    return isTapProduct() && TAP_PAINTED_SUFFIX_SLUGS.has(productSlug());
  }

  function isDisposerProduct() {
    return Boolean(
      document.querySelector('.product_cat-disposers, .entry.product_cat-disposers, .desc_info.disposers') ||
      /\/product\/nagare(?:-|\/)/i.test(window.location.pathname)
    );
  }

  function productDisplayTitle(value) {
    const title = cleanProductTitle(value);
    if (isDisposerProduct()) return title;
    const code = selectedColorDisplayCode();
    const suffix = code ? code + (tapUsesPaintedSuffix() ? '-P' : '') : '';
    if (!suffix || new RegExp('\\s' + suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i').test(title)) return title;
    return title + ' ' + suffix;
  }

  function normalizeTitleAndButtons() {
    document.querySelectorAll('.current_color, .painted').forEach((node) => {
      node.textContent = '';
      node.style.display = 'none';
    });

    document.querySelectorAll('.prod_title, h1.product_title').forEach((node) => {
      const displayTitle = productDisplayTitle(node.textContent);
      if (displayTitle && node.textContent.trim() !== displayTitle) {
        node.textContent = displayTitle;
      }
    });

    document.querySelectorAll('.single_add_to_cart_button, button[name="add-to-cart"]').forEach((button) => {
      const text = button.textContent.trim();
      if (/^(add to cart|select options|choose an option|no combination)$/i.test(text)) {
        button.textContent = 'В корзину';
      }
    });

    document.querySelectorAll('select[name^="attribute_"] option').forEach((option) => {
      if (/^choose an option$/i.test(option.textContent.trim())) option.textContent = 'Выберите вариант';
    });

    if (window.thwvs_public_var) {
      Object.assign(window.thwvs_public_var, {
        add_to_cart_text: 'В корзину',
        select_option_text: 'Выберите вариант',
        choose_option_text: 'Выберите вариант',
        no_combination_text: 'Нет сочетания'
      });
    }
  }

  function titleWithColor(title, color) {
    title = cleanProductTitle(title);
    const cleanColor = cleanColorName(color);
    if (!cleanColor || new RegExp('\\(' + cleanColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'i').test(title)) return title;
    return title + ' (' + cleanColor + ')';
  }

  function variationData() {
    const form = document.querySelector('form.variations_form[data-product_variations]');
    const raw = form?.getAttribute('data-product_variations');
    if (!raw) return null;

    try {
      const slug = productSlug();
      const variations = JSON.parse(raw).filter((variation) => !isDiscontinuedVariation(variation, slug));
      const attributes = selectedAttributes();
      const requested = requestedAttributes();
      const matches = (variation, expected) => Object.entries(expected)
        .every(([name, value]) => !value || variation.attributes?.[name] === value);

      return variations.find((variation) => matches(variation, attributes)) ||
        variations.find((variation) => matches(variation, requested)) ||
        variations[0] ||
        null;
    } catch (error) {
      return null;
    }
  }

  function variationImage(variation) {
    return variation?.image?.full_src ||
      variation?.image?.url ||
      variation?.image?.src ||
      variation?.variation_gallery_images?.[0]?.full_src ||
      variation?.variation_gallery_images?.[0]?.url ||
      variation?.variation_gallery_images?.[0]?.src ||
      '';
  }

  function renderProductImage() {
    const container = document.querySelector('.prod_image');
    if (!container) return;

    const variation = variationData();
    const image = variationImage(variation);
    if (!image) return;

    const current = container.querySelector('img');
    if (current && current.src === image) return;

    container.innerHTML = '';
    const img = document.createElement('img');
    img.src = image;
    img.alt = variation?.image?.alt || variation?.image?.title || document.querySelector('.prod_title, h1')?.textContent.trim() || '';
    img.loading = 'eager';
    img.decoding = 'async';
    container.appendChild(img);
  }

  function currentVariationId() {
    const inputValue = document.querySelector('input.variation_id')?.value;
    if (inputValue && inputValue !== '0') return inputValue;
    return variationData()?.variation_id || '';
  }

  function productSku() {
    const visibleSku = document.querySelector('.sku')?.textContent.replace(/^арт\.\s*/i, '').trim();

    const variationSku = variationData()?.sku;
    if (variationSku) return variationSku;

    if (visibleSku && /^\d{6,}$/.test(visibleSku) && !DISCONTINUED_SKUS.has(visibleSku)) return visibleSku;

    for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(script.textContent);
        if (data?.sku) return data.sku;
      } catch (error) {}
    }

    return '';
  }

  function renderProductSku() {
    const title = document.querySelector('.prod_title, h1.product_title');
    if (!title) return;

    let node = document.querySelector('.sku, .dealer-product-sku');
    if (!node) {
      node = document.createElement('p');
      node.className = 'sku dealer-product-sku';
      title.insertAdjacentElement('afterend', node);
    } else if (!node.classList.contains('dealer-product-sku')) {
      node.classList.add('dealer-product-sku');
    }

    const sku = productSku();
    if (!sku) {
      node.textContent = '';
      node.hidden = true;
      return;
    }

    const text = '\u0430\u0440\u0442. ' + sku;
    if (node.textContent.trim() !== text) node.textContent = text;
    node.hidden = false;
  }

  function currentProductHref() {
    try {
      const url = new URL(window.location.href);
      Object.entries(selectedAttributes()).forEach(([name, value]) => {
        if (value) url.searchParams.set(name, value);
      });
      return url.href;
    } catch (error) {
      return window.location.href;
    }
  }

  function currentProduct() {
    const title = productDisplayTitle(document.querySelector('.product_title, h1')?.textContent.trim() || document.title.replace(' - OMOIKIRI', '').trim());
    const variation = productSku() || currentVariationId() || primaryAttributeValue() || cleanColorName(selectedColor()) || 'default';
    const price = visiblePrice() || variationPrice();

    return {
      id: productSlug() + '-' + String(variation).toLowerCase().replace(/[^a-z0-9а-яё-]+/gi, '-'),
      slug: productSlug(),
      name: title,
      color: selectedColor(),
      price,
      image: productImage(),
      href: window.location.href
    };
  }

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

  function isDiscontinuedFavorite(item) {
    const sku = String(item?.article || '').trim();
    const slug = item?.slug || productSlugFromHref(item?.href) || '';
    const colorCode = String(item?.colorCode || '').toLowerCase();
    return DISCONTINUED_SKUS.has(sku) || isDiscontinuedSlugColor(slug, colorCode);
  }

  function productSlugFromHref(href) {
    if (!href) return '';

    try {
      const parts = new URL(href, window.location.href).pathname.split('/').filter(Boolean);
      const index = parts.indexOf('product');
      return index >= 0 ? parts[index + 1] : '';
    } catch (error) {
      return '';
    }
  }

  function writeFavorites(items) {
    const value = JSON.stringify(items);

    try {
      window.localStorage.setItem(FAVORITES_KEY, value);
    } catch (error) {}

    document.cookie = encodeURIComponent(FAVORITES_KEY) + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
  }

  function favoriteButtonIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.6c-1.5-1.9-4.4-2-6-.4L12 7.7 9.5 5.2c-1.6-1.6-4.5-1.5-6 .4-1.6 2-1.2 4.9.8 6.9l7.1 7.1c.3.3.8.3 1.1 0l7.1-7.1c2-2 2.4-4.9.9-6.9Z"/></svg>';
  }

  function ensureFavoriteMarkup() {
    const button = document.getElementById('add-to-favorites');
    if (!button) return null;

    button.innerHTML = favoriteButtonIcon();

    const wrapper = button.closest('.fav_button');
    if (wrapper) {
      wrapper.setAttribute('role', 'button');
      wrapper.setAttribute('tabindex', '0');
      [...wrapper.childNodes].forEach((node) => {
        if (node === button) return;
        if (node.nodeType === Node.TEXT_NODE) {
          node.remove();
          return;
        }
        if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('dealer-favorite-label')) {
          node.remove();
        }
      });
    }

    let label = wrapper?.querySelector('.dealer-favorite-label') || document.querySelector('.dealer-favorite-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'dealer-favorite-label';
      button.insertAdjacentElement('afterend', label);
    } else if (label.previousElementSibling !== button) {
      button.insertAdjacentElement('afterend', label);
    }

    return label;
  }

  function favoriteId() {
    return currentProduct().id;
  }

  function currentFavorite() {
    const product = currentProduct();
    const title = titleWithColor(product.name, product.color);
    const priceNode = document.querySelector('.card_actions .rrc, .summary .rrc, .summary .price, .entry-summary .price, .rrc');
    const price = cleanFavoritePrice(priceNode) || (product.price ? formatKzt(product.price) : '');

    return {
      id: favoriteId(),
      href: currentProductHref(),
      image: product.image,
      title,
      price,
      article: productSku() || favoriteId(),
      color: cleanColorName(product.color),
      colorCode: selectedColorCode(),
      variationId: currentVariationId(),
      productId: document.getElementById('add-to-favorites')?.dataset.productId || ''
    };
  }

  function cleanFavoritePrice(priceNode) {
    if (!priceNode) return '';

    const sale = priceNode.querySelector('ins .woocommerce-Price-amount, .sale-price');
    if (sale) {
      const clone = sale.cloneNode(true);
      clone.querySelectorAll('.regular-price, .screen-reader-text').forEach((node) => node.remove());
      return clone.textContent.replace(/\s+/g, ' ').trim();
    }

    const amounts = [...priceNode.querySelectorAll('.woocommerce-Price-amount')]
      .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    if (amounts.length > 1) return amounts.join(' – ');
    if (amounts.length) return amounts[0];

    const clone = priceNode.cloneNode(true);
    clone.querySelectorAll('.screen-reader-text').forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function updateFavoritesCount() {
    const count = readFavorites().length;
    document.querySelectorAll('#favorites-count, [data-favorites-count]').forEach((node) => {
      node.textContent = String(count);
      node.toggleAttribute('data-count-zero', count === 0);
    });
    document.querySelectorAll('.favorites-link').forEach((link) => {
      link.href = '../../favorites/index.html';
    });
  }

  function setFavoriteState(active) {
    const button = document.getElementById('add-to-favorites');
    if (!button) return;
    const label = ensureFavoriteMarkup();

    button.classList.toggle('dealer-favorite-active', active);
    button.setAttribute('aria-label', active ? 'Убрать из избранного' : 'Добавить в избранное');
    button.closest('.fav_button')?.setAttribute('aria-label', active ? 'Убрать из избранного' : 'Добавить в избранное');
    button.closest('.fav_button')?.setAttribute('aria-pressed', active ? 'true' : 'false');

    if (label) label.textContent = active ? 'удалить' : 'в избранное';
  }

  function toggleFavorite() {
    const data = currentFavorite();
    const favorites = readFavorites();
    const index = favorites.findIndex((item) => item.id === data.id);

    if (index >= 0) {
      favorites.splice(index, 1);
      setFavoriteState(false);
    } else {
      favorites.push(data);
      setFavoriteState(true);
    }

    writeFavorites(favorites);
    updateFavoritesCount();
  }

  function bindFavorite() {
    const button = document.getElementById('add-to-favorites');
    if (!button) {
      updateFavoritesCount();
      return;
    }

    ensureFavoriteMarkup();

    setFavoriteState(readFavorites().some((item) => item.id === favoriteId()));
    updateFavoritesCount();

    if (document.documentElement.dataset.dealerProductFavoriteBound === '1') return;
    document.documentElement.dataset.dealerProductFavoriteBound = '1';

    document.addEventListener('click', (event) => {
      const target = event.target.closest('.fav_button');
      if (!target) return;
      if (!document.getElementById('add-to-favorites')) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      ensureFavoriteMarkup();
      toggleFavorite();
      window.setTimeout(() => {
        ensureFavoriteMarkup();
        setFavoriteState(readFavorites().some((item) => item.id === favoriteId()));
      }, 0);
    }, true);

    document.addEventListener('keydown', (event) => {
      const target = event.target.closest('.fav_button');
      if (!target || !['Enter', ' '].includes(event.key)) return;
      if (!document.getElementById('add-to-favorites')) return;

      event.preventDefault();
      ensureFavoriteMarkup();
      toggleFavorite();
    }, true);
  }

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch (error) {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function showToast(text) {
    let toast = document.querySelector('.dealer-local-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'dealer-local-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = text;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('is-visible'), 1800);
  }

  function addToCart() {
    const product = currentProduct();
    if (!product.name) return;

    const cart = readCart();
    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      existing.qty += 1;
      Object.assign(existing, product);
    } else {
      cart.push({ ...product, qty: 1 });
    }

    writeCart(cart);
    showToast('Добавлено в корзину');
  }

  function bindCart() {
    document.addEventListener('submit', (event) => {
      if (!event.target.closest('form.cart')) return;
      event.preventDefault();
      addToCart();
    }, true);

    document.addEventListener('click', (event) => {
      const button = event.target.closest('.single_add_to_cart_button, button[name="add-to-cart"]');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      addToCart();
    }, true);
  }

  function init() {
    addStyle();
    addCartLink();
    removeDiscontinuedVariants();
    applyRequestedColor();
    restoreCatalogBreadcrumbLinks();
    normalizeTitleAndButtons();
    renderProductSku();
    renderProductImage();
    updateVariationPriceDisplay();
    convertPrices(document);
    bindCart();
    bindFavorite();

    function refreshFavoriteState() {
      setFavoriteState(readFavorites().some((item) => item.id === favoriteId()));
    }

    document.addEventListener('change', (event) => {
      if (event.target.matches('select[name="attribute_pa_color"], input.variation_id')) {
        if (!applyingRequestedColor) userChangedColor = true;
        window.setTimeout(renderProductImage, 0);
        window.setTimeout(renderProductSku, 0);
        window.setTimeout(updateVariationPriceDisplay, 0);
        window.setTimeout(normalizeTitleAndButtons, 0);
        window.setTimeout(refreshFavoriteState, 0);
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (event.target.closest('.thwvsf-wrapper-item-li, .thwvsf-selected, .rtwpvg-thumbnail, [data-value]')) {
        if (!applyingRequestedColor) userChangedColor = true;
        applyClickedAttribute(event.target);
        window.setTimeout(renderProductImage, 80);
        window.setTimeout(renderProductSku, 80);
        window.setTimeout(updateVariationPriceDisplay, 80);
        window.setTimeout(normalizeTitleAndButtons, 80);
        window.setTimeout(refreshFavoriteState, 80);
      }
    }, true);

    let pendingConvert = false;
    function scheduleConvert() {
      if (pendingConvert) return;
      pendingConvert = true;
      window.requestAnimationFrame(() => {
        pendingConvert = false;
        restoreCatalogBreadcrumbLinks();
        normalizeTitleAndButtons();
        renderProductSku();
        updateVariationPriceDisplay();
        convertPrices(document);
        refreshFavoriteState();
      });
    }

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((mutation) => mutation.addedNodes.length || mutation.type === 'characterData')) {
        scheduleConvert();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    [250, 800, 1600, 3200].forEach((delay) => {
      window.setTimeout(() => {
        removeDiscontinuedVariants();
        applyRequestedColor();
        restoreCatalogBreadcrumbLinks();
        normalizeTitleAndButtons();
        renderProductSku();
        renderProductImage();
        updateVariationPriceDisplay();
        convertPrices(document);
        bindFavorite();
      }, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
