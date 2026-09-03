import { Events, MessageFlags } from "discord.js";
import { logger } from "../utils/logger.js";
import { logError, logInfo } from "../services/logService.js";
import { createTicketChannel } from "../services/ticketService.js";

async function respondWithError(interaction, message) {
  const payload = { content: message, flags: MessageFlags.Ephemeral };
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (error) {
    logger.warn("Impossible de répondre à l'interaction", error);
  }
}

/** Bouton « Ticket » posé par un embed du mini-site admin. */
async function handleTicketButton(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const { created, channel } = await createTicketChannel(interaction.guild, interaction.member);
    await interaction.editReply(
      created ? `Ton ticket est ouvert : ${channel}` : `Tu as déjà un ticket ouvert : ${channel}`,
    );
  } catch (error) {
    logger.error("Ouverture de ticket impossible", error);
    await interaction.editReply("Impossible d'ouvrir un ticket. L'équipe a été notifiée.");
    await logError(interaction.client, "Erreur ticket", error.message);
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isButton()) {
      if (interaction.customId === "ticket:open") await handleTicketButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Commande inconnue: ${interaction.commandName}`);
      await respondWithError(interaction, "Cette commande n'est plus disponible.");
      return;
    }

    try {
      await command.execute(interaction);
      await logInfo(
        interaction.client,
        "Commande exécutée",
        `\`/${interaction.commandName}\` par ${interaction.user.tag}`,
      );
    } catch (error) {
      logger.error(`Erreur dans /${interaction.commandName}`, error);
      await logError(
        interaction.client,
        "Erreur de commande",
        `\`/${interaction.commandName}\` — ${error.message}`,
      );
      await respondWithError(interaction, "Une erreur est survenue. L'équipe a été notifiée.");
    }
  },
};
