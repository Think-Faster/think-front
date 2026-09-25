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
- **Repository** вместо прямой мутации моков — например, `entities/user/userRepository.ts`;
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
  — реальный `GET /permissions/me`; нет прав или запрос упал — карта пустая,
  разделы, завязанные на права, скрыты (см. раздел «Обработка ошибок и
  permissions» ниже, там же — как это работает на уровне окон workspace).
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
- **Окно «Конфигурация доступа»** (`features/config/ConfigWindow.tsx`,
  registry id `config`) — то, что раньше было сознательно отложено ("права —
  связывающая сущность, отдельного окна не нужно"): интерфейс для выдачи прав
  субъектам (пользователям и группам) на существующие сущности. Сгруппировано
  по сущностям, каждая — сворачиваемая секция
  (`ResourceGrantsSection.tsx`):

  - **Свёрнуто** — название сущности + через запятую субъекты, у которых
    есть хоть какие-то права на неё (`нет выданных прав`, если грантов нет).
  - **Развёрнуто** — таблица: строки = субъекты (текущие гранты на эту
    сущность), колонки = типы прав (`create/read/.../manage`), на
    пересечении — чекбокс. Галки можно свободно снимать/ставить прямо в
    таблице. «Добавить» дописывает пустую строку с выбором типа субъекта
    (`ChipFilterGroup`, тот же переключатель, что и в других формах) и
    самого субъекта (`select` из `useUsers`/`useGroups` — те же хуки, что и
    в `AccessWindow`); «Сохранить» — одна кнопка на всю таблицу, за один
    проход по всем строкам: непустой набор галок → `grantRepository.upsert()`
    (маска целиком, апсерт не аддитивный — см.
    `docs/FRONTEND_INTEGRATION.md` §7, поэтому в таблице всегда показан
    полный текущий набор, а не только то, что меняли); все галки сняты у
    уже существующего гранта → `grantRepository.remove()`; строка без
    выбранного субъекта — пропускается. У каждой строки есть и точечный
    «×»: для новой строки — просто убрать её из черновика, для существующей
    — `remove()` сразу, не дожидаясь общего «Сохранить».

  **Важный баг и его фикс** — `entities/grant` (`GrantRepository`) и
  `entities/resource` дают `Grant[]`/`Resource[]` как обычно, но `ConfigWindow`
  раньше передавал в `ResourceGrantsSection` результат
  `grants.filter(...)`, посчитанный прямо в теле `.map()` — то есть новый
  массив на **каждый** рендер `ConfigWindow`. А рендерится оно не только
  когда меняются реальные данные: клик где угодно внутри окна вызывает
  `Window`'s `onPointerDown → focusWindow()`, который меняет `windowsStore`
  и переrenderивает весь `WorkspaceCanvas`, включая `ConfigWindow`. Секция
  синхронизирует свои локальные `rows` с пропом `grants` через `useEffect`
  — и с нестабильной ссылкой эта синхронизация срабатывала почти на каждый
  клик, стирая несохранённые правки (например, только что добавленную
  строку) раньше, чем пользователь успевал нажать «Сохранить». Фикс: полный
  `grants` прокидывается как есть (стабильная ссылка — `useState` внутри
  `useGrants`, меняется только при реальном рефетче), а
  `ResourceGrantsSection` сам мемоизирует срез по сущности —
  `useMemo(() => allGrants.filter(...), [allGrants, resource.code])`. Урок
  на будущее: если у компонента внутри воркспейса есть несохранённый
  локальный черновик, синхронизируемый с пропом через `useEffect`, этот
  проп обязан быть referentially stable, иначе клик по окну сотрёт черновик.

  **Видимость окна vs право редактировать — разные права.** Изначально у
  `config` в реестре стояло `requiredPermission: [{ resource: 'permissions',
  action: 'manage' }]` — окно вообще не появлялось у тех, у кого есть только
  `permissions:read`, хотя внутри компонент и так корректно разводит
  просмотр (список грантов грузится независимо) и редактирование
  (`canManage = usePermission('permissions', 'manage')` прячет чекбоксы/
  кнопки, но не сам список). Правило теперь единое для всех окон в реестре:
  `requiredPermission` — всегда `read` (см. комментарий над
  `WindowDefinition.requiredPermission` в `windowRegistry.ts`), более строгие
  права гейтят конкретные действия внутри окна, а не его видимость в
  списке/тулбаре.
- Профиль пользователя (`widgets/header/AppHeader.tsx` → `features/auth/UserMenu.tsx`)
  — аватар в шапке стал кликабельной кнопкой, по клику рядом с ней открывается
  попап с `userName`/`email` текущего юзера (`authStore.user`) и кнопкой
  «Выйти» (раньше нигде в UI не вызывался). Закрытие по клику вне попапа/Esc
  вынесено в общий хук `shared/hooks/useDismiss.ts` (реиспользуем для любого
  будущего dropdown/popover, не только этого). Инициалы на самой кнопке и оба
  id в попапе — см. отдельный блок «Учётка vs профиль» ниже, там же
  объясняется, почему это best-effort, а не гарантированно точное значение.
  Оба id в попапе выводятся лейблом на одной строке и значением на
  следующей (`.obj-field-label` + `.user-menu-id-value`, с `word-break:
  break-all`), а не в одну строку с лейблом — длинный uuid иначе вылезал за
  границы попапа (`width: 220px`).
- **Logout без бэкенд-ручки.** На бэкенде нет `/auth/logout` — `authStore.logout()`
  чистит куки на фронте (`core/auth/clearAllCookies.ts`) и уходит на `/login`,
  без HTTP-запроса. Важная оговорка прямо в этом файле: если кука с токеном
  `HttpOnly` (а по `docs/FRONTEND_INTEGRATION.md` §2 это так) — JS её в
  принципе не видит и не может стереть; такой logout чистит то, что вообще
  доступно фронту, и сбрасывает состояние приложения, но сама HttpOnly-кука
  протухнет только по её собственному сроку жизни (или когда на бэкенде
  появится настоящая ручка логаута, отдающая `Set-Cookie` с истёкшим сроком).

### Учётка (auth) vs профиль (BFF) — и почему инициалы аватара best-effort

`CurrentUser` (`authStore.user`, из `GET /auth/me`) — это учётка в сервисе
аутентификации: `{ id, userName, email }`, без ФИО. ФИО (`lastName`/
`firstName`) есть только у BFF-профиля (`entities/user`), это отдельная
сущность со своим `id`, связанная с учёткой через `authUserId`.

В BFF нет ручки "мой профиль" — нет способа напрямую спросить "какой
профиль соответствует моей учётке". `stores/profile/profileStore.ts` решает
это единственным доступным способом: после успешной авторизации грузит
`GET /bff/users` и ищет в первой странице список профиль, у которого
`authUserId === authStore.user.id`. Отсюда два практических следствия:

1. Нужны права `users:read` — если их нет, профиль не находится, это не
   ошибка, а ожидаемый исход.
2. Ищем только в первой странице списка (`userRepository.getList()` без
   пагинации) — в организации с большим числом пользователей свой профиль
   может туда не попасть.

И то, и другое — не баг, а осознанное ограничение при отсутствии выделенной
ручки. Всё, что от профиля зависит, рассчитано на его отсутствие:

- **Инициалы на кнопке аватара** (`features/auth/UserMenu.tsx`,
  `getInitials()`) — первая буква фамилии + первая буква имени из профиля,
  если он нашёлся; иначе первые два символа `email` из `CurrentUser`.
- **Попап профиля** — показывает оба id отдельными строками: «ID учётной
  записи» (`authStore.user.id`) и «ID профиля» (`profileStore.profile.id`,
  прочерк, если профиль не найден).
- **Редактирование пользователя** (`UserEditForm.tsx`) — помимо ФИО и
  `isActive`, можно поменять и сам `authUserId` (поле «ID учётной записи»),
  то есть перепривязать профиль к другой учётке. `UpdateUserRequest`
  (`entities/user/types.ts`) соответственно включает `authUserId`.

### Доменные сущности (docs/FRONTEND_INTEGRATION_DOMAIN_MODELS.md)

Помимо RBAC-контура (users/groups/permissions) BFF отдаёт доменный пласт:
объекты и топология, датчики, прогнозы, заявки и работы, происшествия,
график/присутствие/инженеры, админ-настройки модели — семь областей. Это
несопоставимо больше по объёму, чем RBAC. Поэтому интеграция разбита на
фазы, а не сделана одним заходом:

- **Фаза 1 — Объекты + Датчики (сделано).** Базовый CRUD по образцу
  Users/Groups.
- **Фаза 2 — Прогнозы (не сделано).** Мок (`entities/prediction`,
  `features/predictions`, окна `queue`/`pred`) убран целиком, а не
  перевезён на реальные данные — см. «Ни одного окна на локальных моках»
  ниже. Реальный `PredictionDto` в любом случае не совпадает по форме с
  тем, что было в моке (нет поля `risk`, другой набор статусов,
  `object`/`segment` заменяются на `objectId` с резолвом через объекты,
  `why[]` — на `factors[]`/`evidence[]`, `rejectReason` — на `reasonCode`),
  так что фича собирается заново поверх `entities/object`, а не
  адаптируется из старого кода.
- **Фаза 3 — Заявки и работы.** Новая фича с нуля, включая обработку гонки
  `409 task_already_taken` на `POST /tasks/{id}/take`.
- **Фаза 4 — Происшествия, график/присутствие/инженеры/бригады.** Частично
  ложится как расширение `entities/user` (свои вкладки/ручки на
  `/users/{id}/...`), частично — новые лёгкие сущности (`brigade`).
  `/presence` — только чтение, ручки записи нет и не будет (бэкенд сам
  фиксирует присутствие на каждый запрос).
- **Фаза 5 — Админ-настройки модели.** Новая фича по духу похожая на
  «Конфигурацию доступа» (`ModelVersion`/`Coefficient`/`RetrainJob`/
  `IgnoredRange`, единое право `model_settings:read`/`model_settings:manage`
  без отдельных create/update/delete). `Coefficient` версионируется, а не
  редактируется — `POST` всегда создаёт новую запись.

**Осознанно вне scope на неопределённый срок** (не фаза, а отдельный
пласт работы): рендер геометрии (`geometryGeoJson`) объектов/пикетов/слоёв
карты на настоящей карте/схеме — нужен MapLibre/Leaflet или свой SVG-парсер
GeoJSON, следующий уровень поверх CRUD. `entities/object`/`entities/sensor`
сознательно не включают `/objects/{id}/pickets`, `/objects/{id}/layers`,
`/sensors/{id}/links` по этой же причине. Аналогично живые показания
датчиков (`StreamWidget`) — `SensorDto` не хранит текущее значение, это
снимок потока `tf-funnel`, которого пока нет; менять там нечего.

#### Фаза 1 (объекты + датчики) — что добавлено

- `entities/object` — `MonitoredObject` (не `Object`, чтобы не затенять
  встроенный тип), `objectRepository`: `GET/POST/PUT /bff/objects[/{id}]`.
  `id` — внешний, из справочника мониторинга, не генерируется бэкендом —
  поэтому в форме создания это обычное поле ввода, как раньше `authUserId`
  в режиме «Существующая учётная запись».
- `entities/sensor` — `Sensor`, `sensorRepository`:
  `GET/POST/PUT /bff/sensors[/{id}]`, с фильтром `objectId`.
- `features/objects/ObjectsPanel.tsx` + `ObjectEditForm.tsx`, аналогично
  `features/sensors` — тот же паттерн список+создание+редактирование, что и
  Users/Groups. В `SensorsPanel.tsx` есть фильтр «Объект» (select) — в
  отличие от пользователей, датчики без объектного контекста малополезны
  (док сам подсказывает это порядком query-параметров: `objectId` идёт
  первым в `/sensors?objectId=&search=...`).
- `features/assets/AssetsWindow.tsx` — окно workspace «Объекты и датчики»,
  вкладки Объекты/Датчики через `ChipFilterGroup`, тот же композиционный
  приём, что в `AccessWindow` для Users/Groups. `requiredPermission` —
  `objects:read` ИЛИ `sensors:read`.
- Новая CSS-необходимость: `.login-form textarea` (поле «Геометрия
  (GeoJSON)» — просто хранит сырой текст, без валидации/рендера).

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
│   ├── user/
│   │   ├── types.ts
│   │   └── userRepository.ts          # GET/POST/PUT /bff/users[/{id}]
│   ├── group/
│   │   ├── types.ts
│   │   └── groupRepository.ts         # GET/POST /bff/groups, members add/remove
│   ├── resource/
│   │   ├── types.ts
│   │   └── resourceRepository.ts      # GET /bff/resources (только чтение)
│   ├── grant/
│   │   ├── types.ts
│   │   └── grantRepository.ts         # GET/POST /bff/permissions/grants, DELETE .../{id}
│   ├── object/
│   │   ├── types.ts                    # MonitoredObject (не Object!)
│   │   └── objectRepository.ts        # GET/POST/PUT /bff/objects[/{id}] — без pickets/layers
│   └── sensor/
│       ├── types.ts
│       └── sensorRepository.ts        # GET/POST/PUT /bff/sensors[/{id}] — без links
│
├── stores/                  # Zustand — только client state
│   ├── auth/authStore.ts
│   ├── workspace/windowsStore.ts
│   ├── permissions/permissionsStore.ts  # карта "ресурс → права", пустая по умолчанию/на ошибке
│   └── profile/profileStore.ts          # BFF-профиль текущего юзера (best effort, см. раздел выше)
│
├── features/                # пользовательские сценарии поверх entities
│   ├── auth/{LoginForm,UserMenu}.tsx
│   ├── users/
│   │   ├── UsersPanel.tsx              # список + форма создания/редактирования
│   │   ├── UserEditForm.tsx
│   │   └── hooks/{useUsers,useCreateUser,useUpdateUser}.ts
│   ├── groups/
│   │   ├── GroupsPanel.tsx              # список + форма создания
│   │   ├── GroupMembersEditor.tsx        # участники выбранной группы: добавить/убрать
│   │   └── hooks/{useGroups,useCreateGroup,useGroupMembers}.ts
│   ├── access/AccessWindow.tsx          # окно workspace: вкладки Users/Groups
│   ├── config/
│   │   ├── ConfigWindow.tsx              # окно workspace: список сущностей
│   │   ├── ResourceGrantsSection.tsx      # одна сущность: свёрнуто/таблица прав
│   │   ├── permissionLabels.ts
│   │   └── hooks/{useGrants,useResources}.ts
│   ├── objects/
│   │   ├── ObjectsPanel.tsx              # список + форма создания/редактирования
│   │   ├── ObjectEditForm.tsx
│   │   └── hooks/{useObjects,useCreateObject,useUpdateObject}.ts
│   ├── sensors/
│   │   ├── SensorsPanel.tsx              # список (с фильтром по объекту) + создание/редактирование
│   │   ├── SensorEditForm.tsx
│   │   └── hooks/{useSensors,useCreateSensor,useUpdateSensor}.ts
│   └── assets/AssetsWindow.tsx          # окно workspace: вкладки Объекты/Датчики
│
├── widgets/                 # самостоятельные UI-блоки для workspace
│   ├── workspace/{WorkspaceCanvas,WindowToolbar,useWorkspaceUrlSync}
│   └── header/AppHeader.tsx
│
├── shared/                  # ничего не знает про backend-сущности
│   ├── ui/{Button,Badge,ChipFilterGroup,StatChip,
│   │        Breadcrumb,Window,EmptyState}.tsx
│   └── hooks/{useInterval,useClock,useDismiss}.ts
│
└── pages/                   # тонкие точки для роутов
    ├── LoginPage.tsx
    └── WorkspacePage.tsx
```

Правило простое: если код знает про HTTP/axios — он в `core/api` или
`entities/*/repository`. Если знает про конкретную сущность (`User`,
`MonitoredObject`) — он в `entities` или `features`. Если это чистая
презентация без завязки на сущность — он в `shared/ui` или `widgets`.

---

## Как добавить новый переиспользуемый UI-компонент

Переиспользуемый компонент — это компонент, который ничего не знает про
`User`, `MonitoredObject` и т.д., принимает всё через props и просто рендерит
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
   in-memory массив + `delay()`, с тем же самым контрактом методов (так на
   время ручной проверки в браузере временно подменялись `userRepository`/
   `objectRepository` и другие — см. историю коммитов). Когда появится
   BFF-эндпоинт, меняется только тело методов репозитория — компоненты не
   трогаются.

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
   `features/objects/hooks/useObjects.ts`:
   - хук инкапсулирует вызов repository + локальное состояние (фильтры,
     loading);
   - компонент фичи только рендерит то, что вернул хук.
3. Презентационные куски, которые можно переиспользовать в рамках фичи
   (например, форма редактирования), — отдельным файлом (`ObjectEditForm.tsx`),
   а не встроены в один большой компонент.
4. Не создавать отдельный файл на каждую мелочь, если она нигде больше не
   переиспользуется — как `GroupMembersEditor.tsx` объединяет разметку списка
   участников и формы добавления без отдельного файла на каждую половину.

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
   `features/<feature>` компонент вместо чистого widget (как `access`,
   `config` и `assets` в реестре ссылаются на компоненты из
   `features/access`, `features/config`, `features/assets`).

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
- Данные с backend (список пользователей, объектов и т.д.) → не в Zustand, а
  в локальном состоянии хука фичи (`useUsers`, `useObjects`), которое читает
  из repository. Если проект дорастёт до React Query — этот хук достаточно
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
  `authStore.initialize()`/`authStore.login()`). Дефолт и фолбэк на ошибку —
  **пустая карта** (не мок с полным доступом — так было раньше, но это
  пряталось поведение "нет прав" за "полный доступ для тестирования", что
  само по себе баг: пользователь без прав видел разделы, которые не должен).
  Если запрос ещё не завершился, упал по сети, или пользователь реально без
  прав — `hasPermission()` для любого ресурса вернёт `false`, и всё, что от
  неё зависит, останется скрытым. Явной заглушки для локальной разработки без
  BFF больше нет — если он не поднят, разделы, завязанные на права, просто не
  видны, это ожидаемо.

  **Видимость окон workspace, а не только кнопок внутри них.**
  `core/registry/windowRegistry.ts` — у записи реестра есть необязательное
  поле `requiredPermission: { resource, action }[]` (логическое ИЛИ между
  элементами, обязательное — см. «Ни одного окна на локальных моках» ниже).
  `WorkspaceCanvas`/`WindowToolbar` перед рендером каждого окна зовут
  `isWindowVisible(definition, permissions)` — если ни одно право не
  подтверждено, окно не появляется ни в тулбаре, ни на холсте, независимо от
  того, что лежит в `windowsStore` (открыто оно там или нет). У `access`
  (Пользователи и группы) — `requiredPermission: [{ resource: 'users',
  action: 'read' }, { resource: 'groups', action: 'read' }]`.

  **Важно:** `can()`/`usePermission()`/`requiredPermission` имеет смысл
  только для ресурсов, реально зарегистрированных в BFF (`users`, `groups`,
  `permissions`, `objects`, `sensors`, и то, что заведено через
  `POST /resources`). Заводить окно/раздел на локальной mock-сущности,
  которой нет в реальной карте прав, и при этом гейтить его через эту
  функцию — нельзя: реальный `permissions/me` не будет знать такой ресурс, и
  UI молча спрячет то, что не должно быть спрятано (именно поэтому в
  проекте больше нет окон без реального ресурса за ними, см. ниже).

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

- **Нет `RendererRegistry`/generic `Form`/`Table`.** Каждый CRUD-раздел
  (users/groups/objects/sensors) — свои `*Panel.tsx`/`*EditForm.tsx` по
  единому паттерну, а не generic-рендер по схеме поля. Schema-driven
  рендеринг стоит заводить, когда однотипных разделов станет действительно
  много и копипаста между ними станет заметна, а не заранее.
- **Нет `SectionRegistry`.** Пока в приложении один "раздел" — workspace.
  Когда появится второй маршрут верхнего уровня со своим набором прав и
  своим меню (не окно внутри workspace, а отдельная страница), стоит завести
  `core/registry/sectionRegistry.ts` по аналогии с `windowRegistry.ts`.
- **Нет создания новых ресурсов.** `POST /resources` не реализован — окно
  «Конфигурация доступа» (`features/config`) работает с уже существующими
  сущностями (`GET /resources`), заводить новые через UI не просили. Сами
  гранты (`GET/POST /permissions/grants`, `DELETE .../{id}`) — реализованы.
- **Нет удаления users/groups.** `DELETE /users/{id}`, `DELETE /groups/{id}`
  не реализованы — не было в задаче. Список, создание, редактирование
  пользователя (включая `authUserId`) и управление составом группы (и
  пользователи, и вложенные группы) — есть.
- **Нет React Query.** Хуки фич (`useUsers`, `useObjects` и т.д.) сделаны
  вручную поверх repository. Добавлять React Query стоит, когда появится
  реальная надобность в кэшировании/инвалидации между независимыми частями
  экрана, а не заранее.
- **Нет ни одного окна на локальных моках.** Раньше workspace был наполовину
  демо-прототипом (прогнозы, карта, схема объекта, поток данных, журнал
  действий — всё захардкожено, без единого реального эндпоинта). Убраны
  целиком: `entities/prediction`, `features/predictions`,
  `widgets/{map,schematic,timeline,objectCard,stream,actionLog}`, плюс
  осиротевшие после этого `shared/ui/{SensorRow,ProgressBar,Tag}` и маршрут
  `/predictions/:id`. Все три оставшихся окна (`access`/`config`/`assets`)
  реально ходят в BFF, и `WindowDefinition.requiredPermission` стал
  обязательным полем (раньше было опциональным — «не задано» означало «окно
  на моках, видно всегда»; такого случая больше нет). Если понадобится
  окно-демка для разработки без бэкенда — заводить его отдельно и осознанно,
  а не оставлять по умолчанию.
