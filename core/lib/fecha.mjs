// La fecha que se estampa en un frontmatter es una fecha de CALENDARIO para
// personas, no un instante de máquina. `new Date().toISOString()` devuelve UTC,
// y quien trabaja de madrugada en la península ve estampado el día anterior:
// entre las 00:00 y las 02:00 en horario de verano (01:00 en invierno), UTC va
// un día por detrás del calendario local.
//
// No es teórico. Un ledger de SPEC-001 quedó fechado 2026-08-29 en transiciones
// hechas el 30, y el humano las vio contradecir la fecha que él mismo había
// escrito a mano en un ADR el mismo día.
//
// Los instantes de datos siguen siendo UTC donde corresponda; esto es solo para
// las fechas editoriales del frontmatter y del tablero.
export function hoy(d = new Date()) {
  const anho = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anho}-${mes}-${dia}`;
}
