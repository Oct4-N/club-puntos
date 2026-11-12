# Club de Puntos: spec de la app (v1.2)

Complementa a `club_puntos_arquitectura.md` (cómo se construye y en qué orden). Acá se define **qué hace** la app. Si algo de este documento contradice a la arquitectura, manda la spec en lo funcional y la arquitectura en lo técnico; ante la duda, preguntar antes de implementar.

**Cambios de v1.1 a v1.2:** el canje deja de tener "modalidades" (por producto, por descuento, combinado) y un valor del punto en pesos. Ahora la heladería arma su propia lista de **recompensas** (producto gratis o descuento en porcentaje, cada una con su costo en puntos) y las cambia cuando quiera. Se eliminan los interruptores de canje, el valor del punto, la opción de combinar, el costo de canje dentro de cada producto y los grupos de canje.

## 1. Qué es

Un sistema de puntos para una heladería chica, pensado al estilo de los clubes de otras cadenas: el cliente se registra con su DNI, suma puntos con cada compra y los canjea por las recompensas que decida la heladería (un producto gratis, un descuento). Se usa **en una sola PC, en el mismo local**, por el personal de caja. No hay app para clientes, ni acceso remoto, ni cuentas de clientes.

Referencia visual y de uso: la demo hecha en Lovable ("Club de Puntos - Heladería"). Se mantiene su estilo (colores cálidos, tarjetas redondeadas, botones grandes por producto) y su principal virtud: **que se pueda usar en segundos, sin explicación**. Si existe la carpeta `docs/demo/` (capturas, colores, código exportado), es la referencia visual oficial.

## 2. Principios

- Registrar una compra debe tomar **2 o 3 toques**: buscar cliente, tocar producto, listo.
- Pocos campos, textos en español, botones grandes (se usa de pie, atendiendo).
- Nada se borra de verdad: todo cambio de puntos queda registrado y se puede corregir.
- **Nada está fijado por el sistema:** los puntos de cada producto y las recompensas (cuáles hay, de qué tipo, para qué producto y cuánto cuestan) los define la heladería y los cambia cuando quiera. La app solo lo permite.
- Funciona sin internet. Internet solo se usa (opcionalmente) para que Google Drive suba los backups.
- Toda la interfaz y todos los mensajes de error están en español (Argentina).

## 3. Quién la usa

- **Caja**: busca clientes, los registra, suma puntos, canjea.
- **Dueños / admin**: además editan productos y recompensas, hacen backups y exportan datos.

En la v1 hay **un solo usuario general del local** (nombre de usuario y contraseña) que da acceso a todo. No se utiliza correo como identificador. No hay cuentas por empleado ni niveles de permiso: los dueños deciden quién conoce las credenciales.

## 4. Modelo de puntos

**Cómo se suman.** Cada **producto** tiene un valor de *puntos que suma* al comprarlo. Cada toque en un producto suma una unidad (para dos cucuruchos se toca dos veces). Solo se puede sumar con productos activos.

**Cómo se canjean.** La heladería arma una lista de **recompensas**. Cada recompensa tiene:

| Campo | Qué es |
|---|---|
| Nombre | El texto que ve el personal, por ejemplo "Cucurucho gratis" o "50% en 1 kg" |
| Tipo | **Producto gratis** (el cliente se lleva una unidad) o **Descuento** (un porcentaje sobre su compra) |
| Costo en puntos | Entero mayor que cero |
| Producto | Obligatorio en "producto gratis". En "descuento" es opcional y solo informativo: indica a qué se aplica ("en 1 kg"); vacío significa "en toda la compra" |
| Porcentaje | Solo en descuento: entero de 1 a 100 |
| Activa | Las desactivadas no se ofrecen (ver "Quitar" en 5.3) |

La heladería decide cuántas recompensas hay, de qué tipo, para qué producto y cuántos puntos cuestan, y puede cambiarlas cuando quiera. Si no hay ninguna recompensa disponible, la sección de canje no aparece.

### 4.1 Reglas de canje

