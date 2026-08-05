import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./componentes/Toast";
import "./styles/tokens.css";
import "./index.css";

// ── Dev helper: expone reconstructMatrixState en la consola del navegador ──
// Uso: await __dumpArrangerState() → devuelve { destino: encoder, ... }
if (import.meta.env.DEV) {
  window.__dumpArrangerState = async (subscription = "video") => {
    const { reconstructMatrixState } = await import("./api/arrangerApi");
    const { estadoInicial } = await import("./contexto/Contexto");
    const destinations = Object.keys(estadoInicial.tvs).filter(
      (k) => !k.startsWith("TvsBarra") && !k.startsWith("TvsEscalera")
    );
    console.log(`Consultando ${destinations.length} destinos (${subscription})...`);
    const state = await reconstructMatrixState(destinations, subscription);
    console.table(Object.entries(state).map(([dest, enc]) => ({ destino: dest, encoder: enc || "—" })));
    console.log(JSON.stringify(state, null, 2));
    return state;
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
