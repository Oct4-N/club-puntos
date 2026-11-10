# Club de Puntos: spec de la app (v1.1)

Complementa a `club_puntos_arquitectura.md` (cómo se construye y en qué orden). Acá se define **qué hace** la app. Si algo de este documento contradice a la arquitectura, manda la spec en lo funcional y la arquitectura en lo técnico; ante la duda, preguntar antes de implementar.

## 1. Qué es

Un sistema de puntos para una heladería chica, pensado al estilo de los clubes de otras cadenas: el cliente se registra con su DNI, suma puntos con cada compra y los canjea por productos o por descuentos, según lo que decida la heladería. Se usa **en una sola PC, en el mismo local**, por el personal de caja. No hay app para clientes, ni acceso remoto, ni cuentas de clientes.

Referencia visual y de uso: la demo hecha en Lovable ("Club de Puntos - Heladería"). Se mantiene su estilo (colores cálidos, tarjetas redondeadas, botones grandes por producto) y su principal virtud: **que se pueda usar en segundos, sin explicación**. Si existe la carpeta `docs/demo/` (capturas, colores, código exportado), es la referencia visual oficial.

## 2. Principios

- Registrar una compra debe tomar **2 o 3 toques**: buscar cliente, tocar producto, listo.
- Pocos campos, textos en español, botones grandes (se usa de pie, atendiendo).
- Nada se borra de verdad: todo cambio de puntos queda registrado y se puede corregir.
- Funciona sin internet. Internet solo se usa (opcionalmente) para que Google Drive suba los backups.
- Toda la interfaz y todos los mensajes de error están en español (Argentina). Los montos se muestran con formato argentino: `$1.500`.

## 3. Quién la usa

- **Caja**: busca clientes, los registra, suma puntos, canjea.
- **Dueños / admin**: además editan productos y puntos, configuran los canjes, hacen backups y exportan datos.

En la v1 hay **un solo usuario general del local** (nombre de usuario y contraseña) que da acceso a todo. No se utiliza correo como identificador. No hay cuentas por empleado ni niveles de permiso: los dueños deciden quién conoce las credenciales.

## 4. Modelo de puntos

**Cómo se suman.** Cada **producto** tiene un valor de *puntos que suma* al comprarlo. Cada toque en un producto suma una unidad (para dos cucuruchos se toca dos veces). Solo se puede sumar con productos activos.

**Cómo se canjean.** La heladería elige qué formas de canje usar desde Ajustes, y puede tener **una o las dos** activadas. También configura si, cuando ambas están activadas, se pueden combinar en una misma operación de canje:

| Forma | Cómo funciona | Qué se configura |
|---|---|---|
| **Por producto** | El cliente se lleva **una unidad** de un producto gratis a cambio de los puntos que cuesta canjearlo | A cada producto se le define cuántos puntos cuesta su canje (vacío = no se puede canjear) |
| **Como descuento** | El cliente usa la cantidad de puntos que quiera (hasta su saldo) y se convierten en pesos de descuento sobre su compra | El **valor de cada punto en pesos** (ej. 1 punto = $50). No hay mínimo de puntos para canjear |

### 4.1 Reglas de canje

- Canjear resta puntos y queda registrado. El saldo nunca es negativo: solo se puede canjear si alcanza.
- En el canje por descuento, la app **calcula y muestra el monto** ("Aplicar $1.500 de descuento"), pero **no conoce el total de la compra** (no está conectada a Fudo ni a la caja). Quien atiende aplica el descuento a mano.
- El monto en pesos queda guardado en el movimiento. Cambiar después el valor del punto no altera el historial.
- Si el canje por descuento está activado pero no se cargó el valor del punto, esa opción queda deshabilitada hasta que se cargue.
- **Canje combinado.** Si ambas modalidades están activadas y "Permitir combinar" está habilitado, una misma operación de canje puede incluir **un producto y un descuento**. En ese caso la suma de puntos de ambos (`costo del producto + puntos del descuento`) **no puede superar el saldo**. No alcanza con que cada parte, por separado, entre en el saldo.
- Si "Permitir combinar" está deshabilitado, cada operación de canje es de **una sola modalidad**. Esta regla se aplica **por operación**: la app no sabe qué es "una misma compra", así que no impide hacer dos canjes seguidos. Es una guía para el personal, no un control antifraude.
- Cambiar los puntos de un producto, su costo de canje o el valor del punto **no modifica** movimientos pasados ni saldos.
- Los precios cambian, así que todos estos números son editables por la heladería cuando quiera.
- Sin vencimiento de puntos, niveles ni promociones en la v1.