- Cada canje usa **una** recompensa y resta su costo en puntos. Queda registrado. El saldo nunca es negativo: solo se puede canjear si alcanza.
- Una recompensa está **disponible** si está activa y, si tiene producto, ese producto también está activo. Solo las disponibles se ofrecen.
- Un cliente puede canjear la misma recompensa más de una vez si le alcanza (por ejemplo, con 500 puntos y una recompensa de 250, dos veces). Cada canje es una operación aparte.
- En un **descuento**, la app muestra el porcentaje ("Aplicar 50% de descuento en 1 kg") pero **no conoce el total de la compra** (no está conectada a Fudo ni a la caja). Quien atiende aplica el descuento a mano.
- En un **producto gratis**, quien atiende entrega una unidad del producto sin cobrarla.
- El movimiento guarda el nombre de la recompensa, su tipo, el costo en puntos, el porcentaje (si es descuento) y el producto (si tiene), tal como estaban en ese momento. Cambiar o quitar después la recompensa **no altera** el historial.
- La app no sabe qué es "una misma compra", así que no limita cuántas recompensas se canjean seguidas. Es una guía para el personal, no un control antifraude.
- Cambiar los puntos de un producto o las recompensas **no modifica** movimientos pasados ni saldos.
- Los precios cambian, así que todos estos números son editables por la heladería cuando quiera.
- Sin vencimiento de puntos, niveles ni promociones automáticas en la v1.

### 4.2 Productos y recompensas de ejemplo

La heladería puede **agregar, editar, ordenar y quitar** productos y recompensas. Los puntos son enteros **mayores que cero**. Valores de ejemplo (todo editable o borrable), cargados al crear la base:

**Productos** (puntos que suma)

| Producto | Suma |
|---|---|
| Cucurucho | 5 |
| Barquillo | 5 |
| 1/4 kg | 10 |
| 1/2 kg | 20 |
| 1 kg | 40 |

**Recompensas**

| Nombre | Tipo | Producto | Porcentaje | Costo |
|---|---|---|---|---|
| Cucurucho gratis | Producto gratis | Cucurucho | | 50 |
| Barquillo gratis | Producto gratis | Barquillo | | 50 |
| 50% en 1 kg | Descuento | 1 kg | 50 | 250 |

### 4.3 Anulaciones

- "Anular" crea un movimiento inverso que apunta al original; no lo borra. El saldo vuelve a lo que era.
- Se puede anular un movimiento **solo si**: no es una anulación, no fue anulado antes y tiene **7 días o menos** de antigüedad (exactamente 7 días todavía se puede). El plazo es una constante del sistema, no un ajuste.
- Si anular dejaría el saldo negativo (por ejemplo, anular una compra cuyos puntos ya se canjearon), se rechaza con un mensaje claro: "No se puede anular: el cliente ya usó esos puntos".
- Anular un canje devuelve los puntos al cliente.
- El historial muestra el movimiento original marcado como "Anulado" y la anulación como otra línea.

### 4.4 Configuración inicial (valores por defecto)

Al crear la base quedan cargados los productos y las recompensas de ejemplo de 4.2. No hay ajustes de canje: todo lo de canje son las recompensas.

## 5. Pantallas

### 5.1 Acceso
Pantalla con **nombre de usuario y contraseña** del local. La primera vez que se abre el programa (no hay credenciales guardadas) se muestra una pantalla de configuración inicial para elegir ambos. Como sugerencia se puede usar un usuario sencillo, por ejemplo `heladeria`. La contraseña debe tener al menos 6 caracteres. El botón "Salir" (arriba a la derecha) vuelve al login.

No se usa correo como identificador: la app funciona sin internet y no envía mensajes.

**Olvidé la contraseña.** Junto al programa hay un acceso directo **"Recuperar acceso"** que solo funciona en la PC del local. Abre una ventana de consola que pide un nuevo nombre de usuario y una nueva contraseña, los guarda y termina. **No toca clientes, productos, recompensas ni movimientos.**

### 5.2 Clientes (pantalla principal)
Dos columnas, como en la demo:

- **Izquierda**: formulario "Nuevo cliente" con nombre, apellido y DNI (obligatorios) y un desplegable "Más datos (opcional)" con celular y fecha de nacimiento, así el alta rápida sigue siendo de tres campos. Debajo, el buscador por nombre o DNI con la lista de clientes y su saldo.
  - La búsqueda ignora mayúsculas y tildes, y encuentra por nombre, apellido, nombre y apellido juntos, o DNI (también por parte del número).
  - Un interruptor "Ver archivados" permite listar también a los archivados.
  - Si al crear un cliente el DNI ya existe, se avisa y se muestra a ese cliente en lugar de crear otro. Si el cliente existente está **archivado**, el aviso ofrece el botón **"Restaurar cliente"**.
