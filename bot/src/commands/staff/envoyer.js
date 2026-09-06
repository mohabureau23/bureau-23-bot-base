import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { isStaff } from "../../services/ticketService.js";
import { logError } from "../../services/logService.js";
import { logger } from "../../utils/logger.js";

export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("envoyer")
    .setDescription("Publie un message dans le salon courant au nom de BUREAU 23 (staff).")
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Message à publier")
        .setMaxLength(2000)
        .setRequired(true),
    )
    .setDMPermission(false),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({
        content: "Commande réservée au staff BUREAU 23.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const content = interaction.options.getString("message");
    const channel = interaction.channel;
    const me = interaction.guild?.members?.me;

    if (!channel?.isTextBased?.()) {
      await interaction.reply({ content: "Salon invalide.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (me && !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
      await interaction.reply({
        content: "Je n'ai pas la permission d'écrire dans ce salon.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      await channel.send({ content, allowedMentions: { parse: [] } });
      await interaction.reply({ content: "Message publié.", flags: MessageFlags.Ephemeral });
    } catch (error) {
      logger.error("Envoi de message impossible", error);
      await logError(interaction.client, "Envoi de message impossible", error.message);
      await interaction.reply({
        content: "Envoi impossible. L'équipe a été notifiée.",
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
