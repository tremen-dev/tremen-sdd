// Predicado de persona (ADR-006), FUENTE ÚNICA: lo usan la firma de los gates
// humanos de estado.mjs y los calificadores `salvedad` y `confirmado` de la
// columna Estado del ledger (ADR-020 §4, RN-12). Una persona: firma no vacía, no
// el default del CLI ('desconocido') y no un rol del método (namespace cerrado
// 'sdd-*').
export const esPersona = (por) => Boolean(por) && por !== 'desconocido' && !/^sdd-/i.test(por);
