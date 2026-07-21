import { describe, it, expect } from "vitest";
import { CANALES_FAVORITOS } from "./canalesFavoritos";

describe("CANALES_FAVORITOS", () => {
  it("is an array with exactly 21 entries", () => {
    expect(Array.isArray(CANALES_FAVORITOS)).toBe(true);
    expect(CANALES_FAVORITOS).toHaveLength(21);
  });

  it("every entry has canal (string), nombre (string), and img properties", () => {
    CANALES_FAVORITOS.forEach((entry, i) => {
      expect(entry, `Entry at index ${i}`).toHaveProperty("canal");
      expect(entry, `Entry at index ${i}`).toHaveProperty("nombre");
      expect(entry, `Entry at index ${i}`).toHaveProperty("img");
      expect(typeof entry.canal, `canal at index ${i}`).toBe("string");
      expect(typeof entry.nombre, `nombre at index ${i}`).toBe("string");
    });
  });

  it("has no duplicate canal values (canal is the unique identifier)", () => {
    const canales = CANALES_FAVORITOS.map((e) => e.canal);
    const unique = new Set(canales);
    expect(unique.size).toBe(canales.length);
  });

  it("includes 'Apagar' with canal '0000' and null img", () => {
    const entry = CANALES_FAVORITOS.find(e => e.canal === "0000");
    expect(entry).toBeDefined();
    expect(entry.nombre).toBe("Apagar");
    expect(entry.img).toBeNull();
  });

  it("contains specific known sport channels", () => {
    const channels = {
      "ESPN": "1621",
      "ESPN 2": "1622",
      "ESPN 3": "1623",
      "ESPN Premium HD": "1604",
      "ESPN 4": "1624",
      "Fox Sports HD": "1605",
      "Fox Sports 2 HD": "1608",
      "Fox Sports 3 HD": "1609",
      "TNT Sports": "1603",
      "TyC Sports": "1620",
      "NBA TV": "1677",
    };

    for (const [nombre, canal] of Object.entries(channels)) {
      const match = CANALES_FAVORITOS.find((e) => e.canal === canal);
      expect(match, `${nombre} (canal ${canal}) not found`).toBeDefined();
      expect(match.nombre, `Name mismatch for canal ${canal}`).toBe(nombre);
    }
  });

  it("has numeric canal values for active channels", () => {
    const active = CANALES_FAVORITOS.filter(e => !e.canal.includes("A") && !e.canal.includes("B"));
    active.forEach((entry) => {
      expect(entry.canal, `Non-numeric canal: ${entry.canal}`).toMatch(/^\d+$/);
    });
  });
});
