# Club de Puntos: arquitectura técnica (v1.1)

Complementa a `club_puntos_spec.md` (qué hace la app). Acá se define **cómo** se construye y en qué orden. Las reglas de trabajo para Codex están además resumidas en `AGENTS.md`.

## 1. Resumen

Web app **local**: un servidor chico corre en la PC del local, guarda todo en un archivo SQLite y se usa desde el navegador en `localhost`. Se abre con un acceso directo que lo muestra como ventana de programa (sin barra de direcciones). Todo en TypeScript, una sola herramienta (Node).

| Capa          | Tecnología                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Frontend      | React + TypeScript (strict) + Vite + Tailwind CSS                                                |
| Íconos        | lucide-react                                                                                     |
| Servidor      | Node (versión fija, ver 1.1) con **Fastify** + TypeScript                                        |
| Base de datos | SQLite con `better-sqlite3` (síncrono, simple, soporta backup consistente)                       |
| Validación    | Zod, esquemas definidos **una sola vez** en el paquete `shared` y usados por servidor y frontend |
| Sesiones      | `@fastify/cookie` + sesiones en memoria del servidor                                             |
| Contraseña    | `crypto.scrypt` de Node (sin dependencias extra)                                                 |
| Tests         | Vitest (reglas de puntos y API con SQLite en memoria)                                            |
| Empaquetado   | Carpeta portable con Node incluido + `iniciar.bat`                                               |

### 1.1 Versiones y dependencias