### 4.2 Productos

La heladería puede **agregar, editar, ordenar y quitar** productos, y cambiar los puntos de cada uno. Los puntos que suma y los que cuesta canjear son enteros **mayores que cero**. Valores de ejemplo (todo editable), cargados al crear la base:

| Producto | Suma | Canje |
|---|---|---|
| Cucurucho | 5 | 50 |
| Barquillo | 5 | 50 |
| 1/4 kg | 10 | 100 |
| 1/2 kg | 20 | 180 |
| 1 kg | 40 | 320 |

### 4.3 Anulaciones

- "Anular" crea un movimiento inverso que apunta al original; no lo borra. El saldo vuelve a lo que era.
- Se puede anular un movimiento **solo si**: no es una anulación, no fue anulado antes y tiene **7 días o menos** de antigüedad. (El plazo es una constante del sistema, no un ajuste.)
- Si anular dejaría el saldo negativo (por ejemplo, anular una compra cuyos puntos ya se canjearon), se rechaza con un mensaje claro: "No se puede anular: el cliente ya usó esos puntos".
- Si el movimiento forma parte de un **canje combinado** (mismo grupo), se anula **todo el grupo juntos**: no se puede anular solo una parte. La pantalla lo avisa en la confirmación.
- El historial muestra el movimiento original marcado como "Anulado" y la anulación como otra línea.

### 4.4 Configuración inicial (valores por defecto)

Al crear la base, los ajustes quedan así:

- Canje por producto: **activado**.
- Canje como descuento: **desactivado**.
- Valor del punto en pesos: **sin cargar**.
- Permitir combinar canjes: **desactivado**.

## 5. Pantallas

### 5.1 Acceso
Pantalla con **nombre de usuario y contraseña** del local. La primera vez que se abre el programa (no hay credenciales guardadas) se muestra una pantalla de configuración inicial para elegir ambos. Como sugerencia se puede usar un usuario sencillo, por ejemplo `heladeria`. La contraseña debe tener al menos 6 caracteres. El botón "Salir" (arriba a la derecha) vuelve al login.

No se usa correo como identificador: la app funciona sin internet y no envía mensajes.

**Olvidé la contraseña.** Junto al programa hay un acceso directo **"Recuperar acceso"** que solo funciona en la PC del local. Abre una ventana de consola que pide un nuevo nombre de usuario y una nueva contraseña, los guarda y termina. **No toca clientes, productos ni movimientos.**

### 5.2 Clientes (pantalla principal)
Dos columnas, como en la demo:

- **Izquierda**: formulario "Nuevo cliente" con nombre, apellido y DNI (obligatorios) y un desplegable "Más datos (opcional)" con celular y fecha de nacimiento, así el alta rápida sigue siendo de tres campos. Debajo, el buscador por nombre o DNI con la lista de clientes y su saldo.
  - La búsqueda ignora mayúsculas y tildes, y encuentra por nombre, apellido, nombre y apellido juntos, o DNI (también por parte del número).
  - Un interruptor "Ver archivados" permite listar también a los archivados.
  - Si al crear un cliente el DNI ya existe, se avisa y se muestra a ese cliente en lugar de crear otro. Si el cliente existente está **archivado**, el aviso ofrece el botón **"Restaurar cliente"**.
