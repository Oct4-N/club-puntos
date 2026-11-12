# Club de Puntos: arquitectura técnica (v1.2)

Complementa a `club_puntos_spec.md` (qué hace la app). Acá se define **cómo** se construye y en qué orden. Las reglas de trabajo para Codex están además resumidas en `AGENTS.md`.

**Cambios de v1.1 a v1.2:**
- El canje pasa a ser una lista de **recompensas** configurables (tabla `rewards`). Se eliminan: `products.redeem_points`, `movements.discount_amount_pesos`, `movements.redemption_group_id`, los ajustes `can_redeem_product`, `can_redeem_discount`, `point_value_pesos` y `allow_combined_redemptions`, y los errores `REDEEM_MODE_DISABLED`, `POINT_VALUE_MISSING`, `COMBINED_NOT_ALLOWED` y `PRODUCT_NOT_REDEEMABLE`.
- `movements.product_name` pasa a llamarse `description`; se agregan `movements.reward_id` y `movements.discount_percent`.
- Las reglas de puntos se simplifican: un canje = una recompensa; ya no hay canje combinado ni anulación por grupo.
- Los endpoints de ajustes (`/api/admin/settings`) pasan a la Etapa 6: solo quedan los de backup.
- Node pasa a 24 LTS (24.21.0). `GET /api/health` responde `{ status: "ok" }`.
- La Etapa 0 ya está hecha y validada.

## 1. Resumen

Web app **local**: un servidor chico corre en la PC del local, guarda todo en un archivo SQLite y se usa desde el navegador en `localhost`. Se abre con un acceso directo que lo muestra como ventana de programa (sin barra de direcciones). Todo en TypeScript, una sola herramienta (Node).

| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript (strict) + Vite + Tailwind CSS |
| Íconos | lucide-react |
| Servidor | Node (versión fija, ver 1.1) con **Fastify** + TypeScript |
| Base de datos | SQLite con `better-sqlite3` (síncrono, simple, soporta backup consistente) |
| Validación | Zod, esquemas definidos **una sola vez** en el paquete `shared` y usados por servidor y frontend |
| Sesiones | `@fastify/cookie` + sesiones en memoria del servidor |
| Contraseña | `crypto.scrypt` de Node (sin dependencias extra) |
| Tests | Vitest (reglas de puntos y API con SQLite en memoria) |
| Empaquetado | Carpeta portable con Node incluido + `iniciar.bat` |

### 1.1 Versiones y dependencias

- Fijar la versión **exacta** de Node en `.nvmrc` y en `engines` del `package.json` raíz (**Node 24 LTS, versión exacta `24.21.0`**). La misma versión se usa en desarrollo, en tests y en el `node.exe` de la carpeta portable.
- `better-sqlite3` es un módulo nativo: en la carpeta portable hace falta su binario precompilado para **Windows x64** y esa misma versión de Node. Ya se comprobó en desarrollo que instala y abre una base.
- npm 11 bloquea los scripts de instalación hasta aprobarlos: después de `npm install` hay que correr `npm install-scripts approve better-sqlite3 esbuild` (y, si hace falta, `npm rebuild better-sqlite3 esbuild`). Documentarlo en el README.
- No agregar dependencias que no estén en esta tabla sin avisar y justificar. Preferir lo que ya trae Node o el framework.

## 2. Diagrama general

```
┌──────────────────────────────┐
│ Ventana del navegador (modo  │  React + Tailwind
│ app) en http://localhost:3000│
└───────────────┬──────────────┘
                │ fetch /api/*  (cookie de sesión)
                ▼
┌──────────────────────────────┐
│ Servidor Node (Fastify)      │  escucha solo en 127.0.0.1
│ ├ rutas /api                 │
│ ├ reglas de puntos (puras)   │
│ ├ sirve el frontend compilado│
│ └ tarea diaria de backup     │
└───────┬──────────────┬───────┘
        ▼              ▼
  data/puntos.db   Carpeta de backups
  (SQLite)         (acá se sincroniza Google Drive)
```

Principios:
- El servidor es la **única** puerta a la base. El frontend nunca toca el archivo.
- Las reglas de puntos viven en funciones puras (`pointsRules.ts`) con tests; la API solo las llama dentro de una transacción.
- El archivo vivo (`data/puntos.db`) **no** está dentro de la carpeta de Drive; a Drive solo van **copias fechadas**.
- El servidor se arma con una función `buildApp({ db, config })` que no abre puertos ni archivos por su cuenta; `index.ts` solo la llama y arranca. Así los tests usan SQLite en memoria (`:memory:`).

## 3. Estructura del repositorio