- **Derecha**: al elegir un cliente, una tarjeta grande con su nombre, DNI y **puntos**, más:
  - "Le faltan X pts para [recompensa]": la recompensa disponible **más barata que todavía no le alcanza**. Si ya le alcanza para todas, o no hay recompensas disponibles, no se muestra el mensaje.
  - **Registrar compra**: un botón por producto activo (`+5 pts`, etc.).
  - **Canjear**: la lista de recompensas disponibles, cada una con su nombre, su tipo ("Gratis" o "50% de descuento") y su costo en puntos. Las que no le alcanzan se muestran deshabilitadas. Cada canje pide confirmación ("Canjear Cucurucho gratis por 50 pts" o "Aplicar 50% de descuento en 1 kg por 250 pts"); en los descuentos, la confirmación recuerda que se aplica a mano sobre la compra. Si no hay recompensas disponibles, esta sección no aparece.
  - **Historial**: los últimos 20 movimientos (con "Ver más"): fecha, descripción (producto o recompensa), puntos y tipo. Los tipos se muestran como "Compra", "Canje de producto", "Canje por descuento" y "Anulación". Los movimientos que se pueden anular (ver 4.3) tienen botón "Anular".
  - **Editar** datos del cliente y **Archivar** (no borra, solo lo oculta de la lista). Un cliente archivado no puede sumar ni canjear hasta que se lo restaure.

Detalles de uso:
- Al abrir la pantalla y después de cada operación, el foco va directo al buscador, así se puede escribir el DNI sin tocar nada más. Enter en el buscador abre el primer resultado.
- Después de sumar o canjear, aparece un aviso breve ("+10 pts a Gustavo", "Canjeó Cucurucho gratis") para confirmar que se registró.
- Los nombres se guardan como se escriben (sin espacios sobrantes) y se muestran con mayúscula inicial en cada palabra.

### 5.3 Productos y puntos
Una sola pestaña con dos tablas editables, como en la demo.

**Puntos por producto:** producto, puntos que suma, "Guardar" por fila, flechas para ordenar, "x" para quitar y una fila al final para agregar productos nuevos.
- Quitar un producto lo **desactiva** (no desaparece del historial). Las recompensas que dependen de ese producto dejan de estar disponibles.
- Los cambios se aplican a las operaciones nuevas.

**Recompensas:** nombre, tipo (producto gratis / descuento), producto, porcentaje (solo en descuento), puntos que cuesta, "Guardar" por fila, flechas para ordenar, "x" para quitar y una fila al final para agregar.
- En "producto gratis" el producto es obligatorio; en "descuento" es opcional.
- Quitar una recompensa la **desactiva** (no desaparece del historial).
- Los cambios se aplican a los canjes nuevos.

### 5.4 Ajustes
Se abre desde el encabezado.
- **Backups**: carpeta de destino, botón "Hacer backup ahora", fecha del último backup y aviso visible si el último falló.
- **Exportar a Excel (CSV)**: clientes y movimientos.
- **Cambiar nombre de usuario y contraseña**.

## 6. Reglas de datos

- Nombre y apellido: campos separados y obligatorios.
- DNI: obligatorio, único (incluso entre archivados), solo números (7 u 8 dígitos).
- Celular: opcional, solo números.
- Fecha de nacimiento: opcional, fecha válida y no futura. En la v1 solo se guarda y se puede ver y editar (queda lista para usarla más adelante).
- Puntos: enteros, nunca negativos.
- Producto: nombre obligatorio; puntos que suma, entero mayor que cero.
- Recompensa: nombre obligatorio; costo en puntos, entero mayor que cero; tipo "producto gratis" (exige producto) o "descuento" (exige porcentaje entero de 1 a 100; el producto es opcional).
- Un movimiento solo se puede anular una vez (ver 4.3).
- En un canje, el movimiento se guarda con el nombre de la recompensa como descripción.

## 7. Fuera de la v1

