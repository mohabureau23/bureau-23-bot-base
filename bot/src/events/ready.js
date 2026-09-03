import { Events, REST, Routes } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { logSuccess } from "../services/logService.js";

/** Enregistre automatiquement les slash commands au démarrage. */
async function syncCommands(client) {
  const body = client.commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(env.token);

  try {
    if (env.guildId) {
      await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body });
      logger.info(`${body.length} commande(s) synchronisée(s) sur le serveur ${env.guildId}`);
    } else {
      await rest.put(Routes.applicationCommands(env.clientId), { body });
      logger.info(`${body.length} commande(s) synchronisée(s) globalement`);
    }
  } catch (error) {
    logger.error("Synchronisation des commandes impossible", error);
  }
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Connecté en tant que ${client.user.tag}`);

    if (env.missingOptional.length > 0) {
      logger.warn(
        `Variables optionnelles absentes (fonctions désactivées) : ${env.missingOptional.join(", ")}`,
      );
    }

    await syncCommands(client);

    await logSuccess(client, "Bot démarré", `${client.user.tag} est en ligne.`, [
      { name: "Commandes", value: `${client.commands.size}`, inline: true },
    ]);
  },
};