```
club-puntos/
├─ AGENTS.md                         (reglas para Codex)
├─ .nvmrc
├─ docs/
│  ├─ club_puntos_spec.md
│  ├─ club_puntos_arquitectura.md
│  └─ demo/                          (capturas y datos de la demo de Lovable, si existen)
├─ shared/
│  └─ src/
│     ├─ schemas.ts                  (esquemas Zod: DNI, nombres, productos, recompensas, entradas de la API)
│     ├─ types.ts                    (tipos de respuestas de la API)
│     └─ errors.ts                   (códigos de error)
├─ server/
│  ├─ src/
│  │  ├─ index.ts                    (arranque, escucha en 127.0.0.1)
│  │  ├─ app.ts                      (buildApp: arma Fastify y registra rutas)
│  │  ├─ config.ts                   (puerto, rutas de datos y de backup)
│  │  ├─ db/
│  │  │  ├─ connection.ts            (abre SQLite, pragmas)
│  │  │  ├─ migrate.ts               (aplica migraciones en orden, usa PRAGMA user_version)
│  │  │  └─ migrations/
│  │  │     └─ 0001_init.sql
│  │  ├─ domain/
│  │  │  ├─ pointsRules.ts           (sumar, canjear, anular, recompensas disponibles) + tests
│  │  │  ├─ errors.ts                (DomainError, mensajes en español y códigos HTTP)
│  │  │  └─ names.ts                 (normalizar nombres y texto de búsqueda)
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ customers.ts
│  │  │  ├─ products.ts
│  │  │  ├─ rewards.ts
│  │  │  ├─ movements.ts
│  │  │  └─ admin.ts                 (ajustes de backup, backup, exportar CSV, cambiar credenciales)
│  │  ├─ services/
│  │  │  ├─ settings.ts              (leer y escribir ajustes tipados)
│  │  │  ├─ session.ts               (sesiones en memoria, límite de intentos)
│  │  │  ├─ backup.ts                (db.backup() + rotación)
│  │  │  └─ csv.ts
│  │  └─ cli/
│  │     └─ reset-password.ts        (recuperación de acceso desde la PC del local)
│  └─ tests/
├─ web/
│  ├─ index.html
│  ├─ vite.config.ts                 (proxy /api al servidor en desarrollo)
│  └─ src/
│     ├─ main.tsx
│     ├─ App.tsx
│     ├─ styles/tokens.css           (paleta cálida; ver sección 6)
│     ├─ lib/
│     │  ├─ api.ts                   (envoltorio tipado de /api)
│     │  ├─ format.ts                (fechas, nombres, porcentajes)
│     │  └─ strings.ts               (textos en español)
│     ├─ components/                 (Button, Card, Toast, ConfirmDialog, PointsBadge)
│     └─ features/
│        ├─ auth/        SetupPage, LoginPage
│        ├─ customers/   CustomersPage, NewCustomerForm, CustomerList, CustomerCard,
│        │               PurchaseButtons, RedeemPanel, HistoryList
│        ├─ products/    ProductsPage, ProductsTable, RewardsTable
│        └─ settings/    SettingsPage
├─ scripts/
│  ├─ iniciar.bat                    (arranca el servidor y abre la ventana)
│  ├─ detener.bat                    (cierra el servidor)
│  ├─ recuperar-clave.bat            (ejecuta cli/reset-password)
│  └─ build-portable.ts              (arma la carpeta portable)
├─ data/                             (ignorada por git: puntos.db, backups locales)
└─ package.json                      (workspaces: shared, server, web)
```

Scripts de `package.json` raíz (nombres fijos, los usan todas las etapas): `dev`, `build`, `typecheck`, `lint`, `test`.

## 4. Base de datos

SQLite, un archivo. Al abrir: `PRAGMA foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000`. La versión del esquema se guarda en `PRAGMA user_version` (no en `settings`); `migrate.ts` aplica en orden los archivos `NNNN_*.sql` pendientes, cada uno dentro de una transacción.

