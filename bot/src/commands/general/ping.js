import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseEmbed, COLORS } from "../../utils/embeds.js";

export default {
  category: "general",
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie la latence et la disponibilité du bot."),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "Mesure en cours…",
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    const roundTrip = (sent.resource?.message?.createdTimestamp ?? Date.now()) - interaction.createdTimestamp;

    await interaction.editReply({
      content: "",
      embeds: [
        baseEmbed({
          title: "Pong",
          color: COLORS.success,
          fields: [
            { name: "Aller-retour", value: `${Math.max(roundTrip, 0)} ms`, inline: true },
            { name: "WebSocket", value: `${Math.max(interaction.client.ws.ping, 0)} ms`, inline: true },
          ],
        }),
      ],
    });
  },
};