- Fijar la versión **exacta** de Node en `.nvmrc` y en `engines` del `package.json` raíz (Node 24 LTS, 24.21.0). La misma versión se usa en desarrollo, en tests y en el `node.exe` de la carpeta portable.
- `better-sqlite3` es un módulo nativo: en la carpeta portable hace falta su binario precompilado para **Windows x64** y esa misma versión de Node. La Etapa 0 debe comprobar que instala y abre una base en la máquina de desarrollo.
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
│     ├─ schemas.ts                  (esquemas Zod: DNI, nombres, entradas de la API)
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
│  │  │  ├─ pointsRules.ts           (sumar, canjear, anular) + tests
│  │  │  ├─ errors.ts                (DomainError, mensajes en español y códigos HTTP)
│  │  │  └─ names.ts                 (normalizar nombres y texto de búsqueda)
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ customers.ts
│  │  │  ├─ products.ts
│  │  │  ├─ movements.ts
│  │  │  └─ admin.ts                 (settings, backup, exportar CSV, cambiar credenciales)
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
│     │  ├─ format.ts                (pesos es-AR, fechas, nombres)
│     │  └─ strings.ts               (textos en español)
│     ├─ components/                 (Button, Card, Toast, ConfirmDialog, PointsBadge)
│     └─ features/
│        ├─ auth/        SetupPage, LoginPage
│        ├─ customers/   CustomersPage, NewCustomerForm, CustomerList, CustomerCard,
│        │               PurchaseButtons, RedeemPanel, HistoryList
│        ├─ products/    ProductsPage
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
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  earn_points   INTEGER NOT NULL CHECK (earn_points > 0),
  redeem_points INTEGER CHECK (redeem_points IS NULL OR redeem_points > 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE movements (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  product_id   INTEGER REFERENCES products(id),
  product_name TEXT NOT NULL,                 -- copia del nombre al momento; "Descuento" en canjes por descuento
  type         TEXT NOT NULL CHECK (type IN ('earn','redeem_product','redeem_discount','void')),
  points       INTEGER NOT NULL CHECK (points <> 0),  -- positivo suma, negativo resta
  discount_amount_pesos INTEGER CHECK (discount_amount_pesos IS NULL OR discount_amount_pesos > 0),
  redemption_group_id TEXT,                   -- agrupa canjes de una misma operación combinada; las anulaciones lo copian
  voids_id     INTEGER UNIQUE REFERENCES movements(id),  -- si es 'void', a cuál anula
  created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  CHECK ((type = 'void') = (voids_id IS NOT NULL))
);
CREATE INDEX idx_movements_customer ON movements(customer_id, created_at DESC);
CREATE INDEX idx_movements_group ON movements(redemption_group_id);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### 4.1 Claves de `settings`

Los valores se guardan como texto; los booleanos como `'1'` / `'0'`. La migración `0001` inserta los valores por defecto. `services/settings.ts` los lee y escribe con tipos.

| Clave                        | Valor por defecto                    | Significado                                             |
| ---------------------------- | ------------------------------------ | ------------------------------------------------------- |
| `can_redeem_product`         | `'1'`                                | Canje por producto activado                             |
| `can_redeem_discount`        | `'0'`                                | Canje como descuento activado                           |
| `point_value_pesos`          | `''`                                 | Valor de un punto en pesos entero; vacío = sin cargar   |
| `allow_combined_redemptions` | `'0'`                                | Permite producto + descuento en una operación           |
| `backup_dir`                 | `''`                                 | Carpeta de backups; vacío = `data/backups/`             |
| `last_backup_at`             | `''`                                 | Fecha y hora del último backup exitoso                  |
| `last_backup_error`          | `''`                                 | Mensaje del último fallo; vacío si el último salió bien |
| `username`                   | _(no existe hasta el setup inicial)_ | Nombre de usuario                                       |
| `password_hash`              | _(no existe hasta el setup inicial)_ | `scrypt` con sal                                        |

Que **no exista** la fila `password_hash` significa "falta la configuración inicial".

### 4.2 Decisiones

- `customers.points` es el saldo guardado para consultar rápido. **Siempre** se modifica en la misma transacción que inserta el movimiento, y debe coincidir con la suma de `movements.points` de ese cliente (se prueba en los tests).
- `movements` guarda `points`, `product_name` y, cuando corresponde, `discount_amount_pesos` en el momento de la operación, así cambiar o quitar un producto o modificar el valor del punto no altera el historial.
- Los canjes que se hacen juntos en una misma operación comparten `redemption_group_id` (un UUID generado por el servidor). Un canje de una sola modalidad lleva `NULL`.
- `products.redeem_points` admite `NULL`: el producto suma puntos, pero no se ofrece para canje por producto.
- Anular = insertar un movimiento `void` con `points` opuesto, `voids_id` apuntando al original y copiando `product_id`, `product_name`, `discount_amount_pesos` y `redemption_group_id`. La restricción `UNIQUE` en `voids_id` impide anular dos veces; el `CHECK` impide que un movimiento no-`void` tenga `voids_id`. No se puede anular un `void`.
- Un movimiento está "anulado" si existe otro con `voids_id` igual a su `id`.
- Fechas y horas se guardan como texto en hora local del servidor (`YYYY-MM-DD HH:MM:SS`). Es válido porque hay una sola PC.
- Productos iniciales cargados por la migración `0001`: Cucurucho, Barquillo, 1/4 kg, 1/2 kg, 1 kg (ver spec, sección 4.2).
- Constante del sistema (en `config.ts`): `VOID_WINDOW_DAYS = 7`.

## 5. Servidor

### 5.1 Endpoints

Todas las rutas salvo las de `auth/status`, `auth/setup` y `auth/login` exigen sesión (desde la Etapa 5; antes de eso el servidor es solo para desarrollo).

| Método y ruta                                         | Qué hace                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                     | `{ ok: true }`                                                                                                                     |
| `GET /api/auth/status`                                | `{ needsSetup, authenticated }`                                                                                                    |
| `POST /api/auth/setup`                                | `{ username, password }`: crea las credenciales. Solo funciona si todavía no existen; si no, 409                                   |
| `POST /api/auth/login`                                | Valida usuario y contraseña, crea la cookie de sesión                                                                              |
| `POST /api/auth/logout`                               | Cierra la sesión                                                                                                                   |
| `GET /api/customers?q=&archived=`                     | Lista y busca. Sin `archived`: solo activos. Con `archived=1`: incluye archivados. Máximo 50 resultados                            |
| `POST /api/customers`                                 | Crea cliente. Si el DNI existe, 409 `CUSTOMER_DNI_EXISTS` con el cliente existente (incluye si está archivado)                     |
| `GET /api/customers/:id`                              | Cliente + `nextRedeemable` + `affordableProducts` + `discountValuePesos`                                                           |
| `PATCH /api/customers/:id`                            | Edita nombre, apellido, DNI, celular, fecha de nacimiento, o archiva y restaura (`archived`). Un DNI repetido responde 409         |
| `GET /api/customers/:id/movements?limit=&before=`     | Historial paginado (`limit` por defecto 20, `before` = id del último movimiento recibido). Cada item incluye `voided` y `canVoid`  |
| `POST /api/customers/:id/earn`                        | `{ productId }`: suma puntos de una unidad                                                                                         |
| `POST /api/customers/:id/redeem`                      | `{ productId?, discountPoints? }`: al menos uno. Si vienen ambos exige `allow_combined_redemptions`. Todo en una única transacción |
| `POST /api/movements/:id/void`                        | Anula un movimiento (y todo su grupo si es un canje combinado)                                                                     |
| `GET /api/products`                                   | Productos activos, ordenados por `sort_order`                                                                                      |
| `POST /api/products`                                  | Crea producto (queda al final del orden)                                                                                           |
| `PATCH /api/products/:id`                             | Edita nombre y puntos, o desactiva (`active: false`)                                                                               |
| `POST /api/products/reorder`                          | `{ ids: number[] }`: fija el orden de los productos activos                                                                        |
| `GET /api/admin/settings`                             | Ajustes de canje (nunca devuelve credenciales)                                                                                     |
| `PATCH /api/admin/settings`                           | Actualiza modalidades de canje, valor del punto y permiso para combinar                                                            |
| `POST /api/admin/backup`                              | Hace un backup ahora                                                                                                               |
| `GET /api/admin/export.csv?type=customers\|movements` | Exporta a CSV                                                                                                                      |
| `POST /api/admin/credentials`                         | Cambia el nombre de usuario y/o la contraseña (pide la contraseña actual)                                                          |

Formas de las respuestas (tipos en `shared/src/types.ts`):

- `GET /api/customers/:id` → `{ customer, nextRedeemable: { product, missingPoints } | null, affordableProducts: Product[], discountValuePesos: number | null }`. `affordableProducts` está vacío si el canje por producto está desactivado. `discountValuePesos` es `puntos × valor del punto`, o `null` si el canje por descuento está desactivado o sin valor cargado.
- `earn` → `{ customer, movement }`.
- `redeem` → `{ customer, movements: Movement[] }`.
- `void` → `{ customer, movements: Movement[] }` (las anulaciones creadas).

### 5.2 Errores

Formato: `{ error: { code, message, details? } }`, con `message` en español listo para mostrar. Los códigos viven en `shared/src/errors.ts` y los mensajes y el estado HTTP en `server/src/domain/errors.ts`.

| Código                   | HTTP | Cuándo                                                   |
| ------------------------ | ---- | -------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400  | Entrada inválida (Zod)                                   |
| `UNAUTHORIZED`           | 401  | Sin sesión o credenciales incorrectas                    |
| `NOT_FOUND`              | 404  | No existe el cliente, producto o movimiento              |
| `CUSTOMER_DNI_EXISTS`    | 409  | DNI repetido (`details.customer` trae el existente)      |
| `SETUP_ALREADY_DONE`     | 409  | Ya hay credenciales                                      |
| `ALREADY_VOIDED`         | 409  | El movimiento ya fue anulado                             |
| `CANNOT_VOID_VOID`       | 422  | Se intentó anular una anulación                          |
| `VOID_WINDOW_EXPIRED`    | 422  | Pasaron más de 7 días                                    |
| `VOID_NEGATIVE_BALANCE`  | 422  | Anular dejaría saldo negativo                            |
| `CUSTOMER_ARCHIVED`      | 422  | Operación sobre un cliente archivado                     |
| `PRODUCT_INACTIVE`       | 422  | Producto desactivado                                     |
| `PRODUCT_NOT_REDEEMABLE` | 422  | Producto sin costo de canje                              |
| `REDEEM_MODE_DISABLED`   | 422  | Modalidad de canje desactivada                           |
| `POINT_VALUE_MISSING`    | 422  | Descuento sin valor de punto cargado                     |
| `COMBINED_NOT_ALLOWED`   | 422  | Producto + descuento con combinación desactivada         |
| `INSUFFICIENT_POINTS`    | 422  | El saldo no alcanza (para el total en canjes combinados) |
| `RATE_LIMITED`           | 429  | Demasiados intentos de login                             |

### 5.3 Reglas de puntos (`pointsRules.ts`)

Funciones puras, sin acceso a la base. Cuando una regla no se cumple lanzan `DomainError(code)`; la API lo traduce a la respuesta de 5.2.

- `applyEarn(balance, product)` → nuevo saldo y movimiento a insertar. Falla si el producto está inactivo.
- `applyRedeemProduct(balance, product, settings)` → falla si el canje por producto está desactivado, el producto no admite canje o `balance < redeem_points`.
- `applyRedeemDiscount(balance, points, settings)` → falla si el canje por descuento está desactivado o falta el valor del punto; valida que `points` sea un entero mayor que cero y no supere el saldo; calcula `discount_amount_pesos = points × valor del punto`.
- `planRedeem({ balance, product?, discountPoints?, settings })` → combina las anteriores en una sola operación:
  - Si vienen producto y descuento y `allow_combined_redemptions` está desactivado → `COMBINED_NOT_ALLOWED`.
  - **Valida el total**: `redeem_points + discountPoints` no puede superar el saldo. No alcanza con validar cada parte por separado.
  - Devuelve la lista de movimientos a insertar y el saldo final. Si son dos movimientos, comparten un `redemption_group_id`; si es uno, queda `NULL`.
- `planVoid({ balance, movement, groupMovements, now, windowDays })` → falla si el movimiento es un `void` (`CANNOT_VOID_VOID`), ya está anulado (`ALREADY_VOIDED`), superó la ventana (`VOID_WINDOW_EXPIRED`) o el saldo quedaría negativo (`VOID_NEGATIVE_BALANCE`). Si el movimiento tiene grupo, anula todos los del grupo y valida el saldo final con la suma de todas las anulaciones.
- `nextRedeemable(balance, products)` → el producto canjeable (con `redeem_points`) **más barato que todavía no le alcanza** y cuántos puntos le faltan; `null` si ya le alcanza para todos o no hay productos canjeables. Alimenta el mensaje "Le faltan X pts para…".
- `affordable(balance, products)` → productos activos con costo de canje que puede canjear hoy.

Cada operación de la API corre dentro de `db.transaction(...)`: lee el saldo, llama a la regla, inserta los movimientos y actualiza `customers.points`.

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
- Destino: `backup_dir` de `settings` (por defecto `data/backups/`; en el local se apunta a una carpeta dentro de Google Drive para escritorio). Nombre: `puntos_YYYY-MM-DD.db`. Dos backups el mismo día sobrescriben el del día.
- Cuándo: al iniciar el servidor si no hay backup del día, una vez cada 24 h mientras corre, y con el botón "Hacer backup ahora".
- Rotación: se conservan las últimas 30 copias.
- Si el destino no existe o falla, la app **sigue funcionando**: guarda el mensaje en `last_backup_error` y muestra un aviso visible en Ajustes y en la pantalla principal (banda discreta). El aviso desaparece cuando un backup sale bien.
- Restaurar: ejecutar `detener.bat`, reemplazar `data/puntos.db` (y borrar `puntos.db-wal` y `puntos.db-shm` si existen) por una copia, y volver a abrir con `iniciar.bat`. Se documenta en el README.

## 6. Frontend

- Una sola pantalla principal con dos pestañas (Clientes, Productos y puntos), igual que la demo. Ajustes se abre desde el encabezado. El frontend decide qué mostrar al arrancar con `GET /api/auth/status`: `SetupPage`, `LoginPage` o la app.
- Estado del servidor con `fetch` y un hook propio simple (`useCustomers`, `useProducts`, `useSettings`); no hace falta una librería de datos para esta escala. Cualquier respuesta 401 lleva al login.
- Los errores de la API se muestran con `error.message` en un toast; no se inventan textos de error en el frontend.
- Montos con `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })` (`$1.500`), concentrado en `lib/format.ts`.
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

- Toasts breves tras cada operación; `ConfirmDialog` para canjear y anular (la confirmación de anular avisa si se anulará un grupo).
- `RedeemPanel` se adapta a la configuración: una modalidad, dos pestañas, o panel combinado con resumen de total (ver spec 5.2).
- Accesibilidad básica: foco visible, botones grandes, orden de tabulación lógico (Enter en el buscador abre el primer resultado; el foco vuelve al buscador después de cada operación).

## 7. Cómo se ejecuta en el local

- **Desarrollo**: `npm run dev` levanta `shared` en modo watch, el servidor y Vite juntos.
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
  - canjear producto sin saldo, sin costo de canje y con la modalidad desactivada;
  - canjear descuento con puntos en cero, mayores al saldo, sin valor de punto y con el monto correcto;
  - canje combinado: total que supera el saldo (ej. saldo 150, producto 100 + descuento 100 → falla) y total que entra (50 + 100);
  - combinar con la opción desactivada;
  - anular: normal, dos veces, una anulación, fuera de ventana, dejando saldo negativo, grupo completo;
  - `nextRedeemable` y `affordable`, incluidos los casos "ya le alcanza para todos" y "sin productos canjeables".
- Tests de API con SQLite en memoria: DNI duplicado (y archivado), restaurar cliente, saldo siempre igual a la suma de movimientos, historial intacto al editar un producto o el valor del punto, operaciones sobre cliente archivado, ajustes por defecto.
- Tests de autenticación (Etapa 5): setup solo una vez, login correcto e incorrecto, límite de intentos, rutas sin sesión rechazadas, `Host` inválido rechazado.
- Test del backup: genera archivo, se abre y tiene los mismos datos.
- Prueba manual por etapa con los criterios de aceptación de la spec (sección 8).
- Antes de entregar al local: prueba de restauración de un backup en otra carpeta y prueba del portable en una PC sin Node.

## 9. Etapas de implementación con prompts para Codex

Cada etapa se hace en una rama o sesión aparte y se revisa antes de pasar a la siguiente. Prompt base para todas (reemplazar N):

> Leé `AGENTS.md`, `docs/club_puntos_spec.md` y `docs/club_puntos_arquitectura.md`. Implementá **solo** la etapa N descrita en la sección 9 de la arquitectura. No cambies nada fuera de su alcance y no adelantes trabajo de etapas posteriores. Si algo es ambiguo o los documentos se contradicen, preguntá antes de decidir. Al terminar, corré `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`, y resumime qué hiciste, qué decisiones tomaste y qué quedó pendiente.

**Etapa 0: base del proyecto**
_Alcance:_ monorepo con workspaces `shared`, `server` y `web`. Servidor Fastify + TypeScript con `buildApp` y `/api/health`. Frontend Vite + React + TS + Tailwind. ESLint, Prettier, Vitest, `.nvmrc`, `engines`, `.gitignore` (incluye `data/`), la estructura de la sección 3 (carpetas y archivos vacíos o mínimos donde corresponda) y los scripts `dev`, `build`, `typecheck`, `lint`, `test`. Comprobar que `better-sqlite3` instala y abre una base en memoria.
_No incluye:_ base de datos real, rutas de negocio, pantallas.
_Listo cuando:_ `npm run dev` abre una página en blanco servida por Vite con `/api/health` respondiendo a través del proxy, `shared` se importa desde servidor y frontend, y typecheck, lint, test y build pasan.

**Etapa 1: base de datos y reglas de puntos**
_Alcance:_ conexión SQLite con pragmas, `migrate.ts` con `user_version`, migración `0001_init.sql` (tablas, índices, productos iniciales y ajustes por defecto de 4.1), `services/settings.ts`, `domain/errors.ts`, `domain/names.ts`, `pointsRules.ts` con **todos** sus tests (sección 8) y los esquemas Zod y códigos de error en `shared`.
_No incluye:_ rutas de la API.
_Listo cuando:_ los tests de reglas pasan, la base se crea sola en `data/puntos.db` al arrancar con los productos y ajustes iniciales, y volver a arrancar no repite la migración.

**Etapa 2: API de clientes, productos, movimientos y ajustes**
_Alcance:_ todas las rutas de la sección 5.1 **salvo** `auth/*`, `admin/backup`, `admin/export.csv` y `admin/credentials`. Incluye `GET/PATCH /api/admin/settings`, restaurar clientes, paginación del historial, `reorder` de productos, transacciones y errores en español según 5.2.
_Listo cuando:_ los tests de API pasan (DNI duplicado y archivado, saldo coherente, canje simple y combinado, anulaciones y grupos, canje sin saldo, ajustes por defecto).

**Etapa 3: pantalla Clientes y ajustes de canje**
_Alcance:_ `CustomersPage` fiel a la demo (`docs/demo/` si existe): alta, buscador sin tildes, "Ver archivados" y "Restaurar cliente", tarjeta del cliente, botones de compra, `RedeemPanel` en sus tres variantes, historial con anular (aviso de grupo), editar y archivar, toasts y confirmaciones. Incluye una `SettingsPage` **solo con la sección "Canjes"** (modalidades, valor del punto, combinar), para poder probar todo el canje.
_No incluye:_ pestaña de productos editable, login, backups.
_Listo cuando:_ se cumplen los criterios de aceptación de la spec que involucran clientes, puntos, canje (simple y combinado), configuración de canjes y anulación.

**Etapa 4: pantalla Productos y puntos**
_Alcance:_ `ProductsPage` con edición por fila, agregar, ordenar con flechas y desactivar.
_Listo cuando:_ cambiar puntos de un producto se refleja en las compras nuevas y no altera el historial ni los saldos.

**Etapa 5: acceso y seguridad**
_Alcance:_ `auth/*` completo, `SetupPage` y `LoginPage`, cookie de sesión, sesiones en memoria, límite de intentos, validación de `Host`, escucha solo en `127.0.0.1`, botón "Salir", manejo de 401 en el frontend, `cli/reset-password.ts` y `scripts/recuperar-clave.bat`. Todas las rutas de datos pasan a exigir sesión.
_Listo cuando:_ sin sesión ninguna ruta de datos responde, el setup inicial funciona una sola vez, "Salir" funciona, la recuperación cambia la contraseña sin tocar datos y los tests de autenticación pasan.

**Etapa 6: ajustes completos, backup y exportación**
_Alcance:_ completar `SettingsPage` (backups con fecha del último y aviso de fallo, exportar CSV, cambiar usuario y contraseña), `services/backup.ts` (automático diario y manual con `db.backup()`, rotación de 30 copias), `services/csv.ts`, banda de aviso en la pantalla principal si el último backup falló, y las rutas `admin/backup`, `admin/export.csv` y `admin/credentials`.
_Listo cuando:_ se genera un backup fechado que, restaurado en otra carpeta, abre con los mismos datos, y el aviso aparece y desaparece según corresponda.

**Etapa 7: empaquetado e instalación en el local**
_Alcance:_ `build-portable.ts`, `iniciar.bat`, `detener.bat`, accesos directos, README con instalación, restauración, recuperación de acceso y uso de Drive para escritorio.
_Listo cuando:_ en una PC sin Node, doble click abre la app como ventana de programa y los datos persisten tras reiniciar la PC.

## 10. Riesgos y consideraciones de evolución

| Tema                                  | Riesgo / pendiente                                                                         | Plan                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Pérdida de datos                      | Un solo archivo en una sola PC                                                             | Backups diarios a carpeta de Drive + prueba de restauración antes de entregar                  |
| Drive y archivo en uso                | Sincronizar el archivo vivo puede corromperlo                                              | La base vive fuera de Drive; solo se copian backups                                            |
| Módulo nativo                         | `better-sqlite3` necesita un binario que coincida con la versión de Node y con Windows x64 | Fijar la versión de Node; probar el portable en una PC sin Node                                |
| Navegador del local                   | Modo `--app` requiere Edge o Chrome                                                        | Edge viene con Windows; verificar en la PC real                                                |
| Antivirus / bloqueo                   | `.bat` y `node.exe` portable pueden ser marcados                                           | Probar en la PC del local; alternativa: empaquetar con Tauri más adelante                      |
| Sesiones en memoria                   | Un reinicio del servidor cierra la sesión                                                  | Aceptable en la v1 (se vuelve a entrar con usuario y contraseña)                               |
| Datos personales                      | DNI y celular de clientes                                                                  | Contraseña, usuario de Windows con clave, cuenta de Drive propia con verificación en dos pasos |
| Sin registro por empleado             | No se sabe quién hizo cada operación                                                       | Fuera de la v1; el historial guarda fecha y detalle, no autor                                  |
| Fudo                                  | No se sabe si ofrece API                                                                   | Averiguar; fuera de la v1                                                                      |
| Crecer a varias cajas o acceso remoto | La arquitectura actual es de una sola PC                                                   | Si hace falta, el mismo servidor puede escuchar en la red local y/o migrar a Postgres          |
