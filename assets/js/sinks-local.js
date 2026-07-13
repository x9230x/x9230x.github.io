(function () {
  window.DEALER_LOCAL_CATALOG = true;

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
  const root = new URL(document.currentScript?.dataset.root || '../', window.location.href).href;
  const CATALOG_RETURN_PREFIX = 'omoikiri:catalog-return:';
  const CATALOG_DIRS = new Set(['sinks', 'bathsinks', 'taps', 'filters', 'disposers', 'dispenser', 'acs', 'omoikiri-home']);
  const loading = document.getElementById('loading');
  let filterClickBound = false;
  let filterDropdownBound = false;
  let priceRangeBound = false;
  let paginationBound = false;
  let paginationLoading = false;
  let paginationDone = false;
  let allProductsLoadingPromise = null;
  let catalogMetaPromise = null;
  let catalogMeta = {};
  let lastScrollY = window.scrollY || 0;
  let productImageUpdateToken = 0;
  let restoringCatalogFilters = false;
  let mobileFilterToggleLockedUntil = 0;
  let suppressNextMobileFilterClick = false;
  const productDetailsCache = new Map();
  const productImageProbeCache = new Map();
  const productKeys = new Set();
  const colorNames = {
    az: 'Р°Р·СѓСЂ',
    be: 'Р±РµР¶РµРІС‹Р№',
    bl: 'С‡РµСЂРЅС‹Р№',
    cc: 'РєРѕС„Рµ',
    ch: 'С€РѕРєРѕР»Р°Рґ',
    cn: 'РєР°СЂР±РѕРЅ',
    dc: 'С‚РµРјРЅС‹Р№ С€РѕРєРѕР»Р°Рґ',
    es: 'СЌРІРµСЂРµСЃС‚',
    ev: 'СЌРІРµСЂРµСЃС‚',
    gb: 'РіСЂР°С„РёС‚',
    gm: 'РІРѕСЂРѕРЅРµРЅР°СЏ СЃС‚Р°Р»СЊ',
    gr: 'СЃРµСЂС‹Р№',
    ib: 'РёРЅРґРёРіРѕ',
    in: 'РЅРµСЂР¶Р°РІРµСЋС‰Р°СЏ СЃС‚Р°Р»СЊ',
    lg: 'СЃРІРµС‚Р»РѕРµ Р·РѕР»РѕС‚Рѕ',
    mo: 'РјРѕРєРєР°',
    ol: 'РѕР»РёРІР°',
    pa: 'РїР°СЃС‚РёР»Р°',
    pe: 'Р¶РµРјС‡СѓРі',
    pl: 'РїР»Р°С‚РёРЅР°',
    rg: 'СЂРѕР·РѕРІРѕРµ Р·РѕР»РѕС‚Рѕ',
    sa: 'СЃР°С…Р°СЂР°',
    sb: 'СЃРµСЂРѕ-Р±РµР¶РµРІС‹Р№',
    sl: 'СЃРµСЂРµР±СЂРёСЃС‚С‹Р№',
    wh: 'Р±РµР»С‹Р№',
    wg: 'Р±РµР»РѕРµ Р·РѕР»РѕС‚Рѕ',
    wd: 'РґРµСЂРµРІРѕ'
  };

  window.paginationUrls = {};

  if (window.prdctfltr) {
    window.prdctfltr.use_ajax = 'no';
  }

  if (loading) {
    loading.dataset.maxPages = '1';
    loading.style.display = 'none';
  }

  function roundKzt(value) {
    return Math.ceil((value * 6.1 - 880) / 1000) * 1000 + 880;
  }

  function formatKzt(value) {
    return new Intl.NumberFormat('ru-KZ').format(value) + ' \u20b8';
  }

  function addStyle() {
    if (document.getElementById('dealer-local-catalog-style')) return;

    const style = document.createElement('style');
    style.id = 'dealer-local-catalog-style';
    style.textContent = `
      @font-face {
        font-family: "GothamProLight";
        src: url("${root}assets/fonts/GothamProLight.woff") format("woff");
        font-weight: 300;
        font-style: normal;
      }

      @font-face {
        font-family: "GothamProRegular";
        src: url("${root}assets/fonts/GothamProRegular.woff") format("woff");
        font-weight: 400;
        font-style: normal;
      }

      .woocommerce ul.products,
      .woocommerce-page ul.products,
      ul.products {
        list-style: none !important;
        padding-left: 0 !important;
        margin-left: 0 !important;
      }

      .woocommerce ul.products li.product,
      .woocommerce-page ul.products li.product,
      ul.products li.product,
      li.product {
        list-style: none !important;
        position: relative !important;
      }

      .woocommerce ul.products li.product::marker,
      .woocommerce-page ul.products li.product::marker,
      ul.products li.product::marker,
      li.product::marker {
        content: "" !important;
        font-size: 0 !important;
      }

      .woocommerce span.onsale,
      .woocommerce-page span.onsale,
      ul.products li.product span.onsale,
      span.onsale {
        position: absolute !important;
        top: 10px !important;
        left: 10px !important;
        z-index: 4 !important;
        display: block !important;
        width: auto !important;
        min-width: 0 !important;
        height: 22px !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 5px 10px !important;
        border: 0 !important;
        border-radius: 10px !important;
        background: #000 !important;
        color: #fff !important;
        font: 700 10px/12px "GothamProRegular", Arial, sans-serif !important;
        letter-spacing: .5px !important;
        text-transform: uppercase !important;
        text-align: center !important;
      }

      ul.products li.product .woocommerce-loop-product__title,
      .woocommerce ul.products li.product .woocommerce-loop-product__title,
      .woocommerce-page ul.products li.product .woocommerce-loop-product__title {
        color: #111 !important;
        font-family: "GothamProLight", "GothamProRegular", Arial, sans-serif !important;
        font-size: 24px !important;
        font-weight: 500 !important;
        line-height: 1.12 !important;
        letter-spacing: 0 !important;
        text-transform: uppercase !important;
      }

      .screen-reader-text {
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      }

      .add-to-favorites-loop {
        position: absolute !important;
        top: 10px !important;
        right: 12px !important;
        z-index: 5 !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        min-height: 34px !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 50% !important;
        background: transparent !important;
        box-shadow: none !important;
        cursor: pointer !important;
        color: #111 !important;
        line-height: 1 !important;
      }

      .add-to-favorites-loop svg {
        width: 28px !important;
        height: 28px !important;
        display: block !important;
        margin: 3px auto 0 !important;
        stroke: currentColor !important;
        fill: none !important;
        stroke-width: 1.7 !important;
      }

      .add-to-favorites-loop.dealer-favorite-active svg {
        fill: #111 !important;
      }

      .add-to-favorites-loop::before {
        content: "" !important;
        display: block !important;
        width: 28px !important;
        height: 28px !important;
        margin: 3px auto 0 !important;
        background: currentColor !important;
        -webkit-mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.5 5.6c-1.5-1.9-4.4-2-6-.4L12 7.7 9.5 5.2c-1.6-1.6-4.5-1.5-6 .4-1.6 2-1.2 4.9.8 6.9l7.1 7.1c.3.3.8.3 1.1 0l7.1-7.1c2-2 2.4-4.9.9-6.9Z'/%3E%3C/svg%3E") no-repeat center / contain !important;
        mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg' fill='none' stroke='black' stroke-width='1.7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20.5 5.6c-1.5-1.9-4.4-2-6-.4L12 7.7 9.5 5.2c-1.6-1.6-4.5-1.5-6 .4-1.6 2-1.2 4.9.8 6.9l7.1 7.1c.3.3.8.3 1.1 0l7.1-7.1c2-2 2.4-4.9.9-6.9Z'/%3E%3C/svg%3E") no-repeat center / contain !important;
      }

      .add-to-favorites-loop:has(svg)::before {
        display: none !important;
      }

      .dealer-filter-hidden,
      .dealer-discontinued-product,
      .xwc--pf-loader-overlay,
      .prdctfltr_loader,
      .prdctfltr_woocommerce_filter_submit,
      .prdctfltr_wc .prdctfltr_loader {
        display: none !important;
        pointer-events: none !important;
      }

      .dealer-static-catalog .prdctfltr_filter label.dealer-option-unavailable:not(.dealer-active) {
        opacity: .32 !important;
        pointer-events: none !important;
      }

      .dealer-static-catalog .prdctfltr_filter label.dealer-option-hidden:not(.dealer-active) {
        display: none !important;
      }

      .dealer-static-catalog .prdctfltr_pa_color label.dealer-active {
        outline: 1px solid #fff !important;
        box-shadow: 0 0 0 1px #222 !important;
        border-radius: 999px !important;
      }

      .dealer-local-clear-filters {
        display: none;
        align-items: center;
        justify-content: center;
        padding: 13px 28px;
        border: 1px solid #111;
        border-radius: 999px;
        background: #fff;
        color: #111;
        font: 400 14px/1 "GothamProRegular", Arial, sans-serif;
        text-transform: lowercase;
        cursor: pointer;
      }

      .dealer-local-clear-filters.is-visible {
        display: inline-flex;
      }

      .prdctfltr_buttons {
        display: none !important;
        width: 100% !important;
        justify-content: center !important;
        margin-top: 0 !important;
      }

      .prdctfltr_buttons.dealer-clear-visible {
        display: flex !important;
        margin-top: 30px !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .dealer-price-mobile-labels {
        display: none !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price {
        min-width: 205px !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .irs {
        position: relative !important;
        z-index: 3 !important;
        width: 205px !important;
        max-width: 100% !important;
        touch-action: none !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .irs-line,
      .dealer-static-catalog .prdctfltr_rng_price .irs-bar,
      .dealer-static-catalog .prdctfltr_rng_price .irs-slider {
        pointer-events: auto !important;
        touch-action: none !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .irs-slider {
        z-index: 8 !important;
        width: 18px !important;
        height: 18px !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .irs-slider.from {
        margin-left: 0 !important;
      }

      .dealer-static-catalog .prdctfltr_rng_price .irs-slider.to {
        margin-left: -18px !important;
      }

      .dealer-local-empty {
        display: none;
        width: 100%;
        padding: 48px 0 64px;
        font: 600 18px/1.4 Arial, sans-serif;
        text-align: center;
      }

      .dealer-local-empty.is-visible {
        display: block;
      }

      .dealer-static-catalog .hidden_filter {
        position: relative !important;
        top: auto !important;
        left: auto !important;
        z-index: 950 !important;
        width: 100% !important;
        margin-bottom: 25px !important;
        background: #fff !important;
        border-bottom: 0 !important;
        box-shadow: none !important;
        overflow: visible !important;
      }

      .dealer-static-catalog.dealer-filter-compact > .menu {
        display: none !important;
      }

      .dealer-static-catalog.dealer-filter-compact .hidden_filter {
        position: fixed !important;
        top: var(--dealer-filter-top, 67px) !important;
        left: 0 !important;
        z-index: 990 !important;
        min-height: 84px !important;
        margin-bottom: 0 !important;
        background: #fff !important;
        border-bottom: 1px solid #efefef !important;
        box-shadow: 0 8px 18px rgba(0, 0, 0, .04) !important;
        transition: none !important;
      }

      .dealer-static-catalog .hidden_filter .hidden_button {
        display: none !important;
      }

      .dealer-static-catalog .hidden_filter .widget-area,
      .dealer-static-catalog .hidden_filter .widget-column,
      .dealer-static-catalog .hidden_filter .widget,
      .dealer-static-catalog .hidden_filter .prdctfltr_wc,
      .dealer-static-catalog .hidden_filter .prdctfltr_woocommerce_ordering,
      .dealer-static-catalog .hidden_filter .prdctfltr_filter_wrapper,
      .dealer-static-catalog .hidden_filter .prdctfltr_filter_inner {
        width: 100% !important;
        max-width: none !important;
        height: auto !important;
        min-height: 0 !important;
      }

      .dealer-static-catalog .hidden_filter .widget-area,
      .dealer-static-catalog .hidden_filter .widget-column,
      .dealer-static-catalog .hidden_filter .widget {
        display: block !important;
        overflow: visible !important;
      }

      .dealer-static-catalog .prdctfltr_wc .prdctfltr_woocommerce_ordering {
        margin: 25px 0 0 !important;
        padding: 0 100px !important;
      }

      .dealer-static-catalog .prdctfltr_wc .prdctfltr_filter_inner {
        align-items: flex-start !important;
      }

      .dealer-static-catalog .prdctfltr_filter {
        position: relative !important;
      }

      .dealer-static-catalog .prdctfltr_pa_sink_shape {
        min-width: 215px !important;
      }

      .dealer-static-catalog .prdctfltr_pa_sink_shape label {
        width: 215px !important;
        white-space: nowrap !important;
      }

      .dealer-static-catalog .prdctfltr_widget_title {
        user-select: none;
        font-family: "GothamProBold", Arial, sans-serif !important;
        font-weight: 700 !important;
      }

      .dealer-static-catalog .prdctfltr_filter .prdctfltr_add_scroll {
        display: block !important;
        height: auto !important;
        max-height: none !important;
        overflow: visible !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter .prdctfltr_add_scroll,
      .dealer-static-catalog.dealer-filter-compact .prdctfltr_buttons {
        display: none !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter.dealer-filter-open .prdctfltr_add_scroll {
        position: absolute !important;
        left: 0 !important;
        top: calc(100% + 12px) !important;
        display: block !important;
        width: max-content !important;
        min-width: 220px !important;
        max-width: min(520px, calc(100vw - 40px)) !important;
        max-height: 360px !important;
        overflow: auto !important;
        margin: 0 !important;
        padding: 18px !important;
        background: #fff !important;
        border: 1px solid #efefef !important;
        box-shadow: 0 18px 42px rgba(0, 0, 0, .13) !important;
        z-index: 980 !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter.dealer-filter-open .prdctfltr_add_scroll .prdctfltr_checkboxes {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        gap: 10px 14px !important;
        height: auto !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter.dealer-filter-open .prdctfltr_add_scroll label {
        margin: 0 !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter.dealer-filter-open .prdctfltr-down {
        transform: none !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr-down {
        display: block !important;
        width: 28px !important;
        height: 28px !important;
        background: none !important;
        transform: none !important;
      }

      .dealer-static-catalog.dealer-filter-compact .prdctfltr-down::before {
        content: " " !important;
        display: block !important;
        width: 28px !important;
        height: 28px !important;
        background-image: url("https://omoikiri.ru/wp-content/themes/twentynineteen/img/plus.svg") !important;
        background-repeat: no-repeat !important;
        background-position: center !important;
        background-size: 28px 28px !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .hidden_filter {
        min-height: 0 !important;
        box-shadow: 0 10px 24px rgba(0, 0, 0, .05) !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .prdctfltr_wc .prdctfltr_woocommerce_ordering {
        margin-top: 25px !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .prdctfltr_filter .prdctfltr_add_scroll {
        position: static !important;
        display: block !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
        max-height: none !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: 0 !important;
        box-shadow: none !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .prdctfltr_filter .prdctfltr_add_scroll .prdctfltr_checkboxes {
        display: block !important;
        height: auto !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .prdctfltr_filter .prdctfltr_add_scroll label {
        margin: 0 0 14px !important;
      }

      .dealer-static-catalog.dealer-filter-compact.dealer-filter-expanded .prdctfltr_buttons {
        display: block !important;
      }

      @media (max-width: 1250px) {
        .dealer-static-catalog .hidden_filter,
        .dealer-static-catalog.dealer-filter-compact .hidden_filter {
          position: fixed !important;
          display: flex !important;
          top: var(--dealer-nav-height, 67px) !important;
          left: 0 !important;
          z-index: 9998 !important;
          width: 100% !important;
          height: auto !important;
          max-height: 100% !important;
          max-width: 100% !important;
          margin-bottom: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: none !important;
          border: 0 !important;
          box-shadow: none !important;
        }

        .dealer-static-catalog .hidden_filter .hidden_button {
          display: flex !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10002 !important;
          align-self: center !important;
          margin: 0 auto !important;
          border-radius: 0 0 8px 8px !important;
          background: #fff !important;
        }

        .dealer-static-catalog .hidden_filter .widget-area,
        .dealer-static-catalog .hidden_filter .widget-column,
        .dealer-static-catalog .hidden_filter .widget {
          display: none !important;
          height: 100% !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          background: #fff !important;
        }

        .dealer-static-catalog .hidden_filter .widget-area.active,
        .dealer-static-catalog .hidden_filter .widget-column.active,
        .dealer-static-catalog .hidden_filter .widget.active {
          display: block !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter {
          max-height: calc(100dvh - var(--dealer-nav-height, 67px)) !important;
          overflow-y: auto !important;
          background: #fff !important;
          box-shadow: 0 14px 35px rgba(0, 0, 0, .08) !important;
        }

        .dealer-static-catalog .hidden_filter .prdctfltr_wc .prdctfltr_woocommerce_ordering {
          margin: 0 !important;
          padding: 0 44px 44px !important;
        }

        .dealer-static-catalog .hidden_filter .prdctfltr_filter_inner {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 25px !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter .prdctfltr_filter_inner {
          display: flex !important;
          flex-direction: column !important;
          flex-wrap: nowrap !important;
          gap: 28px !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter .prdctfltr_filter {
          width: 100% !important;
          min-width: 0 !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter .prdctfltr_widget_title {
          justify-content: space-between !important;
          gap: 18px !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter .prdctfltr_checkboxes {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 12px 18px !important;
        }

        .dealer-static-catalog.dealer-filter-expanded .hidden_filter .prdctfltr_filter label {
          margin: 0 0 8px !important;
        }

        .dealer-static-catalog .prdctfltr_filter .prdctfltr_add_scroll,
        .dealer-static-catalog.dealer-filter-compact .prdctfltr_filter .prdctfltr_add_scroll {
          display: block !important;
          overflow: hidden !important;
          margin-top: 15px !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs {
          position: relative !important;
          z-index: 3 !important;
          width: 100% !important;
          max-width: 280px !important;
          margin-top: -2px !important;
          padding-top: 0 !important;
          height: 24px !important;
          min-height: 24px !important;
          touch-action: none !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs-line,
        .dealer-static-catalog .prdctfltr_rng_price .irs-bar {
          top: 12px !important;
          z-index: 4 !important;
          pointer-events: auto !important;
          touch-action: none !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs-slider {
          z-index: 8 !important;
          width: 22px !important;
          height: 22px !important;
          top: 6px !important;
          pointer-events: auto !important;
          touch-action: none !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs-slider.from {
          margin-left: 0 !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs-slider.to {
          margin-left: -22px !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .irs-min,
        .dealer-static-catalog .prdctfltr_rng_price .irs-max,
        .dealer-static-catalog .prdctfltr_rng_price .irs-single,
        .dealer-static-catalog .prdctfltr_rng_price .irs-from,
        .dealer-static-catalog .prdctfltr_rng_price .irs-to {
          display: none !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .dealer-price-mobile-labels {
          display: flex !important;
          width: 100% !important;
          max-width: 280px !important;
          justify-content: space-between !important;
          gap: 18px !important;
          margin: 14px 0 0 !important;
          color: #111 !important;
          font: 700 12px/1.2 "GothamProBold", Arial, sans-serif !important;
          white-space: nowrap !important;
        }

        .dealer-static-catalog .prdctfltr_rng_price .dealer-price-mobile-labels span:last-child {
          text-align: right !important;
        }
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
    `;
    document.head.appendChild(style);
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

  function isDiscontinuedSlugColor(slug, colorCode) {
    const colors = DISCONTINUED_BY_SLUG_COLOR[slug] || [];
    return colors.includes(String(colorCode || '').toLowerCase());
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

  function isDiscontinuedFavorite(item) {
    const sku = String(item?.article || '').trim();
    const slug = item?.slug || productSlugFromHref(item?.href) || '';
    const colorCode = String(item?.colorCode || '').toLowerCase();
    return DISCONTINUED_SKUS.has(sku) || isDiscontinuedSlugColor(slug, colorCode);
  }

  function writeFavorites(items) {
    const value = JSON.stringify(items);

    try {
      window.localStorage.setItem(FAVORITES_KEY, value);
    } catch (error) {}

    document.cookie = encodeURIComponent(FAVORITES_KEY) + '=' + encodeURIComponent(value) + '; path=/; max-age=31536000; SameSite=Lax';
  }

  function favoriteIdFromProduct(product) {
    const button = product.querySelector('.add-to-favorites-loop');
    const title = product.querySelector('.woocommerce-loop-product__title')?.textContent.trim();
    const slug = productSlug(product) || title || product.querySelector('a[href]')?.href || '';
    return favoriteKey(slug, button?.dataset.variationId || selectedColorCode(product) || button?.dataset.productId || title);
  }

  function cleanColorName(value) {
    return String(value || '')
      .replace(/^\s*\d+\.\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function selectedColorCode(product) {
    const button = product.querySelector('.add-to-favorites-loop');
    return button?.getAttribute('data-pa_color') || hrefParam(product, 'attribute_pa_color') || listFromDataset(product, 'filterColors')[0] || '';
  }

  function selectedColorName(product) {
    const code = selectedColorCode(product);
    return cleanColorName(colorNames[code] || code);
  }

  function titleWithColor(title, color) {
    if (!color || new RegExp('\\(' + color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\)', 'i').test(title)) return title;
    return title + ' (' + color + ')';
  }

  function visiblePriceText(product) {
    const price = product.querySelector('.price');
    if (!price) return '';

    const sale = price.querySelector('ins .woocommerce-Price-amount');
    if (sale) return sale.textContent.trim().replace(/\s+/g, ' ');

    const amounts = [...price.querySelectorAll('.woocommerce-Price-amount')]
      .map((node) => node.textContent.trim().replace(/\s+/g, ' '))
      .filter(Boolean);

    if (amounts.length > 1) return amounts.join(' вЂ“ ');
    if (amounts.length) return amounts[0];

    const clone = price.cloneNode(true);
    clone.querySelectorAll('.screen-reader-text').forEach((node) => node.remove());
    return clone.textContent.trim().replace(/\s+/g, ' ');
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

  function parseProductDetails(html, colorCode) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const details = { sku: '', color: '', price: '' };
    const select = doc.querySelector('select[name="attribute_pa_color"]');

    if (select && colorCode) {
      const option = [...select.options].find((item) => item.value === colorCode);
      details.color = cleanColorName(option?.textContent || option?.getAttribute('title') || '');
    }

    const rawVariations = doc.querySelector('form.variations_form[data-product_variations]')?.getAttribute('data-product_variations');
    if (rawVariations) {
      try {
        const slug = productSlugFromHref(doc.querySelector('link[rel="canonical"]')?.href || '');
        const variations = JSON.parse(rawVariations).filter((item) => {
          const sku = String(item?.sku || '').trim();
          const itemColor = item?.attributes?.attribute_pa_color || '';
          return !DISCONTINUED_SKUS.has(sku) && !isDiscontinuedSlugColor(slug, itemColor);
        });
        const variation = variations.find((item) => item.attributes?.attribute_pa_color === colorCode) || variations[0];
        details.sku = variation?.sku || '';
        details.variationId = variation?.variation_id || '';
        details.image = variation?.variation_gallery_images?.[0]?.archive_src
          || variation?.image?.thumb_src
          || variation?.image?.src
          || variation?.image?.url
          || '';
        details.price = priceFromRub(variation?.display_price) || priceFromRubText(variation?.price_html);
      } catch (error) {}
    }

    if (!details.price) {
      const priceNode = doc.querySelector('.summary .rrc, .summary .price, .entry-summary .price, .woocommerce-variation-price');
      details.price = priceFromRubText(priceNode?.textContent);
    }

    if (!details.sku) {
      const visibleSku = doc.querySelector('.sku')?.textContent.replace(/^Р°СЂС‚\.\s*/i, '').trim();
      if (visibleSku && /^\d{6,}$/.test(visibleSku) && !DISCONTINUED_SKUS.has(visibleSku)) details.sku = visibleSku;
    }

    if (!details.sku || !details.price) {
      for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const data = JSON.parse(script.textContent);
          if (data?.sku && !details.sku) {
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

  async function fetchProductDetails(href, colorCode) {
    const key = href + '|' + colorCode;
    if (productDetailsCache.has(key)) return productDetailsCache.get(key);

    const promise = fetch(new URL(href, window.location.href), { credentials: 'same-origin' })
      .then((response) => response.ok ? response.text() : '')
      .then((html) => html ? parseProductDetails(html, colorCode) : { sku: '', color: '' })
      .catch(() => ({ sku: '', color: '' }));

    productDetailsCache.set(key, promise);
    return promise;
  }

  async function productData(product) {
    const link = product.querySelector('.woocommerce-loop-product__link');
    const image = product.querySelector('img');
    const title = product.querySelector('.woocommerce-loop-product__title')?.textContent.trim() || 'OMIKIRI';
    const button = product.querySelector('.add-to-favorites-loop');
    const colorCode = selectedColorCode(product);
    const details = link?.href ? await fetchProductDetails(link.href, colorCode) : { sku: '', color: '' };
    const color = details.color || selectedColorName(product);

    return {
      id: favoriteKey(productSlug(product) || title, details.sku || button?.dataset.variationId || colorCode || button?.dataset.productId || title),
      title: titleWithColor(title, color),
      href: link?.href || '',
      image: image?.currentSrc || image?.src || '',
      price: visiblePriceText(product) || details.price,
      article: details.sku || button?.dataset.sku || '',
      variationId: button?.dataset.variationId || '',
      productId: button?.dataset.productId || '',
      color
    };
  }

  function updateFavoritesCount() {
    const count = readFavorites().length;
    document.querySelectorAll('#favorites-count, [data-favorites-count]').forEach((node) => {
      node.textContent = String(count);
      node.toggleAttribute('data-count-zero', count === 0);
    });

    document.querySelectorAll('.favorites-link').forEach((link) => {
      link.href = root + 'favorites/index.html';
    });
  }

  function isFavorite(id) {
    return readFavorites().some((item) => item.id === id);
  }

  function setFavoriteButtonState(button, active) {
    button.classList.toggle('dealer-favorite-active', active);
    button.setAttribute('aria-label', active ? 'РЈР±СЂР°С‚СЊ РёР· РёР·Р±СЂР°РЅРЅРѕРіРѕ' : 'Р”РѕР±Р°РІРёС‚СЊ РІ РёР·Р±СЂР°РЅРЅРѕРµ');
    button.title = active ? 'РЈР±СЂР°С‚СЊ РёР· РёР·Р±СЂР°РЅРЅРѕРіРѕ' : 'Р”РѕР±Р°РІРёС‚СЊ РІ РёР·Р±СЂР°РЅРЅРѕРµ';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.6c-1.5-1.9-4.4-2-6-.4L12 7.7 9.5 5.2c-1.6-1.6-4.5-1.5-6 .4-1.6 2-1.2 4.9.8 6.9l7.1 7.1c.3.3.8.3 1.1 0l7.1-7.1c2-2 2.4-4.9.9-6.9Z"/></svg>';
  }

  function bindFavoriteButtons(root) {
    (root || document).querySelectorAll('.add-to-favorites-loop').forEach((button) => {
      const product = button.closest('li.product');
      if (!product) return;

      button.type = 'button';
      button.classList.add('dealer-local-favorite-button');
      setFavoriteButtonState(button, isFavorite(favoriteIdFromProduct(product)));

      if (button.dataset.dealerFavoriteBound === '1') return;
      button.dataset.dealerFavoriteBound = '1';

      button.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const data = await productData(product);
        const favorites = readFavorites();
        const index = favorites.findIndex((item) => item.id === data.id);

        if (index >= 0) {
          favorites.splice(index, 1);
          setFavoriteButtonState(button, false);
        } else {
          favorites.push(data);
          setFavoriteButtonState(button, true);
        }

        writeFavorites(favorites);
        updateFavoritesCount();
      }, true);
    });
  }

  function convertPriceAmount(amount) {
    const original = amount.dataset.originalRub || amount.textContent;
    const raw = original.replace(/[^\d]/g, '');
    const rub = Number(raw);

    if (!rub || rub > 10000000) return;

    amount.dataset.originalRub = String(rub);
    amount.textContent = formatKzt(roundKzt(rub));
  }

  function convertRangePriceLabel(node) {
    const original = node.dataset.originalRubText || node.textContent;
    const rubValues = String(original)
      .split('|')
      .flatMap((part) => part.match(/\d[\d\s\u00a0]*/g) || [])
      .map((part) => Number(part.replace(/\D/g, '')))
      .filter((value) => value > 0 && value <= 10000000);

    if (!rubValues.length) return;

    const target = rubValues.map((rub) => formatKzt(roundKzt(rub))).join(' \u2014 ');

    node.dataset.originalRubText = rubValues.join('|');
    if (node.textContent.trim() !== target) {
      node.textContent = target;
    }
  }

  function convertPriceText(root) {
    (root || document).querySelectorAll('ul.products .woocommerce-Price-amount.amount').forEach(convertPriceAmount);
    (root || document).querySelectorAll('.price .screen-reader-text').forEach((node) => {
      node.setAttribute('aria-hidden', 'true');
    });

    (root || document).querySelectorAll('.price_label, .irs-min, .irs-max, .irs-from, .irs-to, .irs-single').forEach(convertRangePriceLabel);
    syncLocalPriceSlider();
  }

  let priceTextQueued = false;

  function queuePriceTextConversion() {
    if (priceTextQueued) return;

    priceTextQueued = true;
    window.setTimeout(() => {
      priceTextQueued = false;
      convertPriceText(document);
    }, 0);
  }

  function normalizeTitle(product) {
    return product.querySelector('.woocommerce-loop-product__title')?.textContent.trim().toLowerCase() || '';
  }

  function productKey(product) {
    const href = product.querySelector('.woocommerce-loop-product__link')?.href || product.querySelector('a[href]')?.href || '';
    const title = normalizeTitle(product);

    try {
      const url = new URL(href, window.location.href);
      const parts = url.pathname.split('/').filter(Boolean);
      const index = parts.indexOf('product');
      return index >= 0 && parts[index + 1] ? parts[index + 1] : title || href;
    } catch (error) {
      return title || href;
    }
  }

  function removeDuplicateProducts() {
    const seen = new Set();

    document.querySelectorAll('ul.products li.product').forEach((product) => {
      const key = productKey(product);
      if (!key) return;

      if (seen.has(key)) {
        product.remove();
      } else {
        seen.add(key);
        productKeys.add(key);
      }
    });
  }

  function disableRemoteCatalogLoaders() {
    document.body.classList.remove('prdctfltr-ajax');
    document.body.classList.add('dealer-static-catalog');

    if (window.prdctfltr) {
      window.prdctfltr.use_ajax = 'no';
      window.prdctfltr.ajax = '';
      window.prdctfltr.wc_ajax = '';
      window.prdctfltr.active_filtering = { active: false, variable: false };
    }

    document.querySelectorAll('#loading, .load-more-container').forEach((node) => {
      node.dataset.maxPages = '1';
      node.style.display = 'none';
      node.setAttribute('aria-hidden', 'true');
    });

    document.querySelectorAll('.woocommerce-pagination a[href]').forEach((link) => {
      link.setAttribute('href', localCatalogHref(link.getAttribute('href')));
    });
  }

  function guardRemoteFilterAlerts() {
    if (window.dealerFilterAlertGuarded) return;

    const nativeAlert = typeof window.alert === 'function' ? window.alert.bind(window) : null;
    window.dealerFilterAlertGuarded = true;
    window.alert = (message) => {
      if (document.body.classList.contains('dealer-static-catalog')) {
        console.warn('Remote catalog filter alert was suppressed', message);
        document.querySelectorAll('.xwc--pf-loader-overlay, .prdctfltr_loader').forEach((node) => node.remove());
        applyFilters();
        return;
      }

      if (nativeAlert) nativeAlert(message);
    };
  }

  function updateFilterMode() {
    const currentScrollY = window.scrollY || 0;
    const compact = window.innerWidth > 1250 && currentScrollY > 0;
    const topNav = document.querySelector('.top_nav');
    const menu = document.querySelector('body > .menu');
    const topNavRect = topNav?.getBoundingClientRect();
    const topNavHeight = topNavRect?.height || 67;
    const menuVisible = menu && getComputedStyle(menu).display !== 'none';
    const menuHeight = menuVisible ? (menu.offsetHeight || 45) : 0;
    const filterTop = compact ? Math.round(topNavHeight) + 'px' : '0px';

    document.documentElement.style.setProperty('--dealer-nav-height', Math.round(topNavHeight) + 'px');
    document.documentElement.style.setProperty('--dealer-menu-height', Math.round(menuHeight) + 'px');
    document.documentElement.style.setProperty('--dealer-filter-top', filterTop);
    document.body.classList.toggle('dealer-filter-compact', compact);
    lastScrollY = currentScrollY;

    if (window.innerWidth > 1250 && !compact) {
      document.body.classList.remove('dealer-filter-expanded');
      document.querySelectorAll('.prdctfltr_filter.dealer-filter-open').forEach((openFilter) => {
        openFilter.classList.remove('dealer-filter-open');
      });
    }
  }

  function localCatalogHref(href) {
    if (!href) return '';

    if (href.startsWith('https://omoikiri.ru/')) {
      return root + href.replace('https://omoikiri.ru/', '');
    }

    if (href.startsWith('/')) {
      return root + href.slice(1);
    }

    return href;
  }

  function watchFilterMode() {
    updateFilterMode();
    window.setInterval(updateFilterMode, 120);
  }

  function nextPageHref() {
    const next = document.querySelector('.woocommerce-pagination a.next[href]');
    if (next) return localCatalogHref(next.getAttribute('href'));

    const current = Number(document.querySelector('.woocommerce-pagination .page-numbers.current')?.textContent.trim() || '1');
    const candidate = [...document.querySelectorAll('.woocommerce-pagination a.page-numbers[href]')]
      .map((link) => ({
        number: Number(link.textContent.trim()),
        href: localCatalogHref(link.getAttribute('href'))
      }))
      .find((item) => item.number === current + 1);

    return candidate?.href || '';
  }

  function replacePaginationFrom(doc) {
    const current = document.querySelector('.woocommerce-pagination');
    const incoming = doc.querySelector('.woocommerce-pagination');

    if (!current) return;
    if (!incoming) {
      current.remove();
      paginationDone = true;
      return;
    }

    current.replaceWith(incoming);
    disableRemoteCatalogLoaders();
  }

  function isNearPageBottom() {
    const pageHeight = Math.max(document.body.offsetHeight, document.documentElement.scrollHeight);
    return window.innerHeight + window.scrollY >= pageHeight - 900;
  }

  async function loadNextLocalPage() {
    if (paginationLoading || paginationDone) return false;

    const products = document.querySelector('ul.products');
    const href = nextPageHref();
    if (!products || !href) {
      paginationDone = true;
      return false;
    }

    paginationLoading = true;
    if (loading) loading.style.display = 'block';

    try {
      const response = await fetch(new URL(href, window.location.href), { credentials: 'same-origin' });
      if (!response.ok) throw new Error(String(response.status));

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const incomingProducts = [...doc.querySelectorAll('ul.products li.product')];

      if (!incomingProducts.length) {
        paginationDone = true;
        return false;
      }

      incomingProducts.forEach((product) => products.appendChild(product));
      replacePaginationFrom(doc);
      convertPriceText(products);
      bindFavoriteButtons(products);
      hydrateCatalogMeta();
      removeDuplicateProducts();
      applyFilters();
      return true;
    } catch (error) {
      paginationDone = true;
      console.warn('Local catalog page was not loaded', error);
      return false;
    } finally {
      paginationLoading = false;
      if (loading) loading.style.display = 'none';
      if (!document.body.classList.contains('dealer-catalog-loading-all') && !paginationDone && isNearPageBottom()) {
        window.setTimeout(loadNextLocalPage, 120);
      }
    }
  }

  async function ensureAllLocalProductsLoaded() {
    if (paginationDone) return;
    if (allProductsLoadingPromise) return allProductsLoadingPromise;

    document.body.classList.add('dealer-catalog-loading-all');
    if (loading) loading.style.display = 'block';

    allProductsLoadingPromise = (async () => {
      let guard = 0;
      while (!paginationDone && guard < 12) {
        guard += 1;
        const loaded = await loadNextLocalPage();
        if (!loaded) break;
      }
    })().finally(() => {
      document.body.classList.remove('dealer-catalog-loading-all');
      if (loading) loading.style.display = 'none';
      allProductsLoadingPromise = null;
    });

    return allProductsLoadingPromise;
  }

  function bindLocalPagination() {
    if (paginationBound) return;
    paginationBound = true;

    window.addEventListener('scroll', (event) => {
      updateFilterMode();
      event.stopImmediatePropagation();

      if (paginationDone || paginationLoading) return;
      if (isNearPageBottom()) loadNextLocalPage();
    }, true);
  }

  function selectedFilters() {
    const selected = {};

    document.querySelectorAll('.prdctfltr_filter').forEach((filter) => {
      const key = filter.dataset.filter;
      if (!key) return;

      const values = [...filter.querySelectorAll('input[type="checkbox"]:checked')].map((input) => input.value);
      selected[key] = values;
    });

    return selected;
  }

  function selectedPriceRange() {
    const filter = document.querySelector('.prdctfltr_rng_price');
    if (!filter) return { active: false, min: 0, max: 0 };

    const rangeValue = filter.querySelector('input.pf_rng_price')?.value || '';
    const [rangeMin, rangeMax] = rangeValue.split(';').map((part) => Number(String(part || '').replace(/\D/g, '')));
    const min = Number(filter.dataset.currentMin || filter.querySelector('input[name="rng_min_price"]')?.value || rangeMin || 0);
    const max = Number(filter.dataset.currentMax || filter.querySelector('input[name="rng_max_price"]')?.value || rangeMax || 0);
    if (!filter.dataset.defaultMin && (rangeMin || min)) filter.dataset.defaultMin = String(rangeMin || min);
    if (!filter.dataset.defaultMax && (rangeMax || max)) filter.dataset.defaultMax = String(rangeMax || max);
    const defaultMin = Number(filter.dataset.defaultMin || rangeMin || min || 0);
    const defaultMax = Number(filter.dataset.defaultMax || rangeMax || max || 0);

    return {
      active: Boolean(min || max) && (min !== defaultMin || max !== defaultMax),
      min: min || defaultMin || 0,
      max: max || defaultMax || 0
    };
  }

  function currentCatalogKey() {
    const key = window.location.pathname.split('/').filter(Boolean)[0] || 'sinks';
    return CATALOG_DIRS.has(key) ? key : '';
  }

  function persistCatalogReturnUrl(url = new URL(window.location.href)) {
    const key = currentCatalogKey();
    if (!key) return;

    const value = url.pathname + url.search;
    try {
      window.sessionStorage?.setItem(CATALOG_RETURN_PREFIX + key, value);
      window.localStorage?.setItem(CATALOG_RETURN_PREFIX + key, value);
    } catch (error) {}
  }

  function splitUrlFilterValue(value) {
    return String(value || '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  function urlFilterValues(params, key) {
    return params.getAll(key).flatMap(splitUrlFilterValue);
  }

  function restoreCatalogFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);
    restoringCatalogFilters = true;

    document.querySelectorAll('.prdctfltr_filter').forEach((filter) => {
      const key = filter.dataset.filter;
      if (!key) return;

      const values = new Set(urlFilterValues(params, key));
      filter.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.checked = values.has(input.value);
      });
    });

    const priceFilter = document.querySelector('.prdctfltr_rng_price');
    if (priceFilter) {
      const min = params.get('rng_min_price');
      const max = params.get('rng_max_price');
      if (min !== null) priceFilter.dataset.currentMin = String(Number(min) || 0);
      if (max !== null) priceFilter.dataset.currentMax = String(Number(max) || 0);
      syncLocalPriceSlider(priceFilter);
    }

    restoringCatalogFilters = false;
  }

  function syncCatalogFiltersToUrl(filters = selectedFilters(), priceRange = selectedPriceRange()) {
    if (restoringCatalogFilters || !window.history?.replaceState) return;

    const url = new URL(window.location.href);
    document.querySelectorAll('.prdctfltr_filter').forEach((filter) => {
      const key = filter.dataset.filter;
      if (key) url.searchParams.delete(key);
    });
    url.searchParams.delete('rng_min_price');
    url.searchParams.delete('rng_max_price');

    Object.entries(filters).forEach(([key, values]) => {
      if (values.length) url.searchParams.set(key, values.join(','));
    });

    if (priceRange.active) {
      url.searchParams.set('rng_min_price', String(priceRange.min));
      url.searchParams.set('rng_max_price', String(priceRange.max));
    }

    const next = url.pathname + url.search + url.hash;
    const current = window.location.pathname + window.location.search + window.location.hash;
    if (next !== current) window.history.replaceState(null, '', next);
    persistCatalogReturnUrl(url);
  }

  function classMatches(product, token) {
    return [...product.classList].some((className) => className.toLowerCase() === token.toLowerCase());
  }

  function hrefParam(product, name) {
    const href = product.querySelector('.woocommerce-loop-product__link')?.href;
    if (!href) return '';

    try {
      return new URL(href).searchParams.get(name) || '';
    } catch (error) {
      return '';
    }
  }

  function productSlug(product) {
    const href = product.querySelector('.woocommerce-loop-product__link')?.href;
    if (!href) return '';

    try {
      const path = new URL(href).pathname;
      const match = path.match(/\/product\/([^/]+)/);
      return match ? match[1] : '';
    } catch (error) {
      return '';
    }
  }

  function favoriteKey(slug, value) {
    return (slug || 'product') + '-' + String(value || 'default').toLowerCase().replace(/[^a-z0-9Р°-СЏС‘-]+/gi, '-');
  }

  function listFromDataset(product, key) {
    return (product.dataset[key] || '').split(',').map((value) => value.trim()).filter(Boolean);
  }

  function normalizeBoolFilterValue(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (['yes', 'da', 'true', '1'].includes(normalized)) return 'yes';
    if (['no', 'net', 'false', '0'].includes(normalized)) return 'no';
    return normalized;
  }

  function boolValuesMatch(productValues, selectedValues) {
    const normalizedProductValues = productValues.map(normalizeBoolFilterValue);
    return selectedValues.some((value) => normalizedProductValues.includes(normalizeBoolFilterValue(value)));
  }

  function addBoolFilterAliases(values, value) {
    const normalized = normalizeBoolFilterValue(value);
    values.add(value);
    if (normalized === 'yes') {
      values.add('yes');
      values.add('da');
    } else if (normalized === 'no') {
      values.add('no');
      values.add('net');
    }
  }

  function productPriceRubRange(product) {
    const price = product.querySelector('.price');
    if (!price) return { min: 0, max: 0 };

    const saleAmounts = [...price.querySelectorAll('ins .woocommerce-Price-amount.amount, ins .woocommerce-Price-amount')];
    const sourceAmounts = saleAmounts.length
      ? saleAmounts
      : [...price.querySelectorAll('.woocommerce-Price-amount.amount, .woocommerce-Price-amount')];
    const values = sourceAmounts
      .map((amount) => Number(amount.dataset.originalRub || amount.textContent.replace(/\D/g, '')))
      .filter((value) => value > 0 && value <= 10000000);

    if (!values.length) return { min: 0, max: 0 };

    return {
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  function setHrefColor(product, colorCode) {
    if (!colorCode) return;

    product.querySelectorAll('a[href]').forEach((link) => {
      try {
        const url = new URL(link.href, window.location.href);
        if (!url.pathname.includes('/product/')) return;
        if (!link.dataset.dealerDefaultHref) link.dataset.dealerDefaultHref = link.href;
        url.searchParams.set('attribute_pa_color', colorCode);
        link.href = url.href;
      } catch (error) {}
    });

    product.querySelectorAll('.add-to-favorites-loop').forEach((button) => {
      if (!button.dataset.dealerDefaultColor) button.dataset.dealerDefaultColor = button.dataset.pa_color || '';
      if (!button.dataset.dealerDefaultSku) button.dataset.dealerDefaultSku = button.dataset.sku || '';
      if (!button.dataset.dealerDefaultVariationId) button.dataset.dealerDefaultVariationId = button.dataset.variationId || '';
      button.dataset.pa_color = colorCode;
    });
  }

  function restoreHrefColor(product) {
    product.querySelectorAll('a[data-dealer-default-href]').forEach((link) => {
      link.href = link.dataset.dealerDefaultHref;
    });

    product.querySelectorAll('.add-to-favorites-loop').forEach((button) => {
      button.dataset.pa_color = button.dataset.dealerDefaultColor || '';

      if (button.dataset.dealerDefaultSku) {
        button.dataset.sku = button.dataset.dealerDefaultSku;
      } else {
        delete button.dataset.sku;
      }

      if (button.dataset.dealerDefaultVariationId) {
        button.dataset.variationId = button.dataset.dealerDefaultVariationId;
      } else {
        delete button.dataset.variationId;
      }
    });
  }

  function removeDiscontinuedProducts() {
    document.querySelectorAll('ul.products li.product').forEach((product) => {
      const slug = productSlug(product);
      if (!slug) return;

      const colors = listFromDataset(product, 'filterColors');
      const availableColors = colors.filter((colorCode) => !isDiscontinuedSlugColor(slug, colorCode));

      if (colors.length) {
        product.dataset.filterColors = availableColors.join(',');
      }

      const hrefColor = hrefParam(product, 'attribute_pa_color');
      const hrefDiscontinued = hrefColor && isDiscontinuedSlugColor(slug, hrefColor);
      const allKnownColorsRemoved = colors.length > 0 && availableColors.length === 0;

      if (hrefDiscontinued && availableColors.length) {
        setHrefColor(product, availableColors[0]);
        product.classList.remove('dealer-discontinued-product');
        return;
      }

      product.classList.toggle('dealer-discontinued-product', Boolean(hrefDiscontinued || allKnownColorsRemoved));
    });
  }

  function productMeta(product) {
    return catalogMeta[productSlug(product)] || {};
  }

  function hydrateProductMeta(product) {
    const meta = productMeta(product);
    const materialFallback = [...product.classList]
      .filter((className) => className.indexOf('product_cat-') === 0 && className !== 'product_cat-sinks')
      .map((className) => className.replace('product_cat-', ''));
    const categoryFallback = [...product.classList]
      .filter((className) => className.indexOf('product_cat-') === 0)
      .map((className) => className.replace('product_cat-', ''));
    const colorFallback = hrefParam(product, 'attribute_pa_color');
    const title = normalizeTitle(product);

    product.dataset.filterProductCats = categoryFallback.join(',');
    product.dataset.filterMaterials = (meta.materials || materialFallback).join(',');
    product.dataset.filterColors = (meta.colors || [colorFallback]).filter(Boolean).join(',');
    product.dataset.filterBowlSizes = (meta.bowlSizes || []).join(',');
    product.dataset.filterTapFilter = (meta.filter || []).join(',');
    product.dataset.filterTapHose = (meta.hose || []).join(',');
    product.dataset.filterTapFlexhose = (meta.flexhose || []).join(',');
    product.dataset.filterTapButton = (meta.button || []).join(',');
    product.dataset.filterTapWindow = (meta.window || []).join(',');
    product.dataset.filterDispenserFunctions = (meta.functions || []).join(',');
    const asmbl = new Set(meta.asmbl || []);
    const slug = productSlug(product);
    if ((slug.indexOf('omi-') === 0 && title.indexOf('ultra') !== -1)
      || (slug.indexOf('taki-') === 0 && (title.indexOf('u/if') !== -1 || slug.indexOf('-u-if') !== -1))) {
      asmbl.add('ul');
    }

    product.dataset.filterAsmbl = [...asmbl].join(',');
    product.dataset.filterShapes = (meta.shapes || shapeFallback(title, productSlug(product))).join(',');
  }

  function hydrateCatalogMeta() {
    document.querySelectorAll('ul.products li.product').forEach(hydrateProductMeta);
    removeDiscontinuedProducts();
  }

  async function ensureCatalogMetaLoaded() {
    if (Object.keys(catalogMeta).length) {
      hydrateCatalogMeta();
      return;
    }

    const inlineMeta = document.getElementById('dealer-sinks-meta-json');
    if (inlineMeta?.textContent) {
      try {
        catalogMeta = JSON.parse(inlineMeta.textContent) || {};
        hydrateCatalogMeta();
        return;
      } catch (error) {
        console.warn('Inline catalog metadata was not parsed', error);
      }
    }

    if (window.__OMOIKIRI_SINKS_META__) {
      catalogMeta = window.__OMOIKIRI_SINKS_META__ || {};
      hydrateCatalogMeta();
      return;
    }

    if (!catalogMetaPromise) {
      const loadMeta = (file) => fetch(root + file)
        .then((response) => response.ok ? response.json() : {})
        .catch(() => ({}));

      catalogMetaPromise = Promise.all([
        loadMeta('assets/data/sinks-meta.json?v=20260711-13'),
        loadMeta('assets/data/taps-meta.json?v=20260711-03'),
        loadMeta('assets/data/catalog-extra-meta.json?v=20260711-01')
      ])
        .then(([sinksMeta, tapsMeta, extraMeta]) => {
          catalogMeta = { ...(sinksMeta || {}), ...(tapsMeta || {}), ...(extraMeta || {}) };
          hydrateCatalogMeta();
        })
        .catch((error) => {
          console.warn('Local catalog metadata was not loaded', error);
          catalogMeta = {};
          hydrateCatalogMeta();
        });
    }

    return catalogMetaPromise;
  }

  function shapeFallback(title, slug) {
    const source = (title + ' ' + slug).toLowerCase();
    const shapes = ['rect'];
    if (source.includes('maru') || source.includes('round')) shapes.push('round');
    if (source.includes('angle') || source.includes('corner')) shapes.push('angle');
    if (/(^|\D)2(\D|$)|-2-|100-2|78-2|86-2/.test(source)) shapes.push('twobigbowl');
    if (source.includes('side') || /-(l|r|lb)(\b|-)/.test(source)) shapes.push('rectw');
    return [...new Set(shapes)];
  }

  function productMatchesFilter(product, filter, values) {
    if (!values.length) return true;

    const title = normalizeTitle(product);

    if (filter === 'product_cat') {
      return values.some((value) => classMatches(product, 'product_cat-' + value));
    }

    if (filter === 'pa_material') {
      const materials = listFromDataset(product, 'filterMaterials');
      return values.some((value) => materials.includes(value) || classMatches(product, 'product_cat-' + value));
    }

    if (filter === 'pa_color') {
      const colors = listFromDataset(product, 'filterColors');
      return values.some((value) => colors.includes(value) || hrefParam(product, 'attribute_pa_color') === value);
    }

    if (filter === 'pa_bowl_size') {
      const sizes = listFromDataset(product, 'filterBowlSizes');
      return values.some((value) => sizes.includes(value) || new RegExp('(^|\\D)' + value + '(\\D|$)').test(title));
    }

    if (filter === 'pa_asmbl') {
      const mounts = listFromDataset(product, 'filterAsmbl');
      const slug = productSlug(product);

      return values.some((value) => {
        if (mounts.includes(value)) return true;

        if (value === 'ul') {
          return (slug.indexOf('omi-') === 0 && title.indexOf('ultra') !== -1)
            || (slug.indexOf('taki-') === 0 && (title.indexOf('u/if') !== -1 || slug.indexOf('-u-if') !== -1));
        }

        return false;
      });
    }

    if (filter === 'pa_sink_shape') {
      const shapes = listFromDataset(product, 'filterShapes');
      return values.some((value) => shapes.includes(value));
    }

    if (filter === 'pa_filter') {
      const tapFilter = listFromDataset(product, 'filterTapFilter');
      return boolValuesMatch(tapFilter, values);
    }

    if (filter === 'pa_hose') {
      const tapHose = listFromDataset(product, 'filterTapHose');
      return boolValuesMatch(tapHose, values);
    }

    if (filter === 'pa_flexhose') {
      const tapFlexhose = listFromDataset(product, 'filterTapFlexhose');
      return boolValuesMatch(tapFlexhose, values);
    }

    if (filter === 'pa_button') {
      const tapButton = listFromDataset(product, 'filterTapButton');
      return boolValuesMatch(tapButton, values);
    }

    if (filter === 'pa_window') {
      const tapWindow = listFromDataset(product, 'filterTapWindow');
      return boolValuesMatch(tapWindow, values);
    }

    if (filter === 'pa_function') {
      const functions = listFromDataset(product, 'filterDispenserFunctions');
      return values.some((value) => functions.includes(value));
    }

    return true;
  }

  function productMatchesPrice(product, range) {
    if (!range.active) return true;

    const productRange = productPriceRubRange(product);
    if (!productRange.min || !productRange.max) return true;

    return productRange.max >= range.min && productRange.min <= range.max;
  }

  function filterDatasetKey(filter) {
    return {
      pa_material: 'filterMaterials',
      pa_color: 'filterColors',
      pa_bowl_size: 'filterBowlSizes',
      pa_asmbl: 'filterAsmbl',
      pa_sink_shape: 'filterShapes',
      pa_filter: 'filterTapFilter',
      pa_hose: 'filterTapHose',
      pa_flexhose: 'filterTapFlexhose',
      pa_button: 'filterTapButton',
      pa_window: 'filterTapWindow',
      pa_function: 'filterDispenserFunctions',
      product_cat: 'filterProductCats'
    }[filter] || '';
  }

  function productMatchesFilterSet(product, filters, priceRange, skipFilter) {
    if (product.classList.contains('dealer-discontinued-product')) return false;
    if (!productMatchesPrice(product, priceRange)) return false;

    return Object.entries(filters).every(([filter, values]) => (
      filter === skipFilter || productMatchesFilter(product, filter, values)
    ));
  }

  function availableValuesForFilter(filter, filters, priceRange, products) {
    const datasetKey = filterDatasetKey(filter);
    if (!datasetKey) return new Set();

    const values = new Set();
    products.forEach((product) => {
      if (!productMatchesFilterSet(product, filters, priceRange, filter)) return;
      listFromDataset(product, datasetKey).forEach((value) => {
        if (['pa_filter', 'pa_hose', 'pa_flexhose', 'pa_button', 'pa_window'].includes(filter)) {
          addBoolFilterAliases(values, value);
        } else {
          values.add(value);
        }
      });
    });
    return values;
  }

  function updateFilterAvailability(filters, priceRange, products, hasActiveFilters) {
    document.querySelectorAll('.prdctfltr_filter').forEach((filterNode) => {
      const filter = filterNode.dataset.filter;
      if (!filterDatasetKey(filter)) return;

      if (!hasActiveFilters) {
        filterNode.querySelectorAll('label').forEach((label) => {
          const input = label.querySelector('input[type="checkbox"]');
          if (input) input.disabled = false;
          label.style.removeProperty('display');
          label.classList.remove('dealer-option-unavailable');
          label.classList.remove('dealer-option-hidden');
        });
        return;
      }

      const availableValues = availableValuesForFilter(filter, filters, priceRange, products);
      filterNode.querySelectorAll('label').forEach((label) => {
        const input = label.querySelector('input[type="checkbox"]');
        if (!input) return;

        const checked = input.checked;
        const available = availableValues.has(input.value);
        const hideWhenUnavailable = filter !== 'pa_bowl_size';
        const hidden = hideWhenUnavailable && !checked && !available;
        input.disabled = !checked && !available;
        label.classList.toggle('dealer-option-unavailable', !checked && !available);
        label.classList.toggle('dealer-option-hidden', hidden);
        if (hidden) {
          label.style.setProperty('display', 'none', 'important');
        } else {
          label.style.removeProperty('display');
        }
      });
    });
  }

  function rememberDefaultImage(product) {
    const image = product.querySelector('img');
    if (!image || product.dataset.dealerDefaultImage) return image;

    product.dataset.dealerDefaultImage = image.getAttribute('src') || '';
    product.dataset.dealerDefaultSrcset = image.getAttribute('srcset') || '';
    product.dataset.dealerDefaultSizes = image.getAttribute('sizes') || '';
    return image;
  }

  function setProductCardImage(product, src) {
    const image = rememberDefaultImage(product);
    if (!image || !src) return;

    image.src = src;
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
  }

  function restoreProductCardImage(product) {
    const image = product.querySelector('img');
    if (!image || !product.dataset.dealerDefaultImage) return;

    image.src = product.dataset.dealerDefaultImage;
    if (product.dataset.dealerDefaultSrcset) {
      image.setAttribute('srcset', product.dataset.dealerDefaultSrcset);
    } else {
      image.removeAttribute('srcset');
    }

    if (product.dataset.dealerDefaultSizes) {
      image.setAttribute('sizes', product.dataset.dealerDefaultSizes);
    } else {
      image.removeAttribute('sizes');
    }
  }

  function colorCodeForImageName(colorCode) {
    return String(colorCode || '').split('-').map((part, index) => index === 0 ? part.toUpperCase() : part).join('-');
  }

  function localColorImageCandidate(product, colorCode) {
    const image = rememberDefaultImage(product);
    const source = product.dataset.dealerDefaultImage || image?.getAttribute('src') || image?.src || '';
    const imageColor = colorCodeForImageName(colorCode);

    if (!source || !imageColor) return '';

    try {
      const url = new URL(source, window.location.href);
      const pathname = url.pathname;
      const nextPath = pathname.replace(/([_-])([a-z]{1,3}(?:-[a-z]+)?)(-\d+x\d+\.(?:png|jpe?g|webp))$/i, '$1' + imageColor + '$3');

      if (nextPath === pathname) return '';

      url.pathname = nextPath;
      return url.href;
    } catch (error) {
      return source.replace(/([_-])([a-z]{1,3}(?:-[a-z]+)?)(-\d+x\d+\.(?:png|jpe?g|webp))$/i, '$1' + imageColor + '$3');
    }
  }

  function imageCanLoad(src) {
    if (!src) return Promise.resolve(false);
    if (productImageProbeCache.has(src)) return productImageProbeCache.get(src);

    const promise = new Promise((resolve) => {
      const image = new Image();
      const finish = (result) => {
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };

      const timer = window.setTimeout(() => finish(false), 2500);
      image.onload = () => {
        window.clearTimeout(timer);
        finish(true);
      };
      image.onerror = () => {
        window.clearTimeout(timer);
        finish(false);
      };
      image.src = src;
    });

    productImageProbeCache.set(src, promise);
    return promise;
  }

  async function updateProductImagesForSelectedColor(filters) {
    const colorCode = filters.pa_color?.[0] || '';
    const token = ++productImageUpdateToken;
    const products = [...document.querySelectorAll('ul.products li.product')];

    if (!colorCode) {
      products.forEach((product) => {
        restoreProductCardImage(product);
        restoreHrefColor(product);
      });
      return;
    }

    for (const product of products) {
      if (token !== productImageUpdateToken) return;
      if (product.classList.contains('dealer-filter-hidden')) continue;
      if (!listFromDataset(product, 'filterColors').includes(colorCode)) continue;

      setHrefColor(product, colorCode);
      const link = product.querySelector('.woocommerce-loop-product__link');
      if (!link?.href) continue;

      const localImage = localColorImageCandidate(product, colorCode);
      if (localImage && await imageCanLoad(localImage)) {
        if (token !== productImageUpdateToken) return;
        setProductCardImage(product, localImage);
      }

      const details = await fetchProductDetails(link.href, colorCode);
      if (token !== productImageUpdateToken) return;
      if (details.image) setProductCardImage(product, details.image);

      product.querySelectorAll('.add-to-favorites-loop').forEach((button) => {
        if (details.sku) button.dataset.sku = details.sku;
        if (details.variationId) button.dataset.variationId = details.variationId;
      });
    }
  }

  function syncLocalPriceSlider(filter = document.querySelector('.prdctfltr_rng_price')) {
    if (!filter || filter.dataset.dealerLocalSlider !== '1') return;

    const input = filter.querySelector('input.pf_rng_price');
    const hiddenMin = filter.querySelector('input[name="rng_min_price"]');
    const hiddenMax = filter.querySelector('input[name="rng_max_price"]');
    const bar = filter.querySelector('.irs-bar');
    const fromHandle = filter.querySelector('.irs-slider.from');
    const toHandle = filter.querySelector('.irs-slider.to');
    const fromLabel = filter.querySelector('.irs-from');
    const toLabel = filter.querySelector('.irs-to');
    const singleLabel = filter.querySelector('.irs-single');
    const minLimit = Number(filter.dataset.defaultMin || 0);
    const maxLimit = Number(filter.dataset.defaultMax || 0);
    if (!minLimit || !maxLimit || minLimit >= maxLimit) return;

    const [inputMin, inputMax] = String(input?.value || '').split(';').map((part) => Number(String(part || '').replace(/\D/g, '')));
    const from = Number(filter.dataset.currentMin || hiddenMin?.value || inputMin || minLimit);
    const to = Number(filter.dataset.currentMax || hiddenMax?.value || inputMax || maxLimit);
    const fromPercent = ((from - minLimit) / (maxLimit - minLimit)) * 100;
    const toPercent = ((to - minLimit) / (maxLimit - minLimit)) * 100;

    filter.dataset.currentMin = String(from);
    filter.dataset.currentMax = String(to);
    if (input) input.value = from + ';' + to;
    if (fromHandle) fromHandle.style.left = fromPercent + '%';
    if (toHandle) toHandle.style.left = toPercent + '%';
    if (bar) {
      bar.style.left = fromPercent + '%';
      bar.style.width = Math.max(0, toPercent - fromPercent) + '%';
    }

    const fromText = formatKzt(roundKzt(from));
    const toText = formatKzt(roundKzt(to));
    if (fromLabel) fromLabel.textContent = fromText;
    if (toLabel) toLabel.textContent = toText;
    if (singleLabel) singleLabel.textContent = from === to ? fromText : fromText + ' \u2014 ' + toText;

    let mobileLabels = filter.querySelector('.dealer-price-mobile-labels');
    if (!mobileLabels) {
      mobileLabels = document.createElement('div');
      mobileLabels.className = 'dealer-price-mobile-labels';
      mobileLabels.innerHTML = '<span></span><span></span>';
      filter.querySelector('.irs')?.before(mobileLabels);
    }
    const mobileValues = mobileLabels.querySelectorAll('span');
    if (mobileValues[0]) mobileValues[0].textContent = fromText;
    if (mobileValues[1]) mobileValues[1].textContent = toText;
  }

  function resetLocalPriceSlider() {
    const filter = document.querySelector('.prdctfltr_rng_price');
    if (!filter) return;

    const minLimit = Number(filter.dataset.defaultMin || 0);
    const maxLimit = Number(filter.dataset.defaultMax || 0);
    if (!minLimit || !maxLimit) return;

    const input = filter.querySelector('input.pf_rng_price');
    const hiddenMin = filter.querySelector('input[name="rng_min_price"]');
    const hiddenMax = filter.querySelector('input[name="rng_max_price"]');
    if (input) input.value = minLimit + ';' + maxLimit;
    if (hiddenMin) hiddenMin.value = String(minLimit);
    if (hiddenMax) hiddenMax.value = String(maxLimit);
    filter.dataset.currentMin = String(minLimit);
    filter.dataset.currentMax = String(maxLimit);
    syncLocalPriceSlider(filter);
  }

  function applyPriceRangeSoon() {
    window.setTimeout(async () => {
      document.querySelectorAll('.xwc--pf-loader-overlay, .prdctfltr_loader').forEach((node) => node.remove());
      await ensureAllLocalProductsLoaded();
      await ensureCatalogMetaLoaded();
      convertPriceText(document);
      syncLocalPriceSlider();
      applyFilters();
    }, 80);
  }

  function setupLocalPriceSlider() {
    const filter = document.querySelector('.prdctfltr_rng_price');
    if (!filter || filter.dataset.dealerLocalSlider === '1') return;

    const sliderShell = filter.querySelector('.irs');
    if (sliderShell && sliderShell.dataset.dealerCleanSlider !== '1') {
      const cleanSlider = sliderShell.cloneNode(true);
      cleanSlider.dataset.dealerCleanSlider = '1';
      sliderShell.replaceWith(cleanSlider);
    }

    const input = filter.querySelector('input.pf_rng_price');
    const hiddenMin = filter.querySelector('input[name="rng_min_price"]');
    const hiddenMax = filter.querySelector('input[name="rng_max_price"]');
    const line = filter.querySelector('.irs-line');
    const bar = filter.querySelector('.irs-bar');
    const fromHandle = filter.querySelector('.irs-slider.from');
    const toHandle = filter.querySelector('.irs-slider.to');
    const fromLabel = filter.querySelector('.irs-from');
    const toLabel = filter.querySelector('.irs-to');
    const singleLabel = filter.querySelector('.irs-single');
    if (!input || !line || !fromHandle || !toHandle) return;

    const [startMin, startMax] = String(input.value || '').split(';').map((part) => Number(String(part || '').replace(/\D/g, '')));
    const minLimit = startMin || Number(hiddenMin?.value || 0);
    const maxLimit = startMax || Number(hiddenMax?.value || 0);
    if (!minLimit || !maxLimit || minLimit >= maxLimit) return;

    filter.dataset.dealerLocalSlider = '1';
    filter.dataset.defaultMin = String(minLimit);
    filter.dataset.defaultMax = String(maxLimit);

    let from = Number(hiddenMin?.value || minLimit) || minLimit;
    let to = Number(hiddenMax?.value || maxLimit) || maxLimit;
    let activeHandle = '';
    let activePointerId = null;
    let priceRangeApplied = false;
    let activeInputType = '';
    let ignoreMouseUntil = 0;
    let ignoreTouchUntil = 0;

    const valueToPercent = (value) => ((value - minLimit) / (maxLimit - minLimit)) * 100;
    const pointToValue = (event) => {
      const point = event.touches?.[0] || event.changedTouches?.[0] || event;
      const rect = line.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (point.clientX - rect.left) / Math.max(rect.width, 1)));
      return Math.round(minLimit + ratio * (maxLimit - minLimit));
    };

    const sync = () => {
      from = Math.max(minLimit, Math.min(from, to));
      to = Math.min(maxLimit, Math.max(to, from));

      const fromPercent = valueToPercent(from);
      const toPercent = valueToPercent(to);
      filter.dataset.currentMin = String(from);
      filter.dataset.currentMax = String(to);
      if (input) input.value = from + ';' + to;
      if (hiddenMin) hiddenMin.value = String(from);
      if (hiddenMax) hiddenMax.value = String(to);

      fromHandle.style.left = fromPercent + '%';
      toHandle.style.left = toPercent + '%';
      if (bar) {
        bar.style.left = fromPercent + '%';
        bar.style.width = Math.max(0, toPercent - fromPercent) + '%';
      }

      const fromText = formatKzt(roundKzt(from));
      const toText = formatKzt(roundKzt(to));
      if (fromLabel) fromLabel.textContent = fromText;
      if (toLabel) toLabel.textContent = toText;
      if (singleLabel) singleLabel.textContent = from === to ? fromText : fromText + ' \u2014 ' + toText;
    };

    const finish = () => {
      if (!activeHandle && priceRangeApplied) return;

      activeHandle = '';
      priceRangeApplied = true;
      filter.classList.remove('dealer-price-dragging');
      applyPriceRangeSoon();
    };

    const begin = (event) => {
      if (!event.target.closest('.prdctfltr_rng_price')) return;
      const now = Date.now();
      if (activeHandle) return;
      if (event.type === 'mousedown' && now < ignoreMouseUntil) return;
      if (event.type === 'touchstart' && now < ignoreTouchUntil) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      activePointerId = event.pointerId ?? null;
      activeInputType = event.type.startsWith('pointer') ? 'pointer'
        : event.type.startsWith('touch') ? 'touch'
          : 'mouse';
      if (activeInputType === 'pointer') {
        ignoreMouseUntil = now + 900;
        ignoreTouchUntil = now + 900;
      }
      if (activeInputType === 'touch') {
        ignoreMouseUntil = now + 900;
      }
      if (activePointerId !== null) {
        filter.setPointerCapture?.(activePointerId);
      }
      const value = pointToValue(event);
      const target = event.target.closest('.irs-slider');
      activeHandle = target?.classList.contains('from') ? 'from'
        : target?.classList.contains('to') ? 'to'
          : Math.abs(value - from) <= Math.abs(value - to) ? 'from' : 'to';

      if (activeHandle === 'from') from = Math.min(value, to);
      if (activeHandle === 'to') to = Math.max(value, from);
      priceRangeApplied = false;
      filter.classList.add('dealer-price-dragging');
      sync();
    };

    const move = (event) => {
      if (!activeHandle) return;
      if (activeInputType === 'pointer' && !event.type.startsWith('pointer')) return;
      if (activeInputType === 'touch' && !event.type.startsWith('touch')) return;
      if (activeInputType === 'mouse' && event.type !== 'mousemove') return;
      if (activePointerId !== null && event.pointerId !== undefined && event.pointerId !== activePointerId) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const value = pointToValue(event);
      if (activeHandle === 'from') from = Math.min(value, to);
      if (activeHandle === 'to') to = Math.max(value, from);
      sync();
    };

    const end = (event) => {
      if (!activeHandle && !event.target.closest?.('.prdctfltr_rng_price')) return;
      if (activeInputType === 'pointer' && !event.type.startsWith('pointer')) return;
      if (activeInputType === 'touch' && !event.type.startsWith('touch')) return;
      if (activeInputType === 'mouse' && event.type !== 'mouseup') return;
      if (activePointerId !== null && event.pointerId !== undefined && event.pointerId !== activePointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (activePointerId !== null) filter.releasePointerCapture?.(activePointerId);
      activePointerId = null;
      activeInputType = '';
      finish();
    };

    const forceEnd = () => {
      activePointerId = null;
      activeInputType = '';
      if (activeHandle) finish();
    };

    const sliderEventOptions = { capture: true, passive: false };
    ['pointerdown', 'mousedown', 'touchstart'].forEach((eventName) => {
      filter.addEventListener(eventName, begin, sliderEventOptions);
    });
    ['mousemove', 'pointermove', 'touchmove'].forEach((eventName) => {
      document.addEventListener(eventName, move, sliderEventOptions);
    });
    ['mouseup', 'pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach((eventName) => {
      document.addEventListener(eventName, end, sliderEventOptions);
      window.addEventListener(eventName, forceEnd, sliderEventOptions);
    });
    document.addEventListener('mouseleave', forceEnd, true);
    document.addEventListener('visibilitychange', forceEnd, true);
    window.addEventListener('blur', forceEnd);

    sync();
  }

  function ensureEmptyMessage() {
    const products = document.querySelector('ul.products');
    if (!products) return null;

    let message = document.querySelector('.dealer-local-empty');
    if (!message) {
      message = document.createElement('div');
      message.className = 'dealer-local-empty';
      message.textContent = 'По выбранным фильтрам товары не найдены';
      products.after(message);
    }

    return message;
  }

  function applyFilters() {
    const filters = selectedFilters();
    const priceRange = selectedPriceRange();
    const products = [...document.querySelectorAll('ul.products li.product')];
    let visible = 0;
    const hasActiveFilters = priceRange.active || Object.values(filters).some((values) => values.length);

    products.forEach((product) => {
      if (product.classList.contains('dealer-discontinued-product')) {
        product.classList.add('dealer-filter-hidden');
        return;
      }

      const matches = Object.entries(filters).every(([filter, values]) => productMatchesFilter(product, filter, values))
        && productMatchesPrice(product, priceRange);
      product.classList.toggle('dealer-filter-hidden', !matches);
      if (matches) visible += 1;
    });

    document.querySelectorAll('.prdctfltr_filter label').forEach((label) => {
      label.classList.toggle('dealer-active', Boolean(label.querySelector('input[type="checkbox"]:checked')));
    });

    updateFilterAvailability(filters, priceRange, products, hasActiveFilters);
    updateProductImagesForSelectedColor(filters);
    syncCatalogFiltersToUrl(filters, priceRange);

    document.querySelectorAll('.dealer-local-clear-filters').forEach((button) => {
      button.classList.toggle('is-visible', hasActiveFilters);
    });

    document.querySelectorAll('.prdctfltr_buttons').forEach((container) => {
      container.classList.toggle('dealer-clear-visible', hasActiveFilters);
    });

    const message = ensureEmptyMessage();
    if (message) message.classList.toggle('is-visible', visible === 0);
  }

  function bindFilters() {
    const setMobileFiltersOpen = (open) => {
      document.body.classList.toggle('dealer-filter-expanded', open);
      document.querySelectorAll('.hidden_filter .widget-area, .hidden_filter .widget-column, .hidden_filter .widget').forEach((node) => {
        node.classList.toggle('active', open);
      });
      document.querySelectorAll('.hidden_button').forEach((button) => {
        button.dataset.dealerOpen = open ? '1' : '0';
        button.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      if (!open) {
        document.querySelectorAll('.prdctfltr_filter.dealer-filter-open').forEach((openFilter) => {
          openFilter.classList.remove('dealer-filter-open');
        });
      }
    };

    if (!filterClickBound) {
      document.addEventListener('click', async (event) => {
        const label = event.target.closest('.prdctfltr_filter label');
        if (!label) return;

        const input = label.querySelector('input[type="checkbox"]');
        if (!input) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        input.checked = !input.checked;

        document.querySelectorAll('.xwc--pf-loader-overlay, .prdctfltr_loader').forEach((node) => node.remove());
        await ensureAllLocalProductsLoaded();
        await ensureCatalogMetaLoaded();
        applyFilters();
      }, true);
      filterClickBound = true;
    }

    if (!filterDropdownBound) {
      document.addEventListener('click', (event) => {
        const mobileButton = event.target.closest('.hidden_button');
        if (mobileButton) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setMobileFiltersOpen(!document.body.classList.contains('dealer-filter-expanded'));
          return;
        }

        const title = event.target.closest('.prdctfltr_widget_title');
        const filter = title?.closest('.prdctfltr_filter');

        if (filter) {
          if (!document.body.classList.contains('dealer-filter-compact')) return;

          event.preventDefault();
          event.stopImmediatePropagation();

          setMobileFiltersOpen(!document.body.classList.contains('dealer-filter-expanded'));
          document.querySelectorAll('.prdctfltr_filter.dealer-filter-open').forEach((openFilter) => {
            openFilter.classList.remove('dealer-filter-open');
          });
          return;
        }

        if (!event.target.closest('.hidden_filter')) {
          setMobileFiltersOpen(false);
        }
      }, true);

      filterDropdownBound = true;
    }

    document.querySelectorAll('.prdctfltr_woocommerce_ordering').forEach((form) => {
      form.addEventListener('submit', (event) => event.preventDefault());
    });

    if (!priceRangeBound) {
      ['mouseup', 'pointerup', 'touchend'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => {
          if (!event.target.closest?.('.prdctfltr_rng_price')) return;

          event.stopImmediatePropagation();
          applyPriceRangeSoon();
        }, true);
      });

      priceRangeBound = true;
    }

    setupLocalPriceSlider();

    document.querySelectorAll('.prdctfltr_rng_price input').forEach((input) => {
      if (input.dataset.dealerPriceBound === '1') return;
      input.dataset.dealerPriceBound = '1';
      ['input', 'change'].forEach((eventName) => {
        input.addEventListener(eventName, async (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          document.querySelectorAll('.xwc--pf-loader-overlay, .prdctfltr_loader').forEach((node) => node.remove());
          await ensureAllLocalProductsLoaded();
          await ensureCatalogMetaLoaded();
          applyFilters();
        }, true);
      });
    });

    document.querySelectorAll('.prdctfltr_filter').forEach((filter) => {
      filter.addEventListener('change', async (event) => {
        const input = event.target.closest('input[type="checkbox"]');
        if (!input) return;

        await ensureAllLocalProductsLoaded();
        await ensureCatalogMetaLoaded();
        applyFilters();
      });
    });

    const resetContainers = [...document.querySelectorAll('.prdctfltr_buttons')];
    const primaryResetContainer = resetContainers[0];
    resetContainers.slice(1).forEach((container) => {
      container.querySelectorAll('.dealer-local-clear-filters').forEach((button) => button.remove());
    });

    if (primaryResetContainer && !primaryResetContainer.querySelector('.dealer-local-clear-filters')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dealer-local-clear-filters';
      button.textContent = 'очистить фильтры';
      button.addEventListener('click', async () => {
        document.querySelectorAll('.prdctfltr_filter input[type="checkbox"]').forEach((input) => {
          input.checked = false;
        });
        resetLocalPriceSlider();
        await ensureAllLocalProductsLoaded();
        await ensureCatalogMetaLoaded();
        applyFilters();
      });
      primaryResetContainer.appendChild(button);
    }
  }

  function addCartLink() {
    if (document.querySelector('.dealer-local-cart-tab')) return;

    const link = document.createElement('a');
    link.className = 'dealer-local-cart-tab';
    link.href = root + 'cart.html';
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', 'РљРѕСЂР·РёРЅР°');
    link.title = 'РљРѕСЂР·РёРЅР°';
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 5h2.1l1.8 10.2a2 2 0 0 0 2 1.65h7.35a2 2 0 0 0 1.94-1.5L20.2 8H7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 20.15h.01M17 20.15h.01" stroke="currentColor" stroke-width="3.1" stroke-linecap="round"/></svg>';
    document.body.appendChild(link);
  }

  function init() {
    addStyle();
    disableRemoteCatalogLoaders();
    guardRemoteFilterAlerts();
    watchFilterMode();
    bindLocalPagination();
    addCartLink();
    hydrateCatalogMeta();
    removeDiscontinuedProducts();
    removeDuplicateProducts();
    convertPriceText(document);
    window.setInterval(() => convertPriceText(document), 300);
    bindFavoriteButtons(document);
    bindFilters();
    restoreCatalogFiltersFromUrl();
    persistCatalogReturnUrl();
    ensureCatalogMetaLoaded().then(applyFilters);
    if (document.body.classList.contains('term-taps')) {
      window.setTimeout(() => {
        ensureAllLocalProductsLoaded().then(() => {
          hydrateCatalogMeta();
          removeDuplicateProducts();
          applyFilters();
          updateFavoritesCount();
        });
      }, 250);
    }
    applyFilters();
    updateFavoritesCount();
    window.setTimeout(() => bindFavoriteButtons(document), 500);
    window.setTimeout(() => bindFavoriteButtons(document), 1500);

    const observer = new MutationObserver((mutations) => {
      let touchedProducts = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'characterData') {
          const parent = mutation.target.parentElement;

          if (parent?.matches?.('.price_label, .irs-min, .irs-max, .irs-from, .irs-to, .irs-single')) {
            queuePriceTextConversion();
          }
        }

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          convertPriceText(node);
          bindFavoriteButtons(node);
          if (node.matches?.('li.product') || node.querySelector?.('li.product')) touchedProducts = true;
        });
      });

      if (touchedProducts) {
        disableRemoteCatalogLoaders();
        hydrateCatalogMeta();
        removeDiscontinuedProducts();
        removeDuplicateProducts();
        applyFilters();
      }
    });

    observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