- Acceso desde otro dispositivo o desde internet.
- App o QR para que el cliente vea sus puntos.
- Conexión con Fudo (primero hay que averiguar si ofrece API). Por eso la app no puede calcular el monto en pesos de un descuento: no conoce el total de la compra.
- Descuentos de monto fijo en pesos y combinar varias recompensas en una sola operación.
- Vencimiento de puntos, niveles, promociones y beneficios automáticos por cumpleaños (la fecha se guarda para poder usarla más adelante).
- Avisos por WhatsApp o SMS.
- Varias cajas o sucursales.
- Impresión de tickets.
- Cuentas por empleado y registro de quién hizo cada operación.

## 8. Criterios de aceptación

- Registrar un cliente nuevo con solo nombre, apellido y DNI, y sumarle puntos, lleva menos de 15 segundos.
- Se cierra y se vuelve a abrir el programa y los clientes y puntos siguen ahí.
- Con una recompensa de producto gratis de 50 pts, un cliente con 50 pts o más puede canjearla y su saldo baja exactamente 50; con menos, aparece deshabilitada.
- Con la recompensa "50% en 1 kg" de 250 pts, un cliente con 500 pts la canjea y su saldo baja a 250; el historial guarda el nombre, el tipo y el 50%. Puede canjearla otra vez porque le sigue alcanzando.
- La heladería puede crear, editar, ordenar y quitar recompensas (de producto gratis o de descuento, con el costo y el producto que quiera) sin tocar código.
- Si no hay recompensas disponibles, la sección Canjear no aparece en la pantalla del cliente.
- Una recompensa de producto gratis cuyo producto fue desactivado deja de ofrecerse.
- Se pueden agregar, editar y quitar productos y sus puntos, y recompensas, sin alterar el historial ni los saldos.
- Anular una compra o un canje devuelve el saldo anterior y el historial muestra ambos movimientos.
- No se puede anular dos veces, ni anular una anulación, ni anular algo de hace más de 7 días, ni anular una compra cuyos puntos ya se gastaron.
- No se puede crear dos clientes con el mismo DNI. Si el existente está archivado, se puede restaurar.
- El backup genera un archivo fechado que, restaurado en otra carpeta, abre con los mismos datos.
- Sin internet, todo funciona igual.
- "Recuperar acceso" permite elegir nueva contraseña sin perder datos.

## 9. Decisiones

**Tomadas**
- Acceso con un único usuario general del local y contraseña. El identificador es un nombre de usuario, no un correo. No hay cuentas por empleado ni niveles de permiso.
- El nombre del cliente se registra en dos campos obligatorios: nombre y apellido. El DNI también es obligatorio y único.
- Celular y fecha de nacimiento son opcionales.
- Los productos suman puntos; todo lo que se canjea es una **recompensa** configurable por la heladería: producto gratis o descuento en porcentaje, con su costo en puntos y, opcionalmente, un producto asociado. No hay modalidades de canje, ni valor del punto en pesos, ni canje combinado.
- Productos y recompensas 100% editables por la heladería: agregar, editar, ordenar y desactivar.
- La app no calcula montos de descuento: no conoce el total de la compra, y quien atiende aplica el porcentaje a mano.
- Anulación: solo dentro de 7 días, una sola vez.
- Los clientes archivados se pueden restaurar; el DNI sigue siendo único entre archivados.
- Recuperación de contraseña desde la PC del local con un acceso directo, sin perder datos.

**Pendiente de configuración por la heladería (no bloquea el desarrollo)**

| Tema | Qué deberá configurar la heladería |
|---|---|
| Credenciales iniciales | Elegir el nombre de usuario y la contraseña al primer inicio. |
| Productos y puntos reales | Cargar los nombres de los productos y definir cuántos puntos suma cada uno. Los valores incluidos son ejemplos. |
| Recompensas reales | Definir qué recompensas ofrece (producto gratis o descuento), para qué producto y cuántos puntos cuestan. Las incluidas son ejemplos que se pueden cambiar o borrar. |

**Fuera de las decisiones funcionales pendientes**
- La protección de los datos personales, los backups y la prueba de restauración son requisitos técnicos/operativos que deben cumplirse antes de entregar la aplicación.
- La integración con Fudo, el acceso desde varias cajas y el acceso remoto siguen fuera del alcance de la v1.
