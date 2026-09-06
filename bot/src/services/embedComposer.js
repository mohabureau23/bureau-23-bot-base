import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";
import { isStaff } from "./ticketService.js";
import { logError, logInfo } from "./logService.js";
import { logger } from "../utils/logger.js";

/**
 * Brouillons d'embed en mémoire (clé = id utilisateur).
 * Limite assumée : les brouillons non publiés sont perdus au redémarrage.
 */
const drafts = new Map();

export const EMBED_MODAL_ID = "embed:modal";

export function buildEmbedModal() {
  return new ModalBuilder()
    .setCustomId(EMBED_MODAL_ID)
    .setTitle("Créer un embed BUREAU 23")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Titre")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(256)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("description")
          .setLabel("Description")
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(4000)
          .setRequired(true),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("color")
          .setLabel("Couleur HEX (ex : #2B6CB0)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(7)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("image")
          .setLabel("URL d'image (optionnel)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(500)
          .setRequired(false),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("footer")
          .setLabel("Footer (optionnel)")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(200)
          .setRequired(false),
      ),
    );
}

function parseColor(input) {
  const value = Number.parseInt(String(input ?? "").replace(/^#/, ""), 16);
  return Number.isFinite(value) && value >= 0 && value <= 0xffffff ? value : COLORS.brand;
}

/** URL http(s) valide uniquement : Discord refuse tout le reste. */
function safeUrl(input) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function draftToEmbed(draft) {
  const embed = baseEmbed({
    title: draft.title,
    description: draft.description,
    color: draft.color,
  });
  if (draft.footer) embed.setFooter({ text: draft.footer });
  if (draft.image) embed.setImage(draft.image);
  return embed;
}

/** Modal validé : enregistre le brouillon et affiche l'aperçu. */
export async function handleEmbedModal(interaction) {
  const imageRaw = interaction.fields.getTextInputValue("image");
  const image = safeUrl(imageRaw);
  const draft = {
    title: interaction.fields.getTextInputValue("title").trim(),
    description: interaction.fields.getTextInputValue("description").trim(),
    color: parseColor(interaction.fields.getTextInputValue("color")),
    image,
    footer: interaction.fields.getTextInputValue("footer").trim() || null,
  };
  drafts.set(interaction.user.id, draft);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("embed:confirm").setLabel("Confirmer").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("embed:cancel").setLabel("Annuler").setStyle(ButtonStyle.Secondary),
  );

  const warning =
    imageRaw?.trim() && !image ? "\n⚠️ URL d'image ignorée (elle doit commencer par http:// ou https://)." : "";

  await interaction.reply({
    content: `Aperçu de ton embed :${warning}`,
    embeds: [draftToEmbed(draft)],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}

/** Confirmation : propose le salon de destination. */
export async function handleEmbedConfirm(interaction) {
  if (!drafts.has(interaction.user.id)) {
    await interaction.update({ content: "Brouillon expiré, relance `/embed`.", embeds: [], components: [] });
    return;
  }
  const row = new ActionRowBuilder().addComponents(
    new ChannelSelectMenuBuilder()
      .setCustomId("embed:channel")
      .setPlaceholder("Choisis le salon de destination")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
  );
  await interaction.update({ content: "Dans quel salon publier cet embed ?", components: [row] });
}

export async function handleEmbedCancel(interaction) {
  drafts.delete(interaction.user.id);
  await interaction.update({ content: "Création d'embed annulée.", embeds: [], components: [] });
}

/** Publication finale dans le salon choisi. */
export async function handleEmbedChannelSelect(interaction) {
  const draft = drafts.get(interaction.user.id);
  if (!draft) {
    await interaction.update({ content: "Brouillon expiré, relance `/embed`.", embeds: [], components: [] });
    return;
  }
  if (!isStaff(interaction.member)) {
    await interaction.update({ content: "Action réservée au staff BUREAU 23.", embeds: [], components: [] });
    return;
  }

  const channel = interaction.channels.first();
  const me = interaction.guild?.members?.me;
  if (!channel?.isTextBased?.()) {
    await interaction.update({ content: "Salon invalide.", embeds: [], components: [] });
    return;
  }
  if (me && !channel.permissionsFor(me)?.has(PermissionFlagsBits.SendMessages)) {
    await interaction.update({
      content: `Je n'ai pas la permission d'écrire dans ${channel}.`,
      embeds: [],
      components: [],
    });
    return;
  }

  try {
    await channel.send({ embeds: [draftToEmbed(draft)] });
    drafts.delete(interaction.user.id);
    await interaction.update({ content: `Embed publié dans ${channel}.`, embeds: [], components: [] });
    await logInfo(interaction.client, "Embed publié", `#${channel.name} par ${interaction.user.tag}`);
  } catch (error) {
    logger.error("Publication d'embed impossible", error);
    await logError(interaction.client, "Publication d'embed impossible", error.message);
    await interaction.update({
      content: "Publication impossible (permissions Discord ?). L'équipe a été notifiée.",
      embeds: [],
      components: [],
    });
  }
}
