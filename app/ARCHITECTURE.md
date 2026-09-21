# Архитектура фронтенда

Документ описывает, как устроен код после перехода на слоистую архитектуру
(`core / entities / features / widgets / shared / stores / app`), и как
добавлять новые компоненты, сущности и разделы, не ломая существующую
структуру.

Общие архитектурные принципы (Zustand для client state, Repository для
доступа к данным, единый API Client, workspace как набор окон, регистри вместо
`switch/case`) взяты из `react-frontend-architecture.md`. Этот файл — не
повторение той спецификации, а практическое "как сделать X в этом конкретном
проекте".

## Что было сделано

Раньше весь код лежал плоско в `components/`, `pages/`, `api/`, `data/`, а
состояние окон жило в React Context (`WindowManager`), список окон в
`DashboardPage` был захардкожен восемью повторяющимися блоками
`windows.find(w => w.id === '...')`. Авторизация была `useState` в `App.tsx`,
401 обрабатывался через `window.location.href`.

Это переписано на:

- **Zustand** вместо Context — `stores/auth`, `stores/workspace`;
- **Repository** вместо прямой мутации моков — `entities/prediction/predictionRepository.ts`;
- **Registry** вместо `switch/if по id` — `core/registry/windowRegistry.ts`;
- **URL-сериализацию workspace** — открытые окна попадают в `?windows=...&active=...`,
  что даёт восстановление layout по прямой ссылке;
- **Единый API Client** с обработкой 401 через `core/auth/authEvents.ts` +
  `core/routing/navigation.ts` (без `window.location.href`);
- **shared/ui** — переиспользуемые компоненты, вынесенные из повторяющейся
  разметки (`Button`, `Badge`, `ChipFilterGroup`, `Window` и т.д.).

Стили (`src/styles/index.css`) не менялись — все новые компоненты используют
те же className, что и раньше.

Заодно починена нерабочая часть проекта: `src/index.js`/`src/App.js` (старые
файлы create-react-app) резолвились раньше `index.tsx`/`app/App.tsx` из-за
порядка расширений в `react-scripts`, из-за чего реальный TSX-код никогда не
запускался. Также отсутствовал `tsconfig.json` и `@types/react-dom` — без них
TypeScript не подключался вообще. Все три файла/пакета добавлены.

### Интеграция с BFF (docs/FRONTEND_INTEGRATION.md)

Добавлены первые сущности, реально ходящие в BFF (`think-bff`), а не в
локальные моки:

- `entities/user`, `entities/group` — репозитории поверх BFF:
  `GET/POST /bff/users`, `PUT /bff/users/{id}` (редактирование — только
  lastName/firstName/middleName/isActive, состав групп меняется отдельно, как
  и в BFF-доке); `GET/POST /bff/groups`, `GET /bff/groups/{id}`,
  `POST /bff/groups/{id}/members`, `DELETE /bff/groups/{id}/members/{type}/{id}`
  (добавление/удаление участников — и пользователей, и вложенных групп).
  Удаление пользователя/группы целиком не реализовано — не было в задаче.
- `core/permissions/permissionsApi.ts` + `stores/permissions/permissionsStore.ts`
  — реальный `GET /permissions/me`, с фолбэком на мок-карту прав, пока BFF не
  поднят локально (см. раздел «Обработка ошибок и permissions» ниже).
- `core/errors/bffError.ts` — разбор ответа BFF `{ code, message, details }`
  (отдельно от `httpError.ts`, который классифицирует по HTTP-статусу для
  сервисов, не следующих этому контракту, например `tf-auth`).
- `features/access/AccessWindow.tsx` — окно «Пользователи и группы» в
  workspace, с переключением вкладок через переиспользованный
  `ChipFilterGroup` (`features/users/UsersPanel.tsx` +
  `features/groups/GroupsPanel.tsx`).
