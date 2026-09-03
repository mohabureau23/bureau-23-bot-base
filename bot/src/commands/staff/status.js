import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";

/**
 * Commande staff : protégée par ManageGuild (jamais Administrator par défaut).
 */
export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Affiche l'état technique du bot (staff).")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const uptimeSeconds = Math.floor((interaction.client.uptime ?? 0) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        baseEmbed({
          title: "État du bot",
          fields: [
            { name: "Uptime", value: `${hours}h ${minutes}m`, inline: true },
            { name: "Latence WS", value: `${Math.max(interaction.client.ws.ping, 0)} ms`, inline: true },
            { name: "Commandes chargées", value: `${interaction.client.commands.size}`, inline: true },
            { name: "Serveurs", value: `${interaction.client.guilds.cache.size}`, inline: true },
            { name: "Node", value: process.version, inline: true },
          ],
        }),
      ],
    });
  },
};
