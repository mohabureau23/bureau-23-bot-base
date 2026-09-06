import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { isStaff } from "../../services/ticketService.js";
import { buildEmbedModal } from "../../services/embedComposer.js";

export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Crée et publie un embed BUREAU 23 (staff).")
    .setDMPermission(false),

  async execute(interaction) {
    if (!isStaff(interaction.member)) {
      await interaction.reply({
        content: "Commande réservée au staff BUREAU 23.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    await interaction.showModal(buildEmbedModal());
  },
};
