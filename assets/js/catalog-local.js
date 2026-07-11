(function () {
  const base = new URL('../', window.location.href).href;

  const products = {
    sinks: [
      ['Daisen 60', 'Мойки', 219880, 'https://omoikiri.kz/upload/iblock/059/0i3wblskztjr6bwx4cx0rlouv9hbpnwg.jpg'],
      ['Akisame 100-2-R', 'Мойки', 615880, 'https://omoikiri.ru/wp-content/uploads/2024/10/akisame-100-2-r-gm.png'],
      ['Mikura', 'Мойки', 187880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/mikura/mikura1.png'],
      ['Steel Side', 'Мойки', 174880, base + 'assets/img/custom/steel-collection-side.png']
    ],
    bathsinks: [
      ['Kawa 50', 'Раковины', 148880, 'https://omoikiri.kz/upload/iblock/177/2lrewzbkrnsu2rccflmpxnbox6qlmg48.jpg'],
      ['Sakaime 60', 'Раковины', 188880, 'https://omoikiri.kz/upload/iblock/25d/md3j3mgdfmvwde28ttbyzahien53d0aw.jpg']
    ],
    taps: [
      ['Kanto', 'Смесители', 355880, 'https://omoikiri.kz/upload/iblock/09a/gp550xuzp1bt7lnhhf7prm9k2rz18bgt.png'],
      ['Tanigawa-SB', 'Смесители', 133880, 'https://omoikiri.kz/upload/iblock/ed4/jskz8qbkjeia8kma2e3vu8o8qidpahi6.jpg'],
      ['Akita', 'Смесители', 168880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/colors/Akita_IB.jpg']
    ],
    filters: [
      ['Pure Drop 2.1.4S', 'Фильтры', 218880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/pure_drop214s.png'],
      ['Pure Drop Lite', 'Фильтры', 109880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/pure_drop_lite.png'],
      ['Pure Drop 1.0', 'Фильтры', 128880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/pure_drop_10.png']
    ],
    disposers: [
      ['Nagare Slim 500', 'Измельчители', 163880, 'https://omoikiri.kz/upload/iblock/dac/qll32vh373vjnm4zww8a0tkjpcczlxp8.jpg'],
      ['Nagare 750', 'Измельчители', 229880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/disposer.png']
    ],
    dispenser: [
      ['Omori', 'Дозаторы', 54880, 'https://omoikiri.kz/upload/iblock/690/fxugpwhw0k2253s7gv9nnh2kmrs1xrju.png'],
      ['Dozator Premium', 'Дозаторы', 62880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/do.png']
    ],
    acs: [
      ['Декоративный элемент', 'Аксессуары', 24880, 'https://omoikiri.kz/upload/iblock/48c/h61ofp8l6w0ds0a2hxfo77073zr8aiy2.png'],
      ['Разделочная доска', 'Аксессуары', 42880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/acs.png']
    ],
    'omoikiri-home': [
      ['Home Decor', 'OMOIKIRI Home', 55880, 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/home.jpg']
    ]
  };

  const copy = {
    sinks: ['Мойки', 'Коллекции моек OMOIKIRI для кухни: сталь, натуральные материалы, цветные решения и рабочие станции.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/natceramic.png'],
    bathsinks: ['Раковины для ванной', 'Раковины OMOIKIRI для ванных комнат в спокойной премиальной эстетике.', 'https://omoikiri.kz/upload/iblock/177/2lrewzbkrnsu2rccflmpxnbox6qlmg48.jpg'],
    taps: ['Смесители', 'Смесители с фильтром, гибким шлангом, душевым режимом и выразительными цветами.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/colors/Kanto_TO.jpg'],
    filters: ['Фильтры', 'Системы очистки воды Pure Drop с ценами в тенге и будущей интеграцией с Bitrix-каталогом.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/pure_drop214s.png'],
    disposers: ['Измельчители', 'Измельчители пищевых отходов для чистой и удобной кухни.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/disposer.png'],
    dispenser: ['Дозаторы', 'Дозаторы и роллматы, которые завершают рабочую зону кухни.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/do.png'],
    acs: ['Аксессуары', 'Аксессуары OMOIKIRI для функциональной и аккуратной мойки.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/acs.png'],
    'omoikiri-home': ['OMOIKIRI Home', 'Предметы для дома, которые продолжают эстетику OMOIKIRI за пределами кухни.', 'https://omoikiri.ru/wp-content/themes/twentynineteen/img/main/home.jpg']
  };

  function money(value) {
    return new Intl.NumberFormat('ru-KZ').format(value) + ' ₸';
  }

  function cart() {
    return JSON.parse(localStorage.getItem('omoikiriCart') || '[]');
  }

  function saveCart(items) {
    localStorage.setItem('omoikiriCart', JSON.stringify(items));
  }

  function addToCart(id, name, price, image) {
    const items = cart();
    const found = items.find((item) => item.id === id);
    if (found) found.qty += 1;
    else items.push({ id, name, price, image, qty: 1 });
    saveCart(items);
  }

  function pageKey() {
    return document.body.dataset.category || 'sinks';
  }

  function render() {
    const key = pageKey();
    const [title, description, hero] = copy[key];
    const list = products[key] || [];

    document.querySelector('[data-title]').textContent = title;
    document.querySelector('[data-description]').textContent = description;
    document.querySelector('[data-hero]').src = hero;
    document.title = title + ' - OMOIKIRI Kazakhstan';

    document.querySelector('[data-products]').innerHTML = list.map((product) => {
      const id = product[0].toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '-');
      return `
        <article class="product-card">
          <a class="product-card__image" href="${base}product/akisame-100-2-r/index.html">
            <img src="${product[3]}" alt="${product[0]}">
          </a>
          <div>
            <p>${product[1]}</p>
            <h2>${product[0]}</h2>
            <strong>${money(product[2])}</strong>
          </div>
          <button type="button" data-add="${id}" data-name="${product[0]}" data-price="${product[2]}" data-image="${product[3]}">В корзину</button>
        </article>
      `;
    }).join('');

    document.querySelectorAll('[data-add]').forEach((button) => {
      button.addEventListener('click', () => {
        addToCart(button.dataset.add, button.dataset.name, Number(button.dataset.price), button.dataset.image);
        button.textContent = 'Добавлено';
        window.setTimeout(() => { button.textContent = 'В корзину'; }, 1200);
      });
    });
  }

  render();
})();
