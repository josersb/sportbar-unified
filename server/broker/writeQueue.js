"use strict";

/**
 * writeQueue — serialización FIFO de escrituras al Arranger por destino.
 *
 * Garantiza la invariante del spec state-broker: "máximo UN join por destino
 * a la vez". Escrituras a destinos DISTINTOS corren en paralelo; escrituras al
 * MISMO destino se encadenan en serie (FIFO), de modo que la última intención
 * encolada se ejecuta después de la anterior y, por tanto, gana.
 *
 * Implementación: Map<key, Promise> donde cada key guarda la "cola" (tail) del
 * destino. encolar() encadena la tarea al tail previo y devuelve la promise del
 * trabajo recién encolado — el caller espera SU trabajo, no el de los demás.
 * Si un trabajo previo falla, la cadena NO se rompe: el siguiente se ejecuta
 * igual (cada tarea es independiente: desired → join → confirmación).
 *
 * Uso:
 *   const queue = createWriteQueue({ log });
 *   const result = await queue.enqueue("TV01", async () => { ... });
 *   queue.isBusy("TV01") // true mientras haya trabajos pendientes
 */

function createWriteQueue({ log = console } = {}) {
  /** key (destino Arranger) → promise "cola" (tail de la cadena). */
  const chains = new Map();

  /**
   * Encola una tarea para una key. Devuelve la promise del trabajo encolado.
   * @param {string} key Destino (nomenclatura Arranger, p.ej. "TV01", "VW-Norte").
   * @param {() => Promise<any>} task Trabajo a ejecutar en serie para esa key.
   * @returns {Promise<any>} Resuelve con el resultado de ESTA tarea.
   */
  function enqueue(key, task) {
    if (typeof task !== "function") {
      throw new Error("[writeQueue] task debe ser una función");
    }
    const prev = chains.get(key) || Promise.resolve();

    // Ejecuta después de la tarea anterior (o en paralelo si no había cola).
    // Si la anterior falló, la cadena continúa: cada tarea es autónoma.
    const run = prev.then(
      () => task(),
      (err) => {
        log.warn(`[writeQueue] trabajo previo para "${key}" falló, continuando: ${err.message}`);
        return task();
      },
    );

    // La cadena guarda el `run` actual. La auto-limpieza corre en el mismo
    // microtask batch que el await del caller (finally registrado antes), de
    // modo que tras `await enqueue(...)` el Map ya está limpio.
    chains.set(key, run);
    run.finally(() => {
      if (chains.get(key) === run) chains.delete(key);
    });

    return run;
  }

  /** True si hay trabajos pendientes o en curso para la key. */
  function isBusy(key) {
    return chains.has(key);
  }

  return {
    enqueue,
    isBusy,
    /** Cantidad de destinos con cola activa. */
    get pendingCount() {
      return chains.size;
    },
    /** Lista de destinos con cola activa. */
    get pendingKeys() {
      return [...chains.keys()];
    },
  };
}

module.exports = { createWriteQueue };
