import { assignSourceToDestination } from "./arrangerApi.js";

(async () => {
  try {
    await assignSourceToDestination("DTV4", "TVRACK");
    console.log("Comando enviado correctamente");
  } catch (err) {
    console.error("Error al enviar comando:", err);
  }
})();