- Создание пользователя — два независимых источника учётки, переключатель
  в форме («Новая учётная запись» / «Существующая учётная запись», см.
  `UsersPanel.tsx`, тип `CreateUserInput` в
  `features/users/hooks/useCreateUser.ts`), потому что учётка (сервис
  аутентификации) и профиль (BFF, `authUserId`) — разные сущности с разными
  id:
  - **Новая** — двухшаговый сценарий: сначала `POST /auth/users/create`
    (сервис аутентификации, не BFF; принимает `userName`+`password`+`email`,
    все три обязательны — эндпоинт и контракт), и только при успехе —
    `POST /bff/users` с `authUserId` из ответа. Контракт запроса на регистрацию
    не задокументирован отдельно — сделан по аналогии с `LoginRequest`/
    `CurrentUser`; при расхождении с реальным API правится только
    `RegisterRequest` (`core/auth/types.ts`) и `authApi.register`
    (`core/auth/authApi.ts`), вызывается из одного места.
  - **Существующая** — шаг регистрации пропускается, `authUserId` вводится
    вручную (поле «ID учётной записи») и уходит прямо в `POST /bff/users`.
- Редактирование пользователя (`UsersPanel.tsx` → `UserEditForm.tsx` →
  `hooks/useUpdateUser.ts`) — клик по «Изменить» в строке списка переключает
  панель из режима «добавить» в режим «редактировать» этого пользователя.
- Управление составом группы (`GroupsPanel.tsx` → `GroupMembersEditor.tsx` →
  `hooks/useGroupMembers.ts`) — клик по группе в списке (стилизован через
  переиспользованный `.queue-item`, см. ниже) подгружает её полную карточку
  (`GET /groups/{id}`, с участниками) и показывает два независимых поля для
  добавления участника — «Пользователь» и «Группа» (вложенность), плюс кнопку
  убрать у каждого уже добавленного участника.
- Раздел `permissions` (гранты — кому что выдано) сознательно не получил
  собственного окна/CRUD — по BFF-доку это связывающая сущность, нужная
  позже, когда права будут вешаться на пользователей и группы из UI.
- Профиль пользователя (`widgets/header/AppHeader.tsx` → `features/auth/UserMenu.tsx`)
  — аватар в шапке стал кликабельной кнопкой, по клику рядом с ней открывается
  попап с `userName`/`email` текущего юзера (`authStore.user`) и кнопкой
  «Выйти» (раньше нигде в UI не вызывался). Закрытие по клику вне попапа/Esc
  вынесено в общий хук `shared/hooks/useDismiss.ts` (реиспользуем для любого
  будущего dropdown/popover, не только этого).
- **Logout без бэкенд-ручки.** На бэкенде нет `/auth/logout` — `authStore.logout()`
  чистит куки на фронте (`core/auth/clearAllCookies.ts`) и уходит на `/login`,
  без HTTP-запроса. Важная оговорка прямо в этом файле: если кука с токеном
  `HttpOnly` (а по `docs/FRONTEND_INTEGRATION.md` §2 это так) — JS её в
  принципе не видит и не может стереть; такой logout чистит то, что вообще
  доступно фронту, и сбрасывает состояние приложения, но сама HttpOnly-кука
  протухнет только по её собственному сроку жизни (или когда на бэкенде
  появится настоящая ручка логаута, отдающая `Set-Cookie` с истёкшим сроком).

## Структура директорий