```sql
CREATE TABLE customers (
  id          INTEGER PRIMARY KEY,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  dni         TEXT NOT NULL UNIQUE,
  phone       TEXT,
  birth_date  TEXT,
  points      INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  archived    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  earn_points INTEGER NOT NULL CHECK (earn_points > 0),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE rewards (
  id               INTEGER PRIMARY KEY,
  name             TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('product','discount')),
  cost_points      INTEGER NOT NULL CHECK (cost_points > 0),
  product_id       INTEGER REFERENCES products(id),   -- obligatorio en 'product'; en 'discount' es opcional e informativo
  discount_percent INTEGER CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
  sort_order       INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  CHECK (type <> 'product'  OR (product_id IS NOT NULL AND discount_percent IS NULL)),
  CHECK (type <> 'discount' OR discount_percent IS NOT NULL)
);

CREATE TABLE movements (
  id               INTEGER PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES customers(id),
  product_id       INTEGER REFERENCES products(id),
  reward_id        INTEGER REFERENCES rewards(id),
  description      TEXT NOT NULL,                 -- copia del nombre al momento: del producto en compras, de la recompensa en canjes
  type             TEXT NOT NULL CHECK (type IN ('earn','redeem_product','redeem_discount','void')),
  points           INTEGER NOT NULL CHECK (points <> 0),  -- positivo suma, negativo resta
  discount_percent INTEGER CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
  voids_id         INTEGER UNIQUE REFERENCES movements(id),  -- si es 'void', a cuál anula
  created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK ((type = 'void') = (voids_id IS NOT NULL))
);
CREATE INDEX idx_movements_customer ON movements(customer_id, created_at DESC);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 4.1 Claves de `settings`

Los valores se guardan como texto. La migración `0001` inserta los valores por defecto. `services/settings.ts` los lee y escribe con tipos.

| Clave | Valor por defecto | Significado |
|---|---|---|
| `backup_dir` | `''` | Carpeta de backups; vacío = `data/backups/` |
| `last_backup_at` | `''` | Fecha y hora del último backup exitoso |
| `last_backup_error` | `''` | Mensaje del último fallo; vacío si el último salió bien |
| `username` | *(no existe hasta el setup inicial)* | Nombre de usuario |
| `password_hash` | *(no existe hasta el setup inicial)* | `scrypt` con sal |

Que **no exista** la fila `password_hash` significa "falta la configuración inicial". Todo lo relativo al canje vive en la tabla `rewards`, no en `settings`.

### 4.2 Decisiones

- `customers.points` es el saldo guardado para consultar rápido. **Siempre** se modifica en la misma transacción que inserta el movimiento, y debe coincidir con la suma de `movements.points` de ese cliente (se prueba en los tests).
- `movements` guarda `description`, `points` y, cuando corresponde, `discount_percent`, `product_id` y `reward_id` en el momento de la operación, así cambiar o quitar un producto o una recompensa no altera el historial. En un canje, `product_id` copia el de la recompensa (puede ser `NULL` en un descuento "en toda la compra").
- Un canje de recompensa de tipo `product` genera un movimiento `redeem_product`; uno de tipo `discount`, un `redeem_discount`. Ambos con `points` negativo igual al costo.
- Una recompensa está **disponible** si `active = 1` y, si tiene `product_id`, ese producto tiene `active = 1`. Solo las disponibles se ofrecen y se pueden canjear.
- Quitar productos o recompensas = poner `active = 0`. Nunca se borran filas.
- Anular = insertar un movimiento `void` con `points` opuesto, `voids_id` apuntando al original y copiando `product_id`, `reward_id`, `description` y `discount_percent`. La restricción `UNIQUE` en `voids_id` impide anular dos veces; el `CHECK` impide que un movimiento no-`void` tenga `voids_id`. No se puede anular un `void`.
- Un movimiento está "anulado" si existe otro con `voids_id` igual a su `id`.
- Fechas y horas se guardan como texto en hora local del servidor (`YYYY-MM-DD HH:MM:SS`). Es válido porque hay una sola PC.
- Datos iniciales cargados por la migración `0001`: los productos Cucurucho, Barquillo, 1/4 kg, 1/2 kg, 1 kg y las recompensas "Cucurucho gratis", "Barquillo gratis" y "50% en 1 kg" (ver spec, sección 4.2). Las recompensas referencian a los productos por nombre, no por id fijo.
- Constante del sistema (en `config.ts`): `VOID_WINDOW_DAYS = 7`.

## 5. Servidor

### 5.1 Endpoints

Todas las rutas salvo `health` y las de `auth/status`, `auth/setup` y `auth/login` exigen sesión (desde la Etapa 5; antes de eso el servidor es solo para desarrollo).

| Método y ruta | Qué hace |
|---|---|
| `GET /api/health` | `{ status: "ok" }` |
| `GET /api/auth/status` | `{ needsSetup, authenticated }` |
| `POST /api/auth/setup` | `{ username, password }`: crea las credenciales. Solo funciona si todavía no existen; si no, 409 |
| `POST /api/auth/login` | Valida usuario y contraseña, crea la cookie de sesión |
| `POST /api/auth/logout` | Cierra la sesión |
| `GET /api/customers?q=&archived=` | Lista y busca. Sin `archived`: solo activos. Con `archived=1`: incluye archivados. Máximo 50 resultados |
| `POST /api/customers` | Crea cliente. Si el DNI existe, 409 `CUSTOMER_DNI_EXISTS` con el cliente existente (incluye si está archivado) |
| `GET /api/customers/:id` | Cliente + `nextReward` + `affordableRewards` |
| `PATCH /api/customers/:id` | Edita nombre, apellido, DNI, celular, fecha de nacimiento, o archiva y restaura (`archived`). Un DNI repetido responde 409 |
| `GET /api/customers/:id/movements?limit=&before=` | Historial paginado (`limit` por defecto 20, `before` = id del último movimiento recibido). Cada item incluye `voided` y `canVoid` |
| `POST /api/customers/:id/earn` | `{ productId }`: suma puntos de una unidad |
| `POST /api/customers/:id/redeem` | `{ rewardId }`: canjea una recompensa |
| `POST /api/movements/:id/void` | Anula un movimiento |
| `GET /api/products` | Productos activos, ordenados por `sort_order` |
| `POST /api/products` | Crea producto (queda al final del orden) |
| `PATCH /api/products/:id` | Edita nombre y puntos que suma, o desactiva (`active: false`) |
| `POST /api/products/reorder` | `{ ids: number[] }`: fija el orden de los productos activos |
| `GET /api/rewards` | Recompensas **disponibles** (activas y con su producto activo), ordenadas por `sort_order` |
| `POST /api/rewards` | Crea recompensa (queda al final del orden). El cuerpo se valida según el tipo |
| `PATCH /api/rewards/:id` | Edita nombre, tipo, costo, producto y porcentaje, o desactiva (`active: false`) |
| `POST /api/rewards/reorder` | `{ ids: number[] }`: fija el orden de las recompensas activas |
| `GET /api/admin/settings` | `{ backupDir, lastBackupAt, lastBackupError }` (nunca devuelve credenciales) *(Etapa 6)* |
| `PATCH /api/admin/settings` | Actualiza `backupDir` *(Etapa 6)* |
| `POST /api/admin/backup` | Hace un backup ahora *(Etapa 6)* |
| `GET /api/admin/export.csv?type=customers\|movements` | Exporta a CSV *(Etapa 6)* |
| `POST /api/admin/credentials` | Cambia el nombre de usuario y/o la contraseña (pide la contraseña actual) *(Etapa 6)* |

Formas de las respuestas (tipos en `shared/src/types.ts`):
- `GET /api/customers/:id` → `{ customer, nextReward: { reward, missingPoints } | null, affordableRewards: Reward[] }`. Ambos consideran solo recompensas disponibles. `nextReward` es la más barata que todavía no le alcanza; `null` si le alcanza para todas o no hay recompensas disponibles.
- `earn` → `{ customer, movement }`.
- `redeem` → `{ customer, movement }`.
- `void` → `{ customer, movement }` (la anulación creada).

La pantalla del cliente arma la lista de canje con `GET /api/rewards` y marca como deshabilitadas las que no están en `affordableRewards`.

Cuerpo de recompensa (`POST` y `PATCH`, validado con Zod en `shared`): `{ name, type, costPoints, productId?, discountPercent? }`. Si `type = 'product'`: `productId` obligatorio y sin `discountPercent`. Si `type = 'discount'`: `discountPercent` obligatorio (entero 1 a 100) y `productId` opcional. Si se indica `productId`, el producto debe existir y estar activo.

### 5.2 Errores

Formato: `{ error: { code, message, details? } }`, con `message` en español listo para mostrar. Los códigos viven en `shared/src/errors.ts` y los mensajes y el estado HTTP en `server/src/domain/errors.ts`.

| Código | HTTP | Cuándo |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Entrada inválida (Zod) |
| `UNAUTHORIZED` | 401 | Sin sesión o credenciales incorrectas |
| `NOT_FOUND` | 404 | No existe el cliente, producto, recompensa o movimiento |
| `CUSTOMER_DNI_EXISTS` | 409 | DNI repetido (`details.customer` trae el existente) |
| `SETUP_ALREADY_DONE` | 409 | Ya hay credenciales |
| `ALREADY_VOIDED` | 409 | El movimiento ya fue anulado |
| `CANNOT_VOID_VOID` | 422 | Se intentó anular una anulación |
| `VOID_WINDOW_EXPIRED` | 422 | Pasaron más de 7 días |
| `VOID_NEGATIVE_BALANCE` | 422 | Anular dejaría saldo negativo |
| `CUSTOMER_ARCHIVED` | 422 | Operación sobre un cliente archivado |
| `PRODUCT_INACTIVE` | 422 | Producto desactivado (al sumar puntos, o al asociarlo a una recompensa) |
| `REWARD_INACTIVE` | 422 | Recompensa desactivada, o su producto desactivado |
| `INSUFFICIENT_POINTS` | 422 | El saldo no alcanza para la recompensa |
| `RATE_LIMITED` | 429 | Demasiados intentos de login |

### 5.3 Reglas de puntos (`pointsRules.ts`)

Funciones puras, sin acceso a la base. Cuando una regla no se cumple lanzan `DomainError(code)`; la API lo traduce a la respuesta de 5.2.

- `isRewardAvailable(reward, product)` → `true` si la recompensa está activa y, si tiene producto, ese producto está activo. El servidor la usa para filtrar las recompensas antes de llamar a las demás funciones.
- `applyEarn(balance, product)` → nuevo saldo y movimiento a insertar (`earn`). Falla si el producto está inactivo.
- `applyRedeem({ balance, reward, product })` → nuevo saldo y movimiento a insertar (`redeem_product` o `redeem_discount` según el tipo, con `points` negativo igual al costo, `description` con el nombre de la recompensa, y `discount_percent` y `product_id` copiados). Falla con `REWARD_INACTIVE` si la recompensa no está disponible y con `INSUFFICIENT_POINTS` si `balance < cost_points`. Con saldo exactamente igual al costo, funciona.
- `planVoid({ balance, movement, now, windowDays })` → movimiento `void` a insertar y nuevo saldo. `movement` trae un campo `voided` (true si ya existe una anulación de ese movimiento), porque la función no accede a la base. Falla si el movimiento es un `void` (`CANNOT_VOID_VOID`), ya está anulado (`ALREADY_VOIDED`), tiene más de `windowDays` días (`VOID_WINDOW_EXPIRED`; exactamente 7 días todavía se puede) o el saldo quedaría negativo (`VOID_NEGATIVE_BALANCE`).
- `nextReward(balance, rewards)` → la recompensa **más barata que todavía no le alcanza** y cuántos puntos le faltan; `null` si ya le alcanza para todas o no hay recompensas. Ante igual costo, gana la de menor `sort_order`. Recibe solo recompensas disponibles. Alimenta el mensaje "Le faltan X pts para…".
- `affordableRewards(balance, rewards)` → las recompensas disponibles que puede canjear hoy (costo menor o igual al saldo).

Cada operación de la API corre dentro de `db.transaction(...)`: lee el saldo, llama a la regla, inserta el movimiento y actualiza `customers.points`.

### 5.4 Autenticación y seguridad

- El servidor escucha **solo en `127.0.0.1`**; otros equipos de la red no pueden conectarse. Además rechaza peticiones cuyo encabezado `Host` no sea `localhost` o `127.0.0.1` con el puerto configurado (defensa contra DNS rebinding).
- **Configuración inicial:** si no existe `password_hash`, `GET /api/auth/status` devuelve `needsSetup: true` y el frontend muestra `SetupPage`. `POST /api/auth/setup` solo funciona en ese estado. Nombre de usuario: 3 a 30 caracteres sin espacios; contraseña: mínimo 6 caracteres.
- La contraseña se guarda con `scrypt` y sal en `settings.password_hash`; el nombre de usuario en `settings.username`. Ninguna credencial se escribe en el código.
- **Sesión:** cookie `HttpOnly`, `SameSite=Strict`, con un identificador aleatorio. Las sesiones viven en la memoria del servidor (si el servidor se reinicia hay que volver a entrar) y vencen por inactividad (8 horas). El botón "Salir" la cierra.
- Límite simple de intentos de login en memoria (5 fallidos, espera de 30 segundos, `RATE_LIMITED`).
- Validación con Zod en todas las entradas. Consultas siempre parametrizadas.
- **Recuperación:** `cli/reset-password.ts` se ejecuta con `recuperar-clave.bat`, pide nuevo usuario y contraseña por consola, abre la base directamente y actualiza `settings`. No borra ni modifica otros datos.
- Datos personales (DNI, celular): la PC debe tener usuario de Windows con clave y el disco no debe quedar accesible a cualquiera.

### 5.5 Búsqueda y nombres

- `names.ts` exporta `normalizeText(s)` (minúsculas, sin tildes, espacios colapsados) y `cleanName(s)` (quita espacios sobrantes).
- La búsqueda de clientes trae los no archivados (o todos, con `archived=1`), compara `normalizeText` del texto buscado contra nombre, apellido, "nombre apellido" y DNI (coincidencia parcial) y devuelve hasta 50. Para la escala de una heladería no hace falta índice.
- Los nombres se guardan limpios y se muestran con mayúscula inicial por palabra (`format.ts` en el frontend).

### 5.6 Backups (`services/backup.ts`)

- Se usa la API `db.backup()` de `better-sqlite3`, **no** copiar el archivo a mano: con `WAL` activo, una copia de archivos puede quedar inconsistente.
- Destino: `backup_dir` de `settings` (por defecto `data/backups/`; en el local se apunta a una carpeta dentro de Google Drive para escritorio). Se edita desde Ajustes. Nombre: `puntos_YYYY-MM-DD.db`. Dos backups el mismo día sobrescriben el del día.
- Cuándo: al iniciar el servidor si no hay backup del día, una vez cada 24 h mientras corre, y con el botón "Hacer backup ahora".
- Rotación: se conservan las últimas 30 copias.
- Si el destino no existe o falla, la app **sigue funcionando**: guarda el mensaje en `last_backup_error` y muestra un aviso visible en Ajustes y en la pantalla principal (banda discreta). El aviso desaparece cuando un backup sale bien.
- Restaurar: ejecutar `detener.bat`, reemplazar `data/puntos.db` (y borrar `puntos.db-wal` y `puntos.db-shm` si existen) por una copia, y volver a abrir con `iniciar.bat`. Se documenta en el README.

## 6. Frontend

- Una sola pantalla principal con dos pestañas (Clientes, Productos y puntos), igual que la demo. Ajustes se abre desde el encabezado. El frontend decide qué mostrar al arrancar con `GET /api/auth/status`: `SetupPage`, `LoginPage` o la app.
- Estado del servidor con `fetch` y un hook propio simple (`useCustomers`, `useProducts`, `useRewards`, `useSettings`); no hace falta una librería de datos para esta escala. Cualquier respuesta 401 lleva al login.
- Los errores de la API se muestran con `error.message` en un toast; no se inventan textos de error en el frontend.
- Estilos: tokens en `tokens.css`. Si existe `docs/demo/`, se toman de ahí. Si no, usar estos valores iniciales (fondo crema, tarjeta de cliente con degradado rojo-naranja, botones redondeados, tipografía serif para títulos):

```css
:root {
  --color-bg: #fff7ed;
  --color-surface: #ffffff;
  --color-text: #3b1f12;
  --color-muted: #8a6a5a;
  --color-primary: #dc2626;
  --color-secondary: #f97316;
  --gradient-card: linear-gradient(135deg, #dc2626, #f97316);
  --radius: 1rem;
  --font-title: Georgia, "Times New Roman", serif;
}
```

- Toasts breves tras cada operación; `ConfirmDialog` para canjear y anular. La confirmación de un descuento recuerda que se aplica a mano sobre la compra.
- `RedeemPanel` muestra la lista de recompensas disponibles (nombre, tipo, costo), con las que no alcanzan deshabilitadas, y desaparece si no hay ninguna (ver spec 5.2).
- `ProductsPage` tiene dos tablas editables: `ProductsTable` (puntos que suma cada producto) y `RewardsTable` (recompensas), ambas con guardado por fila, orden con flechas y desactivar (ver spec 5.3).
- Accesibilidad básica: foco visible, botones grandes, orden de tabulación lógico (Enter en el buscador abre el primer resultado; el foco vuelve al buscador después de cada operación).

## 7. Cómo se ejecuta en el local

- **Desarrollo**: `npm run dev` levanta `shared` en modo watch, el servidor (en `127.0.0.1:3001`) y Vite juntos, con Vite haciendo proxy de `/api` al servidor.
- **Producción**: `npm run build` compila `shared`, `server` y `web`; el servidor sirve los archivos estáticos de `web/dist`.
- **Carpeta portable** (`build-portable.ts`): incluye el servidor compilado, el frontend, `node.exe`, el binario de `better-sqlite3` para Windows x64 y los `.bat`. Así la PC del local **no necesita instalar Node** ni nada más. Debe ejecutarse en Windows o descargar el binario precompilado correcto.
- **`iniciar.bat`**: arranca el servidor en segundo plano (si no estaba corriendo), sin dejar una consola abierta, y abre `msedge` o `chrome` con `--app=http://localhost:3000`. Se crea un acceso directo en el escritorio y otro en la carpeta de inicio de Windows para que arranque con la PC.
- **`detener.bat`**: cierra el servidor (se usa antes de restaurar un backup).
- **`recuperar-clave.bat`**: ver 5.4.
- Si el puerto está ocupado, el servidor lo informa en pantalla en lugar de fallar en silencio.
- Rutas de datos: `data/` junto al programa; se puede cambiar con la variable de entorno `DATA_DIR`. Puerto por defecto `3000`, configurable con `PORT`.

## 8. Calidad

- Tests unitarios obligatorios para `pointsRules.ts`:
  - sumar con producto activo e inactivo;
  - canjear una recompensa de producto y una de descuento con saldo de sobra, con saldo exactamente igual al costo y con saldo insuficiente;
  - canjear una recompensa inactiva y una de producto cuyo producto está desactivado;
  - el movimiento de canje guarda descripción, tipo, puntos negativos, porcentaje y producto;
  - `isRewardAvailable` en sus cuatro combinaciones (recompensa activa o no, producto activo o no, y sin producto);
  - anular: una compra, un canje (devuelve los puntos), dos veces, una anulación, con 8 días (falla), con exactamente 7 días (funciona) y dejando saldo negativo;
  - `nextReward` y `affordableRewards`, incluidos los casos "ya le alcanza para todas", "sin recompensas" y empate de costos.
- Tests de los esquemas Zod de recompensa: producto gratis sin producto (falla), descuento sin porcentaje (falla), porcentaje 0 o 101 (falla), descuento sin producto (válido).
- Tests de API con SQLite en memoria: DNI duplicado (y archivado), restaurar cliente, saldo siempre igual a la suma de movimientos, historial intacto al editar un producto o una recompensa (nombre, costo, porcentaje, desactivar), operaciones sobre cliente archivado (sumar y canjear), canje de recompensa inactiva, productos y recompensas iniciales.
- Tests de autenticación (Etapa 5): setup solo una vez, login correcto e incorrecto, límite de intentos, rutas sin sesión rechazadas, `Host` inválido rechazado.
- Test del backup: genera archivo, se abre y tiene los mismos datos.
- Prueba manual por etapa con los criterios de aceptación de la spec (sección 8).
- Antes de entregar al local: prueba de restauración de un backup en otra carpeta y prueba del portable en una PC sin Node.

## 9. Etapas de implementación con prompts para Codex

Cada etapa se hace en una rama o sesión aparte y se revisa antes de pasar a la siguiente. Prompt base para todas (reemplazar N):

> Leé `AGENTS.md`, `docs/club_puntos_spec.md` y `docs/club_puntos_arquitectura.md`. Implementá **solo** la etapa N descrita en la sección 9 de la arquitectura. No cambies nada fuera de su alcance y no adelantes trabajo de etapas posteriores. Si algo es ambiguo o los documentos se contradicen, preguntá antes de decidir. Al terminar, corré `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, y resumime qué hiciste, qué decisiones tomaste y qué quedó pendiente.

Nota: si Codex no tiene acceso a internet, no puede instalar dependencias. En ese caso debe agregarlas al `package.json` correspondiente sin tocar `package-lock.json` y avisar; la instalación y la validación completa se hacen en la PC de desarrollo.

**Etapa 0: base del proyecto** *(hecha y validada)*
*Alcance:* monorepo con workspaces `shared`, `server` y `web`. Servidor Fastify + TypeScript con `buildApp` y `/api/health`. Frontend Vite + React + TS + Tailwind. ESLint, Prettier, Vitest, `.nvmrc`, `engines`, `.gitignore` (incluye `data/`), la estructura de la sección 3 (carpetas y archivos vacíos o mínimos donde corresponda) y los scripts `dev`, `build`, `typecheck`, `lint`, `test`. Comprobar que `better-sqlite3` instala y abre una base en memoria.
*No incluye:* base de datos real, rutas de negocio, pantallas.
*Listo cuando:* `npm run dev` abre una página en blanco servida por Vite con `/api/health` respondiendo a través del proxy, `shared` se importa desde servidor y frontend, y typecheck, lint, test y build pasan.

**Etapa 1: base de datos y reglas de puntos**
*Alcance:* conexión SQLite con pragmas, `migrate.ts` con `user_version`, migración `0001_init.sql` con las tablas de la sección 4 (incluida `rewards`), los índices, los productos y recompensas iniciales de 4.2 y los ajustes por defecto de 4.1, `services/settings.ts`, `domain/errors.ts`, `domain/names.ts`, `pointsRules.ts` con **todos** sus tests (sección 8), y los esquemas Zod (incluido el de recompensa, con las reglas de 5.1) y códigos de error en `shared`. `index.ts` abre `data/puntos.db` y aplica las migraciones al arrancar. Los archivos `.sql` deben estar disponibles tanto en desarrollo como en el build (`tsc` no los copia solo).
*No incluye:* rutas de la API.
*Listo cuando:* los tests de reglas y de esquemas pasan, la base se crea sola en `data/puntos.db` al arrancar con los productos, recompensas y ajustes iniciales, y volver a arrancar no repite la migración.

**Etapa 2: API de clientes, productos, recompensas y movimientos**
*Alcance:* todas las rutas de la sección 5.1 **salvo** `auth/*` y `admin/*`. Incluye restaurar clientes, paginación del historial, `reorder` de productos y de recompensas, transacciones y errores en español según 5.2.
*Listo cuando:* los tests de API pasan (DNI duplicado y archivado, saldo coherente, canje de producto gratis y de descuento, canje sin saldo, recompensa inactiva, anulaciones, historial intacto al editar productos y recompensas, datos iniciales).

**Etapa 3: pantalla Clientes**
*Alcance:* `CustomersPage` fiel a la demo (`docs/demo/` si existe): alta, buscador sin tildes, "Ver archivados" y "Restaurar cliente", tarjeta del cliente con "Le faltan X pts para…", botones de compra, `RedeemPanel` con la lista de recompensas, historial con anular, editar y archivar, toasts y confirmaciones. Las recompensas de ejemplo permiten probar el canje sin necesitar todavía la pantalla de edición.
*No incluye:* edición de productos y recompensas, ajustes, login, backups.
*Listo cuando:* se cumplen los criterios de aceptación de la spec que involucran clientes, puntos, canje (producto gratis y descuento) y anulación.

**Etapa 4: pantalla Productos y puntos**
*Alcance:* `ProductsPage` con `ProductsTable` y `RewardsTable`: edición por fila, agregar, ordenar con flechas y desactivar.
*Listo cuando:* la heladería puede crear, editar y quitar productos y recompensas; los cambios se reflejan en las compras y canjes nuevos y no alteran el historial ni los saldos.

**Etapa 5: acceso y seguridad**
*Alcance:* `auth/*` completo, `SetupPage` y `LoginPage`, cookie de sesión, sesiones en memoria, límite de intentos, validación de `Host`, escucha solo en `127.0.0.1`, botón "Salir", manejo de 401 en el frontend, `cli/reset-password.ts` y `scripts/recuperar-clave.bat`. Todas las rutas de datos pasan a exigir sesión.
*Listo cuando:* sin sesión ninguna ruta de datos responde, el setup inicial funciona una sola vez, "Salir" funciona, la recuperación cambia la contraseña sin tocar datos y los tests de autenticación pasan.

**Etapa 6: ajustes, backup y exportación**
*Alcance:* `SettingsPage` completa (carpeta de backups editable, fecha del último y aviso de fallo, exportar CSV, cambiar usuario y contraseña), `services/backup.ts` (automático diario y manual con `db.backup()`, rotación de 30 copias), `services/csv.ts`, banda de aviso en la pantalla principal si el último backup falló, y las rutas `admin/settings`, `admin/backup`, `admin/export.csv` y `admin/credentials`.
*Listo cuando:* se genera un backup fechado que, restaurado en otra carpeta, abre con los mismos datos, y el aviso aparece y desaparece según corresponda.

**Etapa 7: empaquetado e instalación en el local**
*Alcance:* `build-portable.ts`, `iniciar.bat`, `detener.bat`, accesos directos, README con instalación (incluida la aprobación de scripts de npm), restauración, recuperación de acceso y uso de Drive para escritorio.
*Listo cuando:* en una PC sin Node, doble click abre la app como ventana de programa y los datos persisten tras reiniciar la PC.

## 10. Riesgos y consideraciones de evolución

| Tema | Riesgo / pendiente | Plan |
|---|---|---|
| Pérdida de datos | Un solo archivo en una sola PC | Backups diarios a carpeta de Drive + prueba de restauración antes de entregar |
| Drive y archivo en uso | Sincronizar el archivo vivo puede corromperlo | La base vive fuera de Drive; solo se copian backups |
| Módulo nativo | `better-sqlite3` necesita un binario que coincida con la versión de Node y con Windows x64 | Fijar la versión de Node; probar el portable en una PC sin Node |
| Navegador del local | Modo `--app` requiere Edge o Chrome | Edge viene con Windows; verificar en la PC real |
| Antivirus / bloqueo | `.bat` y `node.exe` portable pueden ser marcados | Probar en la PC del local; alternativa: empaquetar con Tauri más adelante |
| Sesiones en memoria | Un reinicio del servidor cierra la sesión | Aceptable en la v1 (se vuelve a entrar con usuario y contraseña) |
| Datos personales | DNI y celular de clientes | Contraseña, usuario de Windows con clave, cuenta de Drive propia con verificación en dos pasos |
| Sin registro por empleado | No se sabe quién hizo cada operación | Fuera de la v1; el historial guarda fecha y detalle, no autor |
| Descuento aplicado a mano | La app no conoce el total de la compra: quien atiende puede aplicar mal el porcentaje | Mensaje claro en la confirmación; la integración con Fudo queda fuera de la v1 |
| Fudo | No se sabe si ofrece API | Averiguar; fuera de la v1 |
| Crecer a varias cajas o acceso remoto | La arquitectura actual es de una sola PC | Si hace falta, el mismo servidor puede escuchar en la red local y/o migrar a Postgres |