- **Derecha**: al elegir un cliente, una tarjeta grande con su nombre, DNI y **puntos**, más:
  - "Le faltan X pts para [producto]", si el canje por producto está activado. El producto es el canjeable más barato **que todavía no le alcanza**; si ya le alcanza para todos, no se muestra el mensaje.
  - "Equivale a $X de descuento", si el canje por descuento está activado y hay valor del punto cargado.
  - **Registrar compra**: un botón por producto activo (`+5 pts`, etc.).
  - **Canjear**, según lo activado en Ajustes:
    - Solo una modalidad activada: se muestra solo esa.
    - Ambas activadas y **sin** permitir combinar: dos pestañas, "Por producto" y "Como descuento"; cada operación usa una.
    - Ambas activadas y **permitiendo** combinar: un único panel con las dos secciones y un resumen ("Total: 130 pts") con un solo botón "Confirmar canje". El botón se deshabilita si el total supera el saldo.
    - *Por producto*: lista de productos canjeables, cada uno con su costo. Los que no le alcanzan se muestran deshabilitados. Cada canje pide confirmación.
    - *Como descuento*: campo para elegir cuántos puntos usar (con atajo "Usar todos") que muestra el monto en pesos, y botón "Aplicar descuento" con confirmación ("Aplicar $1.500 de descuento a esta compra").
  - **Historial**: los últimos 20 movimientos (con "Ver más"): fecha, descripción, puntos y tipo. Los tipos se muestran como "Compra", "Canje de producto", "Canje por descuento" y "Anulación". Los movimientos que se pueden anular (ver 4.3) tienen botón "Anular".
  - **Editar** datos del cliente y **Archivar** (no borra, solo lo oculta de la lista). Un cliente archivado no puede sumar ni canjear hasta que se lo restaure.

Detalles de uso:
- Al abrir la pantalla y después de cada operación, el foco va directo al buscador, así se puede escribir el DNI sin tocar nada más. Enter en el buscador abre el primer resultado.
- Después de sumar o canjear, aparece un aviso breve ("+10 pts a Gustavo") para confirmar que se registró.
- Los nombres se guardan como se escriben (sin espacios sobrantes) y se muestran con mayúscula inicial en cada palabra.

### 5.3 Productos y puntos
Tabla editable, como en la demo: producto, puntos que suma, puntos de canje, "Guardar" por fila, flechas para ordenar, "x" para quitar y una fila al final para agregar productos nuevos.
- Dejar el canje vacío significa que el producto suma puntos pero no se puede canjear gratis.
- Quitar un producto lo **desactiva** (no desaparece del historial).
- Los cambios se aplican a las operaciones nuevas.

### 5.4 Ajustes
Se abre desde el encabezado.
- **Canjes**: activar o desactivar "Canje por producto" y "Canje como descuento", cargar el **valor de cada punto en pesos** y configurar si se permite combinar ambas modalidades. No se exige un mínimo de puntos para el canje por descuento.
- **Backups**: botón "Hacer backup ahora", fecha del último backup y aviso visible si el último falló.
- **Exportar a Excel (CSV)**: clientes y movimientos.
- **Cambiar nombre de usuario y contraseña**.

## 6. Reglas de datos

- Nombre y apellido: campos separados y obligatorios.
- DNI: obligatorio, único (incluso entre archivados), solo números (7 u 8 dígitos).
- Celular: opcional, solo números.
- Fecha de nacimiento: opcional, fecha válida y no futura. En la v1 solo se guarda y se puede ver y editar (queda lista para usarla más adelante).
- Puntos: enteros, nunca negativos. Descuentos: monto en pesos entero.
- Valor del punto: entero mayor que cero, en pesos.
- Un movimiento solo se puede anular una vez (ver 4.3).
- En un canje por descuento, el movimiento se guarda con el nombre "Descuento" como descripción.

## 7. Fuera de la v1

- Acceso desde otro dispositivo o desde internet.
- App o QR para que el cliente vea sus puntos.
- Conexión con Fudo (primero hay que averiguar si ofrece API).
- Vencimiento de puntos, niveles, promociones y beneficios automáticos por cumpleaños (la fecha se guarda para poder usarla más adelante).
- Avisos por WhatsApp o SMS.
- Varias cajas o sucursales.
- Impresión de tickets.
- Cuentas por empleado y registro de quién hizo cada operación.

