import type { ErrorCode } from '@club-puntos/shared';

export const domainErrorMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'Los datos ingresados no son válidos.',
  UNAUTHORIZED: 'Usuario o contraseña incorrectos.',
  NOT_FOUND: 'No se encontró el elemento solicitado.',
  CUSTOMER_DNI_EXISTS: 'Ya existe un cliente con ese DNI.',
  SETUP_ALREADY_DONE: 'La configuración inicial ya fue realizada.',
  ALREADY_VOIDED: 'Este movimiento ya fue anulado.',
  CANNOT_VOID_VOID: 'No se puede anular una anulación.',
  VOID_WINDOW_EXPIRED: 'Solo se pueden anular movimientos de hasta 7 días.',
  VOID_NEGATIVE_BALANCE: 'No se puede anular: el cliente ya usó esos puntos.',
  CUSTOMER_ARCHIVED: 'No se puede operar sobre un cliente archivado.',
  PRODUCT_INACTIVE: 'El producto está desactivado.',
  REWARD_INACTIVE: 'La recompensa o su producto está desactivado.',
  INSUFFICIENT_POINTS: 'El cliente no tiene puntos suficientes.',
  RATE_LIMITED: 'Demasiados intentos. Esperá antes de volver a probar.'
};

export class DomainError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(domainErrorMessages[code]);
    this.name = 'DomainError';
    this.code = code;
  }
}