```text
src/
├── app/                     # bootstrap, роутинг, layout — НЕ бизнес-логика
│   ├── App.tsx               # инициализация auth, BrowserRouter
│   ├── AppRoutes.tsx          # список маршрутов
│   ├── NavigationBridge.tsx    # регистрирует useNavigate() для core/routing
│   ├── layouts/
│   │   └── WorkspaceLayout.tsx # Header + WindowToolbar + <Outlet/>
│   └── routing/
│       └── ProtectedRoute.tsx
│
├── core/                    # инфраструктура, не знает о конкретных сущностях
│   ├── config/config.ts       # ENV → AppConfig
│   ├── api/
│   │   ├── client.ts           # единственный axios-инстанс + 401-интерцептор
│   │   └── endpoints.ts        # строки путей backend
│   ├── auth/
│   │   ├── types.ts
│   │   ├── authApi.ts           # HTTP-обёртка над /auth/* (login/register/me — logout нет)
│   │   ├── authEvents.ts        # pub/sub для "случился 401"
│   │   └── clearAllCookies.ts    # используется в authStore.logout()
│   ├── routing/navigation.ts    # navigate() вне React-дерева
│   ├── errors/
│   │   ├── httpError.ts          # classifyError(): по HTTP-статусу (generic/tf-auth)
│   │   └── bffError.ts            # parseBffError()/formatBffErrorMessage(): по { code, message, details } от BFF
│   ├── permissions/
│   │   ├── permissionService.ts   # can()/usePermission()(resource, action)
│   │   └── permissionsApi.ts      # GET /bff/permissions/me
│   ├── registry/windowRegistry.ts        # id → { component, defaultView, title }
│   └── workspace/workspaceUrlSerializer.ts
│
├── entities/                # доменные сущности: тип + данные + repository
│   ├── prediction/
│   │   ├── types.ts
│   │   ├── mockData.ts
│   │   └── predictionRepository.ts    # мок (in-memory), пока нет BFF-эндпоинта
│   ├── user/
│   │   ├── types.ts
│   │   └── userRepository.ts          # GET/POST/PUT /bff/users[/{id}]
│   └── group/
│       ├── types.ts
│       └── groupRepository.ts         # GET/POST /bff/groups, members add/remove
│
├── stores/                  # Zustand — только client state
│   ├── auth/authStore.ts
│   ├── workspace/windowsStore.ts
│   └── permissions/permissionsStore.ts  # карта "ресурс → права", мок-фолбэк
│
├── features/                # пользовательские сценарии поверх entities
│   ├── auth/{LoginForm,UserMenu}.tsx
│   ├── predictions/
│   │   ├── PredictionQueueWindow.tsx
│   │   ├── PredictionDetailWindow.tsx
│   │   ├── PredictionFilters.tsx
│   │   ├── predictionLabels.ts
│   │   └── hooks/{usePredictions,usePrediction}.ts
│   ├── users/
│   │   ├── UsersPanel.tsx              # список + форма создания/редактирования
│   │   ├── UserEditForm.tsx
│   │   └── hooks/{useUsers,useCreateUser,useUpdateUser}.ts
│   ├── groups/
│   │   ├── GroupsPanel.tsx              # список + форма создания
│   │   ├── GroupMembersEditor.tsx        # участники выбранной группы: добавить/убрать
│   │   └── hooks/{useGroups,useCreateGroup,useGroupMembers}.ts
│   └── access/AccessWindow.tsx          # окно workspace: вкладки Users/Groups
│
├── widgets/                 # самостоятельные UI-блоки для workspace
│   ├── workspace/{WorkspaceCanvas,WindowToolbar,useWorkspaceUrlSync}
│   ├── header/AppHeader.tsx
│   ├── map/MapWidget.tsx
│   ├── schematic/SchematicWidget.tsx
│   ├── timeline/TimelineWidget.tsx
│   ├── objectCard/ObjectCardWidget.tsx
│   ├── stream/StreamWidget.tsx
│   └── actionLog/ActionLogWidget.tsx
│
├── shared/                  # ничего не знает про backend-сущности
│   ├── ui/{Button,Badge,ChipFilterGroup,ProgressBar,StatChip,Tag,
│   │        SensorRow,Breadcrumb,Window,EmptyState}.tsx
│   └── hooks/{useInterval,useClock,useDismiss}.ts
│
└── pages/                   # тонкие точки для роутов
    ├── LoginPage.tsx
    └── WorkspacePage.tsx
```

Правило простое: если код знает про HTTP/axios — он в `core/api` или
`entities/*/repository`. Если знает про конкретную сущность (`Prediction`) —
он в `entities` или `features`. Если это чистая презентация без завязки на
сущность — он в `shared/ui` или `widgets`.

---

## Как добавить новый переиспользуемый UI-компонент

Переиспользуемый компонент — это компонент, который ничего не знает про
`Prediction`, `User` и т.д., принимает всё через props и просто рендерит
разметку/стили.

1. Создать файл в `src/shared/ui/MyComponent.tsx`.
2. Все данные — через props, без дефолтных бизнес-значений внутри (дефолты —
   только UI-шные, например `variant = 'default'`).