## 8. Criterios de aceptación

- Registrar un cliente nuevo con solo nombre, apellido y DNI, y sumarle puntos, lleva menos de 15 segundos.
- Se cierra y se vuelve a abrir el programa y los clientes y puntos siguen ahí.
- Con el canje por producto activado, un cliente con puntos suficientes puede canjear y su saldo baja exactamente el costo de canje. Un producto sin costo de canje no aparece como canjeable.
- Con el canje por descuento activado y el punto valuado en $50, usar 30 puntos muestra "$1.500", y al confirmar el saldo baja 30 puntos y el historial guarda el monto.
- Con el canje por descuento activado y sin valor de punto cargado, la opción aparece deshabilitada.
- Con combinación permitida, un cliente con 150 pts **no puede** canjear un producto de 100 pts más un descuento de 100 pts (el total supera el saldo); sí puede con 50 + 100.
- Con combinación no permitida, la pantalla solo deja usar una modalidad por operación.
- Desactivar una forma de canje en Ajustes hace que desaparezca de la pantalla del cliente.
- Se pueden agregar, editar y quitar productos y sus puntos sin alterar el historial.
- Anular una compra o un canje devuelve el saldo anterior y el historial muestra ambos movimientos. Anular un canje combinado anula las dos partes.
- No se puede anular dos veces, ni anular una anulación, ni anular algo de hace más de 7 días, ni anular una compra cuyos puntos ya se gastaron.
- No se puede crear dos clientes con el mismo DNI. Si el existente está archivado, se puede restaurar.
- Cambiar los puntos de un producto o el valor del punto no altera saldos ni movimientos existentes.
- El backup genera un archivo fechado que, restaurado en otra carpeta, abre con los mismos datos.
- Sin internet, todo funciona igual.
- "Recuperar acceso" permite elegir nueva contraseña sin perder datos.

## 9. Decisiones

**Tomadas**
- Acceso con un único usuario general del local y contraseña. El identificador es un nombre de usuario, no un correo. No hay cuentas por empleado ni niveles de permiso.
- El nombre del cliente se registra en dos campos obligatorios: nombre y apellido. El DNI también es obligatorio y único.
- Celular y fecha de nacimiento son opcionales.
- Productos y puntos 100% editables por la heladería: agregar, editar, ordenar y desactivar productos; definir por separado los puntos que suma y los puntos que cuesta canjear.
- Canje por producto, por descuento, o ambos, activables en Ajustes.
- El valor de cada punto en pesos se configura desde Ajustes; no queda fijado en el código.
- No hay mínimo de puntos para el canje por descuento: se puede utilizar cualquier cantidad entera mayor que cero, hasta el saldo disponible.
- Si ambas modalidades de canje están activadas, la heladería configura si se pueden combinar en una misma operación; en ese caso la suma de puntos no puede superar el saldo.
- Anulación: solo dentro de 7 días, una sola vez, todo el grupo en canjes combinados.
- Los clientes archivados se pueden restaurar; el DNI sigue siendo único entre archivados.
- Recuperación de contraseña desde la PC del local con un acceso directo, sin perder datos.

**Pendiente de configuración por la heladería (no bloquea el desarrollo)**

| Tema | Qué deberá configurar la heladería |
|---|---|
| Credenciales iniciales | Elegir el nombre de usuario y la contraseña al primer inicio. |
| Productos y puntos reales | Cargar los nombres de los productos y definir cuántos puntos suma cada uno y cuánto cuesta su canje. Los valores incluidos son ejemplos. |
| Valor del punto | Definir cuántos pesos representa cada punto cuando se habilite el canje por descuento. Se podrá modificar desde Ajustes. |
| Modalidades de canje | Elegir si habilita canje por producto, por descuento o ambos, y si permite combinarlos en una misma operación. |

**Fuera de las decisiones funcionales pendientes**
- La protección de los datos personales, los backups y la prueba de restauración son requisitos técnicos/operativos que deben cumplirse antes de entregar la aplicación.
- La integración con Fudo, el acceso desde varias cajas y el acceso remoto siguen fuera del alcance de la v1.
