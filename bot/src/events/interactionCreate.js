import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, MessageFlags, PermissionFlagsBits } from "discord.js";
import { logger } from "../utils/logger.js";
import { logError, logInfo } from "../services/logService.js";
import { createTicketChannel } from "../services/ticketService.js";
import { env } from "../config/env.js";

/** Autorisé si membre listé dans les permissions du salon ticket, rôle staff, ou admin. */
function canManageTicket(interaction) {
  const member = interaction.member;
  if (!member) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (env.staffRoleId && member.roles?.cache?.has?.(env.staffRoleId)) return true;
  const overwrite = interaction.channel?.permissionOverwrites?.cache?.get(member.id);
  return Boolean(overwrite && overwrite.type === 1);
}

async function handleTicketClaim(interaction) {
  if (!canManageTicket(interaction)) {
    await interaction.reply({ content: "Action réservée à l'équipe et au client du ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  const source = interaction.message.embeds[0];
  if (source) {
    const embed = EmbedBuilder.from(source);
    const fields = (source.fields ?? []).map((field) =>
      field.name === "Statut"
        ? { ...field, value: `Pris en charge par <@${interaction.user.id}>` }
        : field,
    );
    embed.setFields(fields);
    await interaction.message.edit({ embeds: [embed], components: interaction.message.components });
  }
  await interaction.reply({ content: "Tu as pris en charge ce ticket.", flags: MessageFlags.Ephemeral });
}

async function handleTicketClose(interaction) {
  if (!canManageTicket(interaction)) {
    await interaction.reply({ content: "Action réservée à l'équipe et au client du ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("ticket:close:confirm").setLabel("Confirmer la fermeture").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("ticket:close:cancel").setLabel("Annuler").setStyle(ButtonStyle.Secondary),
  );
  await interaction.reply({
    content: "Confirmer la fermeture définitive de ce ticket ?",
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleTicketCloseConfirm(interaction) {
  if (!canManageTicket(interaction)) {
    await interaction.reply({ content: "Action non autorisée.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.update({ content: "Fermeture du ticket…", components: [] });
  await interaction.channel.delete(`Ticket fermé par ${interaction.user.tag}`).catch(async (error) => {
    logger.error("Fermeture de ticket impossible", error);
    await logError(interaction.client, "Fermeture de ticket impossible", error.message);
  });
}


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