3. Использовать существующие className из `styles/index.css`, если похожий
   визуальный паттерн уже есть — не плодить новый CSS.

Пример по образцу `Badge.tsx`:

```tsx
// src/shared/ui/Tooltip.tsx
interface TooltipProps {
  text: string;
  children: ReactNode;
}

export default function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="tooltip" title={text}>
      {children}
    </span>
  );
}
```

Если компонент завязан на конкретную сущность (например, «карточка
пользователя» с полями `User`) — он **не** идёт в `shared/ui`. Его место —
`entities/user` (если это стандартное отображение сущности) или
`features/<feature>` (если это часть конкретного сценария). `shared/ui` —
только для настоящих примитивов (кнопка, бейдж, чип, прогресс-бар).

---

## Как добавить новую доменную сущность (entity)

Пример: добавляем сущность `Room` (аналог того, что описано в архитектурном
документе).

1. **Типы** — `src/entities/room/types.ts`:

   ```ts
   export interface Room {
     id: string;
     name: string;
     status: 'active' | 'inactive';
   }
   ```

2. **Repository** — `src/entities/room/roomRepository.ts`. Контракт
   `get/getList/create/update/delete` — реализовывать только то, что реально
   используется (не писать `delete`, если в UI нет кнопки удаления).

   ```ts
   import { apiClient } from '../../core/api/client';
   import { Room } from './types';

   export const roomRepository = {
     async getList(): Promise<Room[]> {
       const { data } = await apiClient.get<Room[]>('/rooms');
       return data;
     },

     async get(id: string): Promise<Room> {
       const { data } = await apiClient.get<Room>(`/rooms/${id}`);
       return data;
     },

     async update(id: string, patch: Partial<Room>): Promise<Room> {
       const { data } = await apiClient.patch<Room>(`/rooms/${id}`, patch);
       return data;
     },
   };
   ```

   Пока нет реального backend-эндпоинта — можно сделать репозиторий как
   `predictionRepository.ts`: in-memory массив + `delay()`, с тем же самым
   контрактом методов. Когда появится BFF-эндпоинт, меняется только тело
   методов репозитория — компоненты не трогаются.

3. **Не обращаться к `apiClient`/`axios` напрямую из компонентов** — только
   через repository. Это единственное жёсткое правило слоя `entities`.

4. Если сущности нужен путь в `core/api/endpoints.ts` — добавить его туда,
   а не хардкодить строку в repository:

   ```ts
   export const endpoints = {
     auth: { ... },
     rooms: {
       list: '/rooms',
       byId: (id: string) => `/rooms/${id}`,
     },
   } as const;
   ```

---

## Как добавить новую feature (пользовательский сценарий)

Feature — это то, что видит и с чем взаимодействует пользователь: форма,
список с фильтрами, панель деталей. Она использует entity (repository, types)
и собирает поведение.

1. Директория `src/features/<feature-name>/`.
2. Хуки для данных — в `hooks/`, по образцу
   `features/predictions/hooks/usePredictions.ts`:
   - хук инкапсулирует вызов repository + локальное состояние (фильтры,
     loading);
   - компонент фичи только рендерит то, что вернул хук.
3. Презентационные куски, которые можно переиспользовать в рамках фичи
   (например, панель фильтров), — отдельным файлом
   (`PredictionFilters.tsx`), а не встроены в один большой компонент.
4. Не создавать отдельный файл на каждую мелочь, если она нигде больше не
   переиспользуется — как `PredictionDetailWindow.tsx` объединяет разметку
   карточки прогноза без отдельного `PredictionDetailPanel.tsx`.

Мини-пример фичи `room-status`:

```text
features/room-status/
├── hooks/useRoomStatus.ts   # roomRepository.getList() + refetch
└── RoomStatusList.tsx        # рендер списка, использует shared/ui Badge и т.д.
```

---

## Как добавить новое окно в Workspace

Это самый частый сценарий добавления функциональности в этот конкретный
проект — рабочая область состоит из независимых окон, и *добавление окна не
должно требовать правок `WorkspaceCanvas.tsx` или `WindowToolbar.tsx`*.

