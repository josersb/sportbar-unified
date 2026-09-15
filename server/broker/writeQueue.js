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
  // WS5-DEDUPE: tareas encoladas SIN arrancar por key. `chains.has(key)` es
  // true también mientras la tarea ACTUAL corre (el propio executeWrite vive
  // dentro de la cadena), así que el guard pre-join necesita distinguir
  // "hay writes pendientes detrás mío" de "yo soy el que corre".
  const queuedCounts = new Map();

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
    queuedCounts.set(key, (queuedCounts.get(key) || 0) + 1);

    // Marca el arranque de ESTA tarea (sale de "encolada" a "corriendo").
    const started = () => {
      const n = (queuedCounts.get(key) || 1) - 1;
      if (n <= 0) queuedCounts.delete(key);
      else queuedCounts.set(key, n);
      return task();
    };

    // Ejecuta después de la tarea anterior (o en paralelo si no había cola).
    // Si la anterior falló, la cadena continúa: cada tarea es autónoma.
    const run = prev.then(
      started,
      (err) => {
        log.warn(`[writeQueue] trabajo previo para "${key}" falló, continuando: ${err.message}`);
        return started();
      },
    );

    // La cadena guarda el `run` actual. La auto-limpieza corre en el mismo
    // microtask batch que el await del caller (finally registrado antes), de
    // modo que tras `await enqueue(...)` el Map ya está limpio.
    chains.set(key, run);
    // OJO: el promise derivado del .finally() NO se retorna — si run rechaza,
    // ese derivado queda huérfano y Node lo reporta como unhandled rejection
    // (crashea el proceso). El catch vacío lo silencia: la rejection de run
    // YA está manejada por el caller (writeInBackground .catch / handler).
    // Encontrado por el verify-write-confirm del hotfix 4 (un store.write
    // tardío rechazaba tras el cleanup del escenario).
    run
      .finally(() => {
        if (chains.get(key) === run) {
          chains.delete(key);
          queuedCounts.delete(key);
        }
      })
      .catch(() => {});

    return run;
  }

  /** True si hay trabajos pendientes o en curso para la key. */
  function isBusy(key) {
    return chains.has(key);
  }

  /**
   * WS5-DEDUPE: true si hay tareas ENCOLADAS (sin arrancar) para la key,
   * además de la que esté corriendo. Dentro de una tarea en ejecución,
   * `isBusy(key)` es siempre true (la tarea vive en la cadena); este método
   * responde la pregunta real del guard pre-join: "¿hay writes pendientes
   * detrás mío para este destino?".
   */
  function hasPending(key) {
    return (queuedCounts.get(key) || 0) > 0;
  }

  return {
    enqueue,
    isBusy,
    hasPending,
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
