import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { isStaff } from "../../services/ticketService.js";
import { buildPanelMessage, buildSupportMessage } from "../../services/ticketFlow.js";
import { SUPPORT_CHANNEL_ID, TICKET_TYPE_LIST } from "../../config/tickets.js";
import { logError } from "../../services/logService.js";
import { logger } from "../../utils/logger.js";

/** Publie (ou republie) les messages d'entrée à boutons des 3 filières + le salon support. */
export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("panneaux-tickets")
    .setDescription("Publie les messages à boutons des tickets (testeur, partenaire, projet + support).")
    .setDMPermission(false),

  async execute(interaction) {
    if (!isStaff(interaction.member) && !interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "Commande réservée au staff BUREAU 23.", flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const results = [];
    const publish = async (channelId, payload, label) => {
      if (!channelId) return results.push(`⚠️ ${label} : salon non configuré`);
      try {
        const channel = await interaction.client.channels.fetch(channelId);
        if (!channel?.isTextBased?.()) return results.push(`⚠️ ${label} : salon invalide`);
        await channel.send(payload);
        results.push(`✅ ${label} → ${channel}`);
      } catch (error) {
        logger.error(`Publication du panneau ${label} impossible`, error);
        await logError(interaction.client, "Panneau de tickets impossible", `${label} — ${error.message}`);
        results.push(`❌ ${label} : ${error.message}`);
      }
    };

    for (const type of TICKET_TYPE_LIST) {
      await publish(type.entryChannelId, buildPanelMessage(type), type.label);
    }
    await publish(SUPPORT_CHANNEL_ID, buildSupportMessage(), "Support (3 boutons)");

    await interaction.editReply(results.join("\n"));
  },
};
