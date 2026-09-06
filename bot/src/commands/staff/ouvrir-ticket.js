import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { env } from "../../config/env.js";
import { baseEmbed, COLORS } from "../../utils/embeds.js";

function slugify(name) {
  return (
    String(name ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "membre"
  );
}

/** Embed d'accueil du ticket (réutilisé par le bouton « Prendre en charge »). */
export function ticketEmbed({ client, opener, statut }) {
  return baseEmbed({
    title: "BUREAU 23 • Nouvelle demande",
    description:
      "Ce salon est **privé** : seuls le client, l'équipe BUREAU 23 et le bot y ont accès.\n" +
      "Votre demande est prise en charge — décrivez votre besoin, un membre de l'équipe vous répond au plus vite.",
    color: COLORS.brand,
    fields: [
      { name: "Client", value: `${client}`, inline: true },
      { name: "Ouvert par", value: `${opener}`, inline: true },
      { name: "Statut", value: statut, inline: false },
    ],
  });
}

export const ticketActionRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:claim")
      .setLabel("Prendre en charge")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticket:close")
      .setLabel("Fermer le ticket")
      .setStyle(ButtonStyle.Danger),
  );

export default {
  category: "staff",
  data: new SlashCommandBuilder()
    .setName("ouvrir-ticket")
    .setDescription("Ouvre un salon ticket privé pour un client (test — Administrateur uniquement).")
    .addUserOption((option) =>
      option.setName("client").setDescription("Client concerné").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "Commande de test réservée aux administrateurs du serveur.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const clientMember = interaction.options.getMember("client") ?? interaction.options.getUser("client");
    const guild = interaction.guild;
    const me = guild.members.me;

    if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.editReply("Permission « Gérer les salons » manquante pour créer le ticket.");
      return;
    }

    const username = clientMember?.user?.username ?? clientMember?.username ?? "client";
    const channelName = `ticket-${slugify(username)}`;

    const allow = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ];

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: me.id, allow: [...allow, PermissionFlagsBits.ManageChannels] },
      { id: interaction.user.id, allow },
      { id: clientMember.id, allow },
    ];
    if (env.staffRoleId) overwrites.push({ id: env.staffRoleId, allow });

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: env.ticketCategoryId ?? undefined,
      reason: `Ticket de test ouvert par ${interaction.user.tag}`,
      permissionOverwrites: overwrites,
    });

    await channel.send({
      content: `${clientMember}${env.staffRoleId ? ` <@&${env.staffRoleId}>` : ""}`,
      embeds: [
        ticketEmbed({
          client: `<@${clientMember.id}>`,
          opener: `<@${interaction.user.id}>`,
          statut: "En attente de prise en charge",
        }),
      ],
      components: [ticketActionRow()],
    });

    await interaction.editReply(`Ticket créé : ${channel}`);
  },
};
