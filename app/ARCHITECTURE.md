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
- **Grid-workspace вместо свободных перекрывающихся окон** — фиксированная
  сетка со своим состоянием в localStorage (см. «Редизайн: светлая тема и
  grid-workspace» ниже);
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
  когда меняются реальные данные — родитель перерисовывается по многим
  причинам, не связанным с грантами. Секция синхронизирует свои локальные
  `rows` с пропом `grants` через `useEffect` — и с нестабильной ссылкой эта
  синхронизация срабатывала почти на каждый такой ре-рендер, стирая
  несохранённые правки (например, только что добавленную строку) раньше,
  чем пользователь успевал нажать «Сохранить». Фикс: полный `grants`
  прокидывается как есть (стабильная ссылка — `useState` внутри
  `useGrants`, меняется только при реальном рефетче), а
  `ResourceGrantsSection` сам мемоизирует срез по сущности —
  `useMemo(() => allGrants.filter(...), [allGrants, resource.code])`. Урок
  на будущее: если у компонента внутри workspace есть несохранённый
  локальный черновик, синхронизируемый с пропом через `useEffect`, этот
  проп обязан быть referentially stable, иначе случайный ре-рендер родителя
  сотрёт черновик.

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
  списке/сайдбаре.
- Профиль пользователя (`widgets/header/AppHeader.tsx` → `features/auth/UserMenu.tsx`)
  — аватар в шапке стал кликабельной кнопкой, по клику рядом с ней открывается
  попап с `userName`/`email` текущего юзера (`authStore.user`) и кнопкой
  «Выйти» (раньше нигде в UI не вызывался). Закрытие по клику вне попапа/Esc
  вынесено в общий хук `shared/hooks/useDismiss.ts` (реиспользуем для любого
  будущего dropdown/popover, не только этого). Инициалы на самой кнопке и оба
  id в попапе — см. отдельный блок «Учётка vs профиль» ниже, там же
  объясняется, почему это best-effort, а не гарантированно точное значение.
  Оба id в попапе выводятся лейблом на одной строке и значением на
  следующей (`.field-label` + `.user-menu-id-value`, с `word-break:
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
- **Фаза 2 — Прогнозы (сделано).** Собрана заново поверх `entities/object`,
  а не адаптирована из старого мока — реальный `PredictionDto` не совпадает
  по форме с тем, что было раньше (нет поля `risk`, другой набор статусов,
  `object`/`segment` заменяются на `objectId` с резолвом через объекты,
  `why[]` — на `factors[]`/`evidence[]`, `rejectReason` — на `reasonCode`).
  См. «Фаза 2 (прогнозы) — что добавлено» ниже.
- **Фаза 3 — Заявки и работы (сделано).** Новая фича с нуля, включая
  обработку гонки `409 task_already_taken` на `POST /tasks/{id}/take`. См.
  «Фаза 3 (заявки и работы) — что добавлено» ниже.
- **Фаза 4 — Происшествия, график/присутствие/инженеры/бригады (сделано).**
  Пять сущностей за один заход — объём как у Фазы 1–3 вместе, но каждая
  по отдельности небольшая. См. «Фаза 4 (люди) — что добавлено» ниже.
- **Фаза 5 — Админ-настройки модели (сделано).** Четыре сущности
  (`ModelVersion`/`Coefficient`/`RetrainJob`/`IgnoredRange`) под единым
  правом `model_settings:read`/`model_settings:manage`, без отдельных
  create/update/delete, — по духу похоже на «Конфигурацию доступа». См.
  «Фаза 5 (админ-настройки модели) — что добавлено» ниже.

Все пять фаз доменного пласта закрыты — все 13 ресурсов из
`/permissions/me` (см. начало раздела) теперь имеют соответствующее окно в
workspace.

**Осознанно вне scope на неопределённый срок** (не фаза, а отдельный
пласт работы): рендер геометрии (`geometryGeoJson`) объектов/пикетов/слоёв
карты на настоящей карте/схеме — нужен MapLibre/Leaflet или свой SVG-парсер
GeoJSON, следующий уровень поверх CRUD. `entities/object`/`entities/sensor`
сознательно не включают `/objects/{id}/pickets`, `/objects/{id}/layers`,
`/sensors/{id}/links` по этой же причине. Аналогично живые показания
датчиков — `SensorDto` не хранит текущее значение, это снимок потока
`tf-funnel`, которого пока нет; отдельного окна с live-потоком сейчас
не заводили именно поэтому.

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

#### Фаза 2 (прогнозы) — что добавлено

- `entities/prediction` пересобран с нуля под реальный `PredictionDto`:
  `PredictionListItem`/`Prediction`/`PredictionDecision`. Ключевые отличия
  от старого мока:
  - нет поля `risk` — тон бейджа/акцентной полоски (`risk-high/med/low`,
    переиспользованы старые CSS-классы) считается из `probability` через
    `probabilityTone()` в `features/predictions/predictionLabels.ts`
    (пороги 0.75/0.4 — на глаз, не калиброваны под проект, если появится
    осмысленная шкала — менять только там);
  - `objectId: number` вместо строк `object`/`segment` — имя объекта
    резолвится через уже готовый `entities/object` (`useObjects()`
    вызывается и в очереди, и в карточке);
  - `why: string[]` заменён на `factors: PredictionFactorDto[]` +
    `evidence: PredictionEvidenceDto[]` — другой рендер (список
    `feature/value/weight/direction`, evidence сейчас не выводится за
    ненадобностью, но в типе есть).
  - `predictionRepository` **не имеет `create()`** — по докам прогноз в
    норме создаёт модель через Kafka-consumer, а не человек через форму;
    `POST /predictions` на бэкенде существует, но раз это не типовой сценарий
    в UI диспетчера — не оборачиваем его без явной необходимости.
- **Решения** (`take`/`reject`/`mute`/`reopen`) — `POST
  /predictions/{id}/decisions`, `usePrediction.ts` → `decide()`. `reject`
  требует `reasonCode` на бэкенде, но валидные коды нигде не перечислены (в
  отличие от `PredictionType`/`PredictionStatus`) — форма отказа берёт код
  обычным текстовым полем, а не select с угаданными вариантами: не гадать
  закрытый список значений, если бэкенд его не перечисляет явно.
- **Два окна, не одно** — `queue` (`PredictionQueueWindow`, список + фильтры)
  и `pred` (`PredictionDetailWindow`, карточка выбранного). В отличие от
  Users/Groups/Objects/Sensors (где редактирование — админский сценарий,
  вкладка/инлайн-форма достаточно), здесь это основной рабочий экран
  диспетчера: очередь и карточка должны быть видны одновременно, поэтому —
  как и в исходном прототипе — два отдельных окна, синхронизированных через
  `/predictions/:id` (маршрут восстановлен в `AppRoutes.tsx`) и
  `useParams()` внутри `PredictionDetailWindow`, а не через локальный
  `useState` в общем родителе.
- `shared/ui/ProgressBar.tsx` — восстановлен (был удалён вместе со старым
  мок-виджетом, снова нужен для вероятности в карточке прогноза).
- Глобальный `select { ... }` в `styles/index.css` (до этого стилизация
  была только у `.login-form select`) — понадобился для фильтра «Объект» в
  `PredictionFilters.tsx`, который живёт в `.win-toolbar`, а не в форме.

#### Фаза 3 (заявки и работы) — что добавлено

- `entities/task` — `WorkTask`/`WorkTaskListItem` под реальный `WorkTaskDto`:
  вложенные `predictions[]`/`assignments[]`/`reports[]`/`returns[]` как
  отдельные под-сущности (`TaskPrediction`/`TaskAssignment`/`TaskReport`/
  `TaskReturn`) прямо в теле карточки, а не отдельными repository —
  бэкенд отдаёт их только вложенно в `GET /tasks/{id}`, отдельных
  `GET /tasks/{id}/reports` и т.п. нет. `taskRepository` — 10 методов:
  `getList`/`get`/`create`/`update`/`take` плюс по паре
  add/remove-методов на каждый под-список (кроме reports/returns — там
  только add, отчёты и возвраты не редактируются и не удаляются).
- **`take()` не глотает 409.** `POST /tasks/{id}/take` — гонка «кто первый
  взял, тот ведёт»: два диспетчера могут одновременно кликнуть «Взять в
  работу» по одной заявке, и второй получит `409 task_already_taken`. Это
  штатный исход, не ошибка данных, поэтому `taskRepository.take()`
  пробрасывает исключение как есть, а разбирает код `BffErrorCode` (`core/
  errors/bffError.ts`, `task_already_taken` добавлен в union) вызывающий
  код — `useTask.ts`: при этом коде показывается отдельное сообщение
  («Заявку уже взяли в работу — обновляю список») и список обновляется,
  вместо генерического «не удалось сохранить».
- **`resultCode` в отчёте — текстовое поле**, не select: как и
  `reasonCode` у прогнозов (см. Фаза 2), допустимые значения нигде в
  документации не перечислены — не гадаем закрытый список.
- **`engineerId` в форме назначения — это `useUsers()`, не отдельный
  справочник инженеров.** Выделенной ручки со списком инженеров
  (`GET /engineers`) нет — есть только `GET /users/{id}/engineer-profile`
  (для одного пользователя) и `GET /brigades` (для бригад). Раз
  `engineerId` — это по сути `userId`, пикер назначения переиспользует уже
  существующий `useUsers()` из `features/users`, а не заводит новый
  entity/repository ради одного select.
- **Два окна, не одно** (`taskQueue` + `taskDetail`) — тот же паттерн, что
  и у прогнозов (Фаза 2), и по той же причине: это основной рабочий экран
  диспетчера (очередь + карточка должны быть видны одновременно), а не
  админский CRUD-сценарий. Синхронизация — `/tasks/:id` (роут в
  `AppRoutes.tsx`) + `useParams()` в `TaskDetailWindow`, как у предсказаний.
- **`TaskQueueWindow` — единственное окно из пары с формой создания.** В
  отличие от `PredictionQueueWindow` (создание прогнозов — не типовой
  сценарий UI, см. Фаза 2), `POST /tasks` — обычный человеческий сценарий
  (диспетчер заводит заявку по звонку/факту), поэтому здесь есть инлайн-
  форма создания (`showCreate`-тумблер), как в `ObjectsPanel`/`UsersPanel`.
- **Действия внутри карточки заявки гейтятся не только правом, но и
  статусом.** `canEdit = canAct && isTaskActive(task.status)` —
  `tasks:update` даёт право действовать вообще, но формы
  прикрепления/назначения/отчёта/возврата показываются только пока заявка
  реально «в работе» (`inWork`/`assigned`/`engineerWorking`/
  `returnedToWork` — `isTaskActive()` в `features/tasks/taskLabels.ts`), не
  до взятия (`new`) и не после завершения (`completed`/`closed`/
  `cancelled`). Это отдельная проверка от `requiredPermission` окна
  (которая по-прежнему на `read`, см. правило видимости выше) — она про
  состояние конкретной заявки, а не про доступ к разделу.

#### Фаза 4 (люди) — что добавлено

Пять сущностей: `incident`, `schedule`, `assignedObject`, `engineer` (+
`brigade`), `presence`. Собраны в два окна workspace, не пять — `incidents`
(список происшествий с подтверждением) и `people` (выбор сотрудника + три
вкладки: График/Объекты/Инженер), по аналогии с `AssetsWindow`/`AccessWindow`
(вкладки поверх общего выбора, не отдельное окно на каждый ресурс).

- **`incidentRepository` без `create()`** — как и у `predictionRepository`
  (Фаза 2): `POST /incidents` в доке — единственная POST-ручка доменного
  пласта без описанного тела запроса (у всех остальных оно либо показано
  инлайн в таблице эндпоинтов, либо есть отдельный `Create*Request`-тип).
  Происшествие по смыслу — подтверждённое событие, которое логично рождается
  из прогноза/факта на бэкенде, а не заводится вручную. Реализовано только
  `getList`/`get`/`confirm` (`POST /incidents/{id}/confirm`, тело `{
  outcome? }` — документировано явно). `outcome` — текстовое поле, не select
  (не перечислен как закрытый список, тот же принцип, что у `reasonCode`
  прогнозов и `resultCode` заявок).
- **`CreateScheduleEntryRequest` — предположение, явно помечено в коде.**
  `POST /users/{id}/schedule` — вторая (и последняя) POST-ручка без
  описанного тела в доке. В отличие от происшествий, график — однозначно
  человеческий сценарий (диспетчер/админ ставит смену инженеру), без формы
  создания фича была бы бесполезной, поэтому тело запроса выведено из
  `ScheduleEntryDto` за вычетом серверных полей (`id`/`changedBy`/
  `changedAt`): `{ dateFrom, dateTo, status, source? }`. Если бэкенд ждёт
  другой набор полей — это единственное место, которое надо поправить
  (`entities/schedule/types.ts`), сами компоненты не тронуть.
- **`CreateBrigadeRequest` выведен по общему правилу, не угадан с нуля.**
  `BrigadeDto.id` нигде не помечен как внешний (в отличие от `ObjectDto.id`/
  `SensorDto.id`, где это явно оговорено) — значит генерируется бэкендом по
  умолчанию, и тело `POST /brigades` — просто `{ name }`.
- **`engineerRepository.get()` — 404 не ошибка, а нормальный ответ.**
  `GET /users/{id}/engineer-profile` документированно возвращает `404`, если
  профиля ещё нет. Репозиторий пробрасывает исключение как есть (не глотает
  и не превращает в `null` сам) — `useEngineerProfile.ts` разбирает код
  через `parseBffError` и трактует `not_found` как «профиля нет», а не как
  сбой сети. `EngineerTab.tsx` при этом сам решает, показывать форму
  «Создать профиль» или «Изменить профиль» — `PUT` на этом эндпоинте upsert,
  один и тот же вызов `save()` работает для обоих случаев.
- **`specialization: string[]` — поле через запятую, не мультиселект.**
  Как и с `resultCode`/`outcome`, значения нигде не перечислены как закрытый
  список — `EngineerTab.tsx` хранит их в форме одной строкой и
  разбирает/собирает через `.split(',')`/`.join(', ')` на границе с
  repository, а не заводит фейковый enum.
- **`usePresence(userId)` — под конкретного выбранного сотрудника,** не
  список всех: `GET /presence?userIds=` вызывается с одним id, а не грузит
  всех и не фильтрует на фронте — тот же принцип, что у `SensorsPanel`
  (фильтр `objectId` уходит в запрос, а не постфильтром).
- **`/presence` целиком read-only** — `presenceRepository` не имеет write-
  методов вообще, ручки записи на бэкенде нет и не будет (присутствие
  фиксируется сервером на каждый аутентифицированный запрос).

#### Фаза 5 (админ-настройки модели) — что добавлено

Четыре сущности (`modelVersion`, `coefficient`, `retrainJob`,
`ignoredRange`), одно окно `ModelSettingsWindow` с четырьмя вкладками
(`ChipFilterGroup`, тот же приём, что в `AssetsWindow`/`AccessWindow`/
`PeopleWindow`). Гейтинг единый на все вкладки —
`usePermission('model_settings', 'manage')` — доступа `create`/`update`
отдельно не существует, см. доку.

- **Все 4 POST-ручки этого раздела — без описанного тела запроса в доке**
  (единственный раздел, где это верно сразу для всех эндпоинтов, не только
  для одного-двух, как в предыдущих фазах). Тело каждого запроса выведено
  из соответствующего DTO за вычетом серверных полей — то же самое
  рассуждение, что и для `schedule`/`brigade` в Фазе 4, применено здесь
  последовательно ко всем четырём. Если бэкенд ждёт другой набор полей —
  это всегда только `entities/<name>/types.ts`, компоненты не трогать.
- **`ModelVersionDto.id` — исключение из общего правила «id генерирует
  бэкенд».** Формулировка «Дубль `id` → `409 duplicate_code`» в доке имеет
  смысл только если `id` задаёт клиент (человеческая версия вроде `v1.2.3`,
  не UUID) — иначе дубликат генерируемого id структурно невозможен. Поэтому
  `CreateModelVersionRequest` включает `id` как обязательное поле, в отличие
  от `coefficient`/`retrainJob`/`ignoredRange`/`brigade`, где id — обычный
  сервер-генерируемый.
- **`coefficientRepository` без `update()` — версионирование, не
  редактирование.** `POST /coefficients` всегда создаёт новую запись с
  инкрементированным `version` (см. доку §3); `GET` отдаёт только последнюю
  версию на каждый `type`. Форма создания в `CoefficientsTab.tsx` поэтому
  всегда «Сохранить новую версию», не «Изменить», даже если коэффициент
  этого типа уже есть.
- **`retrainJobRepository` — только заявка, не запуск.** `POST
  /retrain-jobs` создаёт запись со `status: "requested"`; сам процесс
  переобучения делает `tf-model` асинхронно, BFF (и фронт) её не
  дожидаются и не управляют — нет отмены/повтора с фронта, этого нет в
  доке. `paramsJson` — сырой JSON-текст без схемы (тот же паттерн, что
  `geometryGeoJson` у объектов), поэтому `<textarea>`, а не структурная
  форма.
- **`IgnoredRangesTab.tsx` показывает поле `objectId`/`sensorId` условно**
  по выбранному `scope` (`all`/`object`/`sensor`) — по доке они обязательны
  только при соответствующем значении `scope`, поле для неактуального
  случая не показывается вовсе (а не «показать оба сразу и понадеяться на
  бэкенд»).

## Редизайн: светлая тема и grid-workspace

После того как все пять доменных фаз были готовы, интерфейс переделан по
двум осям: цвет и механика окон. Прицел — не разработчики, а диспетчеры,
многие немолодые и не привыкшие к софту с перетаскиванием/наложением окон,
поэтому свободный drag/resize/z-index заменён на предсказуемую фиксированную
сетку, а разделы переехали в постоянно видимый список слева вместо тогглов
в верхнем тулбаре.

### Светлая тема

Практически весь `src/styles/index.css` уже был завязан на CSS custom
properties в `:root` (`--bg`/`--surface`/`--text`/`--cyan` и т.д.), поэтому
смена темы — это замена значений токенов, а не переписывание правил.
Ориентир — Dozzle: белые/светло-серые поверхности, один синеватый акцент
(бывший `--cyan`), приглушённые border вместо теней. Отдельно облегчены три
места с плоским `rgba(0, 0, 0, 0.3x)` box-shadow (попап меню пользователя,
`.win`, карточка логина) — на тёмном фоне они читались как мягкая тень, на
белом были бы жёстким пятном.

### Grid-workspace вместо свободных окон

Раньше у каждого окна было собственное `{x, y, width, height, z}`
(`stores/workspace/windowsStore.ts`, ныне удалён) — окна можно было тащить
и накладывать друг на друга произвольно, состояние держал URL
(`core/workspace/workspaceUrlSerializer.ts` + `widgets/workspace/
useWorkspaceUrlSync.ts`, тоже удалены). Теперь workspace — это матрица
(равномерная сетка, как в таблице/CSS Grid, а не рекурсивное дерево сплитов
как у тайлинговых оконных менеджеров): у всех окон в одной колонке — общая
ширина, у всех окон в одной строке — общая высота, окна никогда не
перекрываются, ровно одно окно на клетку.

- **`core/workspace/gridTypes.ts`** — `GridTrack {id, size}` (колонка или
  строка, `id` — не индекс, переживает вставку в середину без сдвига
  остальных), `GridCell {columnId, rowId, windowId}` (`windowId: null` —
  пустая клетка), `GridState {version, columns, rows, cells}` (`cells` —
  плотный: одна запись на каждую пару колонка×строка).
- **`core/workspace/gridConfig.ts`** — захардкоженные, специально
  подобранные на глаз константы: `MAX_AUTO_COLUMNS = 3` (порог, после
  которого автоалгоритм и кнопка «добавить колонку» переходят на новую
  строку), `DEFAULT_COLUMN_SIZE`/`DEFAULT_ROW_SIZE`/`MIN_TRACK_SIZE`/
  `DIVIDER_SIZE`/`ADD_TRACK_SIZE`. Если понадобится другая сетка — менять
  только здесь.
- **`core/workspace/gridStorage.ts`** — узкая граница ввода-вывода
  (`GridStorage { load(), save() }`), сейчас единственная реализация —
  `localStorageGridStorage` (ключ `kontur_grid_v1`, с версионированием: при
  несовпадении `GridState.version` сохранённое состояние отбрасывается, а
  не роняет приложение). Когда появится бэкенд для раскладки — это
  единственное место, которое меняется (новая реализация `GridStorage`,
  стор не трогается) — тот же приём, что `authApi`/`permissionsApi` уже
  используют для остального I/O.
- **`stores/workspace/gridStore.ts`** — вся логика размещения:
  - `placeWindowAuto(windowId)` — скан слева-направо/сверху-вниз в поисках
    пустой клетки; если сетка заполнена — новая колонка справа, а если
    колонок уже `MAX_AUTO_COLUMNS` — новая строка снизу вместо неё.
  - `placeWindowAt(windowId, targetWindowId, direction)` — ручной оверрайд
    (drag-and-drop из сайдбара на правый/нижний край существующего окна):
    новая колонка сразу справа от цели или новая строка сразу под ней.
    **Не проверяет `MAX_AUTO_COLUMNS`** — это осознанный выбор
    пользователя, а не эвристика, ей ограничение не навязывается.
  - `removeWindow` очищает `windowId` у клетки, но не удаляет саму
    строку/колонку — освободившаяся клетка просто доступна для следующего
    `placeWindowAuto`. Удаление пустых строк/колонок не реализовано —
    не просили, добавление есть, удаления нет.
  - `resizeColumn`/`resizeRow` — тащит один трек, без zero-sum сдвига
    соседей (`.workspace` и так скроллится).
  - `addColumn`/`addRow` — ручное «добавить колонку/строку» (кнопки `+` на
    правом/нижнем краю сетки), независимо от размещения окна;
    `addColumn` возвращает `null`, если упёрлись в `MAX_AUTO_COLUMNS`.
  - Все манипуляции — через чистые функции над `GridState`
    (`insertColumnAt`/`insertRowAt`/`withWindowPlaced`/`withWindowRemoved`
    и т.д.), сам стор — тонкая обвязка `set()`/`get()` поверх них.
- **`widgets/workspace/WorkspaceCanvas.tsx`** — рендерит CSS Grid по
  `grid.columns`/`grid.rows`: между каждой парой реальных треков — трек-
  разделитель шириной `DIVIDER_SIZE` (`[col][divider][col][divider][col]`),
  так что разделитель — обычный DOM-элемент, а не оверлей с ручной
  математикой. Реальный трек `i` живёт на CSS grid line `2i+1`, разделитель
  между `i` и `i+1` — на `2i+2`. Плюс два крайних трека шириной
  `ADD_TRACK_SIZE` для кнопок «+» (добавить колонку/строку).
- **`widgets/workspace/GridColumnDivider.tsx`/`GridRowDivider.tsx`** —
  drag-resize разделителя тем же приёмом, что раньше был в `Window.tsx`
  (`pointerdown` → `setPointerCapture` → `pointermove` меняет размер трека
  → `pointerup`), без новой зависимости (в `package.json` нет DnD/resize-
  библиотек).
- **`widgets/workspace/WorkspaceSidebar.tsx`** — заменил
  `WindowToolbar.tsx` (топ-бар с чипами). Список всех видимых по правам
  окон реестра слева, с точкой-индикатором «размещено/нет» (как раньше
  `.win-chip.on`). Клик без сдвига мыши — тоггл (разместить/убрать, как
  раньше `toggleWindow`); сдвиг больше 6px — запускает drag-оверрайд:
  «призрак» с заголовком следует за курсором (`position: fixed;
  pointer-events: none`), `document.elementFromPoint(...).closest(
  '[data-window-id]')` находит окно под курсором (см. `data-window-id` в
  `shared/ui/Window.tsx` — так сайдбару не нужен общий реестр ref'ов с
  канвасом), курсор в крайних 25% ширины/высоты клетки — валидная цель
  (`right`/`bottom`), иначе «мёртвая зона». Отпустили вне клетки или в
  мёртвой зоне → откат на `placeWindowAuto` (drag никогда не «проваливается
  в пустоту» молча).
- **`shared/ui/Window.tsx`** — обрезан до заголовка+закрытия+контента,
  больше не сам себя позиционирует: `x/y/width/height/zIndex/onMove/
  onResize/onFocus` убраны целиком, размер и место теперь целиком задаёт
  родительская grid-клетка. `data-window-id` на корневом `<section>` —
  единственное, что добавилось (hit-test для drag-оверрайда).
- **`core/registry/windowRegistry.ts`** — `WindowDefaultView`
  (`x/y/width/height/open/z`) заменён на один `defaultOpen: boolean`.
  Используется только для затравки самой первой (нет ещё `kontur_grid_v1`
  в localStorage) сетки: `gridStore` прогоняет `placeWindowAuto` по записям
  реестра в порядке объявления для всех `defaultOpen: true` (сейчас —
  `queue`/`pred`, как раньше были единственными `open: true` по умолчанию).
- **URL-синхронизация удалена совсем**, не только переименована —
  состояние теперь только в localStorage (`gridStorage.ts`), как и просили
  явно. `/predictions/:id`/`/tasks/:id` продолжают работать: маршрут
  по-прежнему рендерит `WorkspaceCanvas`, а `PredictionDetailWindow`/
  `TaskDetailWindow` как и раньше читают `useParams()` — это не зависит от
  сетки. Единственный сценарий, который раньше подстраховывал URL-синк и
  теперь не подстраховывает: если пользователь когда-то закрыл `pred`/
  `taskDetail` в своей сохранённой сетке, а потом перешёл по прямой ссылке
  — окно не появится само. Это принятое ограничение (было бы граничным
  случаем и раньше — `<Link>` в `PredictionQueueWindow`/`TaskQueueWindow`
  никогда не дописывали `?windows=...`), не регрессия, специально не
  решалось в этом заходе.
- **Мёртвый CSS вычищен заодно** — `.map-*`/`.schem-*`/`.picket-*`/
  `.anomaly-flag*`/`.sensor-row*`/`.tl-*`(timeline)/`.obj-grid`/`.obj-left`/
  `.obj-right`/`.obj-field-val*`/`.mini-schem*`/`.sensor-tag`/`.stream-row*`/
  `.log-row*` — правила без единого совпадения ни в одном `.tsx` (проверено
  grep'ом), остатки давно удалённых мок-окон (карта/схема/таймлайн/поток/
  лог), чей CSS тогда не подчистили. Единственное исключение —
  `.obj-field-label`, реально используется в `UserMenu.tsx` — переименован
  в `.field-label` (нейтральное имя, больше не привязано к
  несуществующему «object»-окну).

**Осознанно не сделано в этом заходе** (не запрашивалось): удаление пустых
строк/колонок из сетки; перетаскивание уже размещённого окна в другую
клетку через отдельный UI (технически работает — `withWindowPlaced` в
любом случае снимает окно со старой клетки — но целевого аффорданса для
этого нет, кроме как через drag того же раздела из сайдбара); бэкенд для
раскладки (только `GridStorage`-граница под будущую замену).

## Структура директорий

```text
src/
├── app/                     # bootstrap, роутинг, layout — НЕ бизнес-логика
│   ├── App.tsx               # инициализация auth, BrowserRouter
│   ├── AppRoutes.tsx          # список маршрутов
│   ├── NavigationBridge.tsx    # регистрирует useNavigate() для core/routing
│   ├── layouts/
│   │   └── WorkspaceLayout.tsx # Header + shell-body(Sidebar + <Outlet/>)
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
│   ├── registry/windowRegistry.ts        # id → { component, defaultOpen, title }
│   └── workspace/
│       ├── gridTypes.ts                   # GridTrack/GridCell/GridState
│       ├── gridConfig.ts                  # MAX_AUTO_COLUMNS и другие константы сетки
│       └── gridStorage.ts                 # GridStorage — граница I/O, сейчас localStorage
│
├── entities/                # доменные сущности: тип + данные + repository
│   ├── prediction/
│   │   ├── types.ts
│   │   └── predictionRepository.ts    # GET /bff/predictions[/{id}], POST .../decisions — без create()
│   ├── task/
│   │   ├── types.ts                    # WorkTask + вложенные TaskPrediction/Assignment/Report/Return
│   │   └── taskRepository.ts          # GET/POST/PUT /bff/tasks[/{id}], take + add/remove на под-списки
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
│   ├── sensor/
│   │   ├── types.ts
│   │   └── sensorRepository.ts        # GET/POST/PUT /bff/sensors[/{id}] — без links
│   ├── incident/
│   │   ├── types.ts
│   │   └── incidentRepository.ts      # GET /bff/incidents[/{id}], POST .../confirm — без create()
│   ├── schedule/
│   │   ├── types.ts                    # ScheduleEntry, тело create — предположение (см. Фаза 4)
│   │   └── scheduleRepository.ts      # GET/POST/DELETE /bff/users/{id}/schedule[/{entryId}]
│   ├── assignedObject/
│   │   ├── types.ts
│   │   └── assignedObjectRepository.ts # GET/POST/DELETE /bff/users/{id}/assigned-objects[/{objectId}]
│   ├── engineer/
│   │   ├── types.ts                    # EngineerProfile
│   │   └── engineerRepository.ts      # GET/PUT /bff/users/{id}/engineer-profile — upsert, 404 = профиля нет
│   ├── brigade/
│   │   ├── types.ts
│   │   └── brigadeRepository.ts       # GET/POST /bff/brigades
│   ├── presence/
│   │   ├── types.ts
│   │   └── presenceRepository.ts      # GET /bff/presence?userIds= — только чтение
│   ├── modelVersion/
│   │   ├── types.ts                    # id задаёт клиент, не сервер (см. Фаза 5)
│   │   └── modelVersionRepository.ts  # GET/POST /bff/model-versions, POST .../activate
│   ├── coefficient/
│   │   ├── types.ts
│   │   └── coefficientRepository.ts   # GET/POST /bff/coefficients — без update(), версионируется
│   ├── retrainJob/
│   │   ├── types.ts
│   │   └── retrainJobRepository.ts    # GET/POST /bff/retrain-jobs — только заявка, не запуск
│   └── ignoredRange/
│       ├── types.ts
│       └── ignoredRangeRepository.ts  # GET/POST/DELETE /bff/ignored-ranges[/{id}]
│
├── stores/                  # Zustand — только client state
│   ├── auth/authStore.ts
│   ├── workspace/gridStore.ts            # GridState + placeWindowAuto/placeWindowAt/resize*/addColumn/addRow
│   ├── permissions/permissionsStore.ts  # карта "ресурс → права", пустая по умолчанию/на ошибке
│   └── profile/profileStore.ts          # BFF-профиль текущего юзера (best effort, см. раздел выше)
│
├── features/                # пользовательские сценарии поверх entities
│   ├── auth/{LoginForm,UserMenu}.tsx
│   ├── predictions/
│   │   ├── PredictionQueueWindow.tsx      # окно workspace: очередь + фильтры
│   │   ├── PredictionDetailWindow.tsx      # окно workspace: карточка, читает :id из URL
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
│   ├── assets/AssetsWindow.tsx          # окно workspace: вкладки Объекты/Датчики
│   ├── tasks/
│   │   ├── TaskQueueWindow.tsx          # окно workspace: очередь + фильтры + создание
│   │   ├── TaskDetailWindow.tsx          # окно workspace: карточка, читает :id из URL
│   │   ├── taskLabels.ts
│   │   └── hooks/{useTasks,useCreateTask,useTask}.ts
│   ├── incidents/
│   │   ├── IncidentsWindow.tsx          # окно workspace: список + подтверждение
│   │   ├── incidentLabels.ts             # реэкспорт predictionTypeLabels — тот же PredictionType
│   │   └── hooks/{useIncidents,useConfirmIncident}.ts
│   ├── people/
│   │   ├── PeopleWindow.tsx             # окно workspace: выбор сотрудника + вкладки + presence
│   │   ├── ScheduleTab.tsx
│   │   ├── AssignedObjectsTab.tsx
│   │   ├── EngineerTab.tsx               # профиль инженера (upsert) + список/создание бригад
│   │   ├── peopleLabels.ts
│   │   └── hooks/{useSchedule,useAssignedObjects,useEngineerProfile,useBrigades,usePresence}.ts
│   └── modelSettings/
│       ├── ModelSettingsWindow.tsx      # окно workspace: 4 вкладки
│       ├── ModelVersionsTab.tsx
│       ├── CoefficientsTab.tsx
│       ├── RetrainJobsTab.tsx
│       ├── IgnoredRangesTab.tsx
│       ├── modelSettingsLabels.ts
│       └── hooks/{useModelVersions,useCoefficients,useRetrainJobs,useIgnoredRanges}.ts
│
├── widgets/                 # самостоятельные UI-блоки для workspace
│   ├── workspace/{WorkspaceCanvas,WorkspaceSidebar,GridColumnDivider,GridRowDivider}
│   └── header/AppHeader.tsx
│
├── shared/                  # ничего не знает про backend-сущности
│   ├── ui/{Button,Badge,ChipFilterGroup,ProgressBar,StatChip,
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
должно требовать правок `WorkspaceCanvas.tsx` или `WorkspaceSidebar.tsx`*.

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
     defaultOpen: false,
     requiredPermission: [{ resource: 'rooms', action: 'read' }],
   },
   ```

3. Больше ничего менять не нужно — `WorkspaceSidebar` и `WorkspaceCanvas`
   автоматически подхватят новую запись реестра. Раздел появится в списке
   слева; клик по нему разместит окно в свободной клетке сетки (или создаст
   колонку/строку, если сетка уже заполнена — см. «Редизайн: светлая тема и
   grid-workspace» выше).

`id` должен быть уникальным и стабильным — он используется как ключ и в
`localStorage` (`kontur_grid_v1`), и внутри `GridCell.windowId`. Менять `id`
существующего окна нельзя без потери сохранённой раскладки у пользователей.
`defaultOpen: true` стоит ставить только тем окнам, которые должны появиться
сами при самом первом запуске приложения (без сохранённого
`kontur_grid_v1`) — сейчас это `queue`/`pred`, основной рабочий экран
диспетчера.

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

Пример нового store — по образцу `gridStore.ts`:

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

Не смешивать `authStore` и `gridStore` — это два независимых стора, и
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
  `WorkspaceCanvas`/`WorkspaceSidebar` перед рендером каждого окна зовут
  `isWindowVisible(definition, permissions)` — если ни одно право не
  подтверждено, окно не появляется ни в сайдбаре, ни на холсте, независимо
  от того, что лежит в `gridStore` (размещено оно там или нет). У `access`
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
  `/predictions/:id`. Оставшиеся окна (`access`/`config`/`assets` на тот
  момент, позже вернулись `queue`/`pred` — уже на реальном `PredictionDto`,
  см. «Фаза 2» выше) реально ходят в BFF, и `WindowDefinition.requiredPermission`
  стал обязательным полем (раньше было опциональным — «не задано» означало
  «окно на моках, видно всегда»; такого случая больше нет). Если понадобится
  окно-демка для разработки без бэкенда — заводить его отдельно и осознанно,
  а не оставлять по умолчанию.
