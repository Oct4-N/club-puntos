# AGENTS.md: reglas para Codex en "Club de Puntos"

Sistema de puntos para una heladería chica. App web **local** (un servidor Node en la PC del local + SQLite + React). Una sola PC, sin acceso remoto.

## Documentos (leerlos antes de tocar nada)

- `docs/club_puntos_spec.md`: **qué** hace la app (reglas funcionales, pantallas, criterios de aceptación).
- `docs/club_puntos_arquitectura.md`: **cómo** se construye (stack, base de datos, API, etapas con "Listo cuando").
- `docs/demo/` (si existe): referencia visual de la demo de Lovable.

Si los documentos se contradicen o algo es ambiguo: **preguntar**, no inventar. No modificar los documentos salvo que se pida.

## Cómo trabajar

- Hacer **solo la etapa pedida**. No adelantar trabajo de otras etapas ni refactorizar fuera de su alcance.
- No agregar dependencias que no estén en la tabla de tecnologías de la arquitectura sin avisar y justificar.
- Antes de terminar, correr y dejar en verde: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
- Al terminar, resumir: qué se hizo, decisiones tomadas, qué quedó pendiente y cómo probarlo a mano.
- Cambios chicos y ordenados; un commit por etapa o subtarea coherente, con mensaje claro.

## Convenciones

- TypeScript en modo `strict`. Sin `any` salvo justificación en un comentario.
- Identificadores, nombres de archivos y mensajes de commit en **inglés**; **todo texto visible para el usuario en español (Argentina)**: interfaz, errores, toasts, CSV.
- Esquemas Zod y tipos de la API en el paquete `shared`; no duplicarlos en servidor o frontend.
- Los errores de la API tienen la forma `{ error: { code, message } }` con `message` en español. El frontend muestra ese mensaje, no inventa otro.
- Montos en pesos enteros; formato `$1.500` solo en el frontend (`lib/format.ts`).
- El servidor se arma con `buildApp({ db, config })`; los tests usan SQLite en memoria.

## Reglas que no se pueden romper

1. **Los puntos solo cambian dentro de una transacción** que inserta el movimiento y actualiza `customers.points` a la vez. El saldo siempre debe ser igual a la suma de `movements.points` del cliente.
2. **Nada se borra de verdad.** Los clientes se archivan, los productos se desactivan, los movimientos se anulan con otro movimiento (`void`). Nunca `DELETE` sobre `customers`, `products` ni `movements`.
3. **El historial es inmutable.** Cambiar un producto, sus puntos o el valor del punto no modifica movimientos ni saldos pasados (los movimientos guardan copia de nombre, puntos y monto).
4. **La lógica de puntos vive en `server/src/domain/pointsRules.ts`** (funciones puras con tests). Las rutas solo las llaman. No duplicar reglas en el frontend.
5. **En un canje combinado se valida el total** (producto + descuento) contra el saldo, no cada parte por separado.
6. **El servidor escucha solo en `127.0.0.1`.** Nunca `0.0.0.0`.
7. **Consultas SQL siempre parametrizadas.** Ninguna credencial ni dato real en el código ni en git.
8. **El archivo vivo `data/puntos.db` nunca se copia a mano.** Los backups usan `db.backup()` de `better-sqlite3`.
9. `data/` no se versiona.

## Criterio de calidad

- Una regla de negocio nueva o modificada trae su test.
- Si se toca la base: una migración nueva en `server/src/db/migrations/` (nunca editar una ya aplicada) y test que la cubra.
- La app debe poder usarse de pie, atendiendo: botones grandes, pocos pasos, foco inicial en el buscador de clientes.
