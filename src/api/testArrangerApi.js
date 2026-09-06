import { setTvSource } from "./arrangerApi.js";

(async () => {
  try {
    const result = await setTvSource("TVRACK", "DTV4");
    console.log("Escritura confirmada:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error al enviar comando:", err);
  }
})();