1. Сделать сам виджет — presentational-компонент без пропсов (или с
   пропсами, у которых есть дефолты), в `src/widgets/<name>/<Name>Widget.tsx`.
   Если окну нужны данные конкретной сущности — используйте
   `features/<feature>` компонент вместо чистого widget (как `queue` и `pred`
   в реестре ссылаются на компоненты из `features/predictions`).

2. Зарегистрировать окно в `src/core/registry/windowRegistry.ts`:

   ```ts
   import RoomStatusList from '../../features/room-status/RoomStatusList';

   // ...
   {
     id: 'rooms',
     title: 'Статус помещений',
     component: RoomStatusList,
     defaultView: { x: 20, y: 900, width: 400, height: 300, open: false, z: 18 },
   },
   ```

3. Больше ничего менять не нужно — `WorkspaceCanvas` и `WindowToolbar`
   автоматически подхватят новую запись реестра, `windowsStore` создаст для
   неё runtime-состояние при первом запуске (или возьмёт restored-состояние
   из localStorage/URL, если id уже встречался).

`id` должен быть уникальным и стабильным — он используется как ключ и в
`localStorage` (`kontur_layout_v3`), и в URL (`?windows=...`). Менять `id`
существующего окна нельзя без потери сохранённого layout у пользователей.

---

## Как работать с состоянием (Zustand)

Новый store нужен, только если это client state, который не завязан на
конкретный fetch с backend (см. `react-frontend-architecture.md`, §65).

- Runtime-состояние UI (открытые окна, авторизация, выбранные фильтры,
  видимость модалки) → Zustand store в `stores/<domain>/`.
- Данные с backend (список прогнозов, комнат и т.д.) → не в Zustand, а в
  локальном состоянии хука фичи (`usePredictions`), которое читает из
  repository. Если проект дорастёт до React Query — этот хук достаточно
  переписать внутри, наружу (компоненты) ничего не поменяется.

Пример нового store — по образцу `windowsStore.ts`:

```ts
// src/stores/notifications/notificationsStore.ts
import { create } from 'zustand';

interface Notification { id: string; text: string; }

interface NotificationsState {
  items: Notification[];
  push: (text: string) => void;
  dismiss: (id: string) => void;
}

export const useNotificationsStore = create<NotificationsState>(set => ({
  items: [],
  push: text =>
    set(state => ({ items: [...state.items, { id: crypto.randomUUID(), text }] })),
  dismiss: id =>
    set(state => ({ items: state.items.filter(item => item.id !== id) })),
}));
```

Не смешивать `authStore` и `windowsStore` — это два независимых стора, и
третий домен состояния должен быть третьим стором, а не полем в одном из
существующих (§8, §24 архитектурного документа).

---

## Обработка ошибок и permissions

- Есть два классификатора ошибок — не путать:
  - `core/errors/httpError.ts` → `classifyError(error)` — общий, по HTTP-статусу.
    Годится для всего, что не гарантированно отвечает BFF-контрактом (например
    `tf-auth`, см. `features/auth/LoginForm.tsx`).
  - `core/errors/bffError.ts` → `parseBffError(error)` /
    `formatBffErrorMessage(error, fallback)` — для любого вызова через BFF.
    Читает `{ code, message, details }` из тела ответа (см.
    `docs/FRONTEND_INTEGRATION.md` §3), а не гадает по статусу — `403` там
    означает три разных вещи (`user_not_provisioned` / `user_inactive` /
    `permission_denied`), и это различие теряется, если смотреть только на
    HTTP-код. Пример использования — `features/users/hooks/useUsers.ts`.
- 401 не обрабатывается в компонентах вообще — это происходит централизованно
  в `core/api/client.ts` → `authEvents` → `authStore.handleUnauthorized()` →
  редирект на `/login` через `core/routing/navigation.ts`. Это верно для всех
  трёх auth-кодов 401 (`unauthenticated`/`invalid_token`/`token_refresh_failed`)
  — все три требуют одного и того же действия (на логин), поэтому клиент
  реагирует на сам HTTP-статус, а не парсит `code`.
