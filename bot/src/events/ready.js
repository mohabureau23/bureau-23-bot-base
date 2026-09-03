import { Events } from "discord.js";
import { logger } from "../utils/logger.js";
import { logSuccess } from "../services/logService.js";

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.info(`Connecté en tant que ${client.user.tag}`);
    await logSuccess(client, "Bot démarré", `${client.user.tag} est en ligne.`, [
      { name: "Commandes", value: `${client.commands.size}`, inline: true },
    ]);
  },
};
