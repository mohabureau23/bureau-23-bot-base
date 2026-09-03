import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { env } from "../../config/env.js";
import { baseEmbed, COLORS } from "../../utils/embeds.js";
import { isStaff } from "../../services/ticketService.js";
import { createTestimonialLink, testimonialButtonRow } from "../../services/testimonialService.js";

/** Déduit le client d'un salon « commande-pseudo » via ses permissions. */
async function detectClient(interaction) {
  const channel = interaction.channel;
  if (!channel?.permissionOverwrites) return null;
  for (const overwrite of channel.permissionOverwrites.cache.values()) {
    if (overwrite.type !== 1) continue; // 1 = membre
    if (overwrite.id === interaction.client.user.id) continue;
    const member = await interaction.guild.members.fetch(overwrite.id).catch(() => null);
    if (member && !isStaff(member)) return member;
  }
  return null;
}

export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("terminer-commande")
    .setDescription("Marque la commande du salon comme terminée et propose le témoignage (staff).")
    .addUserOption((option) =>
      option.setName("client").setDescription("Client concerné (si non détecté automatiquement)"),
    )
    .addStringOption((option) =>
      option.setName("reference").setDescription("Référence de commande (optionnel)"),
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

    if (!env.testimonialChannelId) {
      await interaction.reply({
        content: "TESTIMONIAL_CHANNEL_ID n'est pas configuré côté hébergeur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const client = interaction.options.getMember("client") ?? (await detectClient(interaction));
    const reference =
      interaction.options.getString("reference") ?? interaction.channel?.name ?? `cmd-${interaction.id}`;

    const { url } = createTestimonialLink({
      reference,
      clientName: client?.user?.username ?? null,
      discordUserId: client?.id ?? null,
      source: "discord",
    });

    const embed = baseEmbed({
      title: "Commande terminée ✅",
      description: `${client ? `${client}, ` : ""}merci pour ta confiance !\nTu peux laisser un témoignage via le bouton ci-dessous (lien personnel, valable 7 jours, une seule utilisation).`,
      color: COLORS.success,
      fields: [{ name: "Référence", value: `\`${reference}\`` }],
    });

    await interaction.channel.send({
      content: client ? `${client}` : undefined,
      embeds: [embed],
      components: [testimonialButtonRow(url)],
    });

    await interaction.editReply(
      `Commande \`${reference}\` marquée terminée. Lien de témoignage envoyé dans le salon${client ? ` pour ${client.user.tag}` : ""}.`,
    );
  },
};