- Проверка прав — через `core/permissions/permissionService.ts`:
  - `usePermission(resource, action)` — хук, для использования внутри
    компонентов (подписывается на `permissionsStore`, перерисовывает UI, когда
    реальные права придут с бэкенда);
  - `can(resource, action)` — то же самое, но не-реактивно (вне рендера:
    обработчики событий, guard-функции).

  Карта прав грузится через `stores/permissions/permissionsStore.ts` →
  `GET /permissions/me` сразу после успешной авторизации (см.
  `authStore.initialize()`/`authStore.login()`). Пока BFF недоступен (или во
  время локального тестирования без бэкенда) — используется мок-карта прямо в
  `permissionsStore.ts`, поведение осталось прежним ("пока тестируем — держим
  моки"), но как только `/permissions/me` отвечает успешно, реальная карта её
  заменяет.

  **Важно:** `can()`/`usePermission()` имеет смысл только для ресурсов,
  реально зарегистрированных в BFF (`users`, `groups`, `permissions`, и то,
  что заведено через `POST /resources`). Гейтить локальные mock-сущности
  (как раньше `predictions`) через эту функцию нельзя — как только придёт
  настоящая карта прав, в ней просто не будет такого ключа, и UI молча
  спрячет то, что не должно быть спрятано. `predictions` сейчас ничем не
  гейтится по этой причине.

---

## Конфигурация

Все параметры, которые могут отличаться между окружениями, — в
`core/config/config.ts`, читаются из `process.env.REACT_APP_*` с дефолтами
для локальной разработки:

```ts
export const config = {
  appName: process.env.REACT_APP_APP_NAME || 'КОНТУР',
  environment: process.env.REACT_APP_ENVIRONMENT || 'development',
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || '/api',
};
```

Не хардкодить `/api/...` в компонентах или repository — базовый URL берётся
из `config.apiBaseUrl` (уже зашит в `core/api/client.ts`), а конкретные пути
собираются в `core/api/endpoints.ts`. BFF сидит за тем же nginx под
`/api/bff/*` (см. `docs/FRONTEND_INTEGRATION.md` §1) — поэтому это тот же
`apiClient` с `baseURL: '/api'`, просто пути в `endpoints.bff.*` уже содержат
префикс `/bff/...`, второй axios-инстанс не нужен.

---

## Чего сознательно нет (и почему)

Чтобы не переусложнять то, что реально не нужно на этом этапе (см. §99
архитектурного документа):

- **Нет `RendererRegistry`/generic `Form`/`Table`.** Единственная сущность
  сейчас (`Prediction`) отображается кастомными окнами, а не generic CRUD
  таблицей — schema-driven рендеринг полей появится, когда в проекте будет
  реальный CRUD-раздел (список/форма редактирования сущности), а не только
  workspace с мониторингом.
- **Нет `SectionRegistry`.** Пока в приложении один "раздел" — workspace.
  Когда появится второй маршрут верхнего уровня со своим набором прав и
  своим меню (не окно внутри workspace, а отдельная страница), стоит завести
  `core/registry/sectionRegistry.ts` по аналогии с `windowRegistry.ts`.
- **Нет UI для грантов (`/permissions/grants`) и ресурсов (`/resources`).**
  По BFF-доку `permissions` — связывающая сущность (принципал × ресурс →
  права), собственного раздела ей не нужно; UI для выдачи прав
  пользователям/группам — следующий шаг, когда до этого дойдёт очередь.
  `GET /permissions/me` уже используется (гейтинг), остальные
  `/permissions/*` и `/resources` — нет.
- **Нет удаления users/groups.** `DELETE /users/{id}`, `DELETE /groups/{id}`
  не реализованы — не было в задаче. Список, создание, редактирование
  пользователя и управление составом группы (и пользователи, и вложенные
  группы) — есть.
- **Нет React Query.** Хуки фич (`usePredictions`, `usePrediction`) сделаны
  вручную поверх repository. Добавлять React Query стоит, когда появится
  реальная надобность в кэшировании/инвалидации между независимыми частями
  экрана, а не заранее.
