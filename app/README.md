# Thinkfaster — фронтенд

Рабочее место диспетчера: карта объектов, журналы прогнозов и данных,
заявки, логи датчиков, люди и настройки модели — окнами на одном холсте.
React 19 + TypeScript (Create React App), состояние — Zustand, данные — BFF
(`/api/bff/*`) и воронка показаний (`/api/funnel/*`).

- Как устроен код и как добавлять окна, сущности и компоненты —
  [ARCHITECTURE.md](ARCHITECTURE.md).
- Несколько окон одного раздела, тёмная тема, выбор вместо ввода —
  [SPEC.md](SPEC.md).

## Команды

Из папки `app/`:

| команда | что делает |
|---|---|
| `npm ci` | ставит зависимости по `package-lock.json` |
| `npm start` | дев-сервер на http://localhost:3000 |
| `CI=true npm run build` | сборка в `build/` с проверкой типов; предупреждения ESLint считаются ошибками |

Автотестов пока нет: `npm test` запускает Jest, но тестовых файлов в `src/`
нет.

Дев-сервер ходит в API по относительному `/api`: без прокси до BFF окна
покажут ошибку загрузки. Базовый адрес меняется переменной
`REACT_APP_API_BASE_URL`.

## Переменные окружения

Читаются при сборке в `src/core/config/config.ts`:

| переменная | по умолчанию | назначение |
|---|---|---|
| `REACT_APP_APP_NAME` | `Thinkfaster` | заголовок вкладки |
| `REACT_APP_ENVIRONMENT` | `development` | имя окружения |
| `REACT_APP_API_BASE_URL` | `/api` | префикс API (BFF и воронка за одним nginx) |

## Сборка и выкатка

- `deploy/Dockerfile` собирает `app/` на Node 22 и отдаёт `build/` через
  nginx (`nginx/default.conf`).
- Пуш любой рабочей ветки запускает `.github/workflows/deploy-dev.yml`:
  ветка сливается в `dev` и выкатывается на dev-стенд.
- Prod — `.github/workflows/deploy-prod.yml` по пушу в ветку `prod`.
