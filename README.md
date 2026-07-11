# OMOIKIRI KZ New Final Beta

Главный репозиторий для продолжения работы над статической beta-версией OMOIKIRI KZ.

## Что внутри

- Полная статическая копия текущей beta-версии сайта.
- Каталоги: мойки, смесители, фильтры, измельчители, дозаторы, аксессуары, OMOIKIRI Home.
- Карточки товаров в `product/`.
- RU/KZ переключатель.
- Цены в тенге.
- Корзина и избранное через локальное хранилище браузера.
- PDF/печать избранного.
- Локальный поиск.
- Рабочие фильтры для моек и смесителей, включая данные, сверенные с `omoikiri.ru`.
- Служебный скрипт синхронизации каталога в `scripts/`.

## Главная папка для работы

Работать дальше нужно из этого репозитория:

```text
C:\Users\madir\Desktop\omoikiri-kz-new-final-beta
```

GitHub:

```text
https://github.com/x9230x/omoikiri-kz-new-final-beta
```

Живое зеркало для просмотра сейчас опубликовано тут:

```text
https://x9230x.github.io/
```

## Как открыть локально

Можно открыть файл напрямую:

```text
index.html
```

Лучше через локальный сервер, чтобы все относительные пути работали одинаково:

```powershell
cd C:\Users\madir\Desktop\omoikiri-kz-new-final-beta
python -m http.server 8080
```

Потом открыть:

```text
http://localhost:8080/
```

## Важные страницы для проверки

```text
/index.html
/sinks/index.html
/taps/index.html
/favorites/index.html
/cart.html
/product/akeno/index.html
/product/daisen-60/index.html
```

## Правило на будущее

Чтобы дома и на этом компьютере не расходились версии, перед началом работы:

```powershell
git pull
```

После правок:

```powershell
git status
git add .
git commit -m "Описание правок"
git push
```

Не продолжать работу из старых папок `omoikiri-local-copy` или `x9230x.github.io`, если цель именно разработка. Этот репозиторий теперь основной.
