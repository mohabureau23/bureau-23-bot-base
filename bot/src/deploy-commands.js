import path from "node:path";
import { fileURLToPath } from "node:url";
import { REST, Routes } from "discord.js";
import { env } from "./config/env.js";
import { loadModules } from "./utils/loadModules.js";
import { logger } from "./utils/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Enregistre les slash commands sur la guilde DISCORD_GUILD_ID. */
async function main() {
  logger.setLevel(env.logLevel);
  const commands = await loadModules(path.join(__dirname, "commands"));
  const body = commands.map((command) => command.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(env.token);
  await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body });

  logger.info(`${body.length} commande(s) enregistrée(s) sur la guilde ${env.guildId}`);
}

main().catch((error) => {
  logger.error("Échec du déploiement des commandes", error);
  process.exit(1);
});
