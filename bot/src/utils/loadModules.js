import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

/**
 * Charge récursivement les modules .js d'un dossier et retourne leurs exports par défaut.
 * Permet d'ajouter de nouvelles commandes/events sans toucher au code de démarrage.
 */
export async function loadModules(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const modules = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      modules.push(...(await loadModules(full)));
      continue;
    }
    if (!entry.name.endsWith(".js")) continue;
    const imported = await import(pathToFileURL(full).href);
    if (imported.default) modules.push(imported.default);
  }

  return modules;
}
