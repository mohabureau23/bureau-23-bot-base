import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { isStaff } from "../../services/ticketService.js";
import { revokeByReference } from "../../utils/token.js";

export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("annuler-temoignage")
    .setDescription("Invalide le(s) lien(s) de témoignage d'une commande (staff).")
    .addStringOption((option) =>
      option.setName("reference").setDescription("Référence de commande (défaut : nom du salon)"),
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

    const reference = interaction.options.getString("reference") ?? interaction.channel?.name;
    const count = revokeByReference(reference);

    await interaction.reply({
      content:
        count > 0
          ? `${count} lien(s) de témoignage invalidé(s) pour \`${reference}\`.`
          : `Aucun lien actif trouvé pour \`${reference}\` (déjà utilisé, expiré, ou émis avant un redémarrage du bot).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
