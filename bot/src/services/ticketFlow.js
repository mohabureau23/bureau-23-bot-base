import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
} from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";
import { logError, logInfo, logSuccess } from "./logService.js";
import { isStaff } from "./ticketService.js";
import { archiveTranscript } from "./transcriptService.js";
import { TICKET_TYPES, TICKET_TYPE_LIST, diagnosticInfo, inputStyle } from "../config/tickets.js";

/** Brouillons de formulaire en cours (clé = id du salon ticket). */
const sessions = new Map();

const ID = "t23";

function slugify(name) {
  return (
    String(name ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) || "membre"
  );
}

const channelNameFor = (type, member) =>
  `${type.prefix}-${slugify(member.user?.username ?? member.displayName)}`;

/* ------------------------------------------------------------------ */
/* Messages d'entrée (persistants : les customId sont statiques)       */
/* ------------------------------------------------------------------ */

const openButton = (type) =>
  new ButtonBuilder()
    .setCustomId(`${ID}:open:${type.key}`)
    .setLabel(type.buttonLabel)
    .setStyle(ButtonStyle.Primary);

export function buildPanelMessage(type) {
  return {
    embeds: [baseEmbed({ title: type.panel.title, description: type.panel.description, color: COLORS.brand })],
    components: [new ActionRowBuilder().addComponents(openButton(type))],
  };
}

export function buildSupportMessage() {
  return {
    embeds: [
      baseEmbed({
        title: "BUREAU 23 • Nos guichets",
        description:
          "En plus des demandes d'assistance, tu peux ouvrir directement :\n\n" +
          "🧪 **Devenir Testeur** — tester des serveurs de jeux et rédiger des comptes rendus détaillés (0,50 € par test validé).\n" +
          "🤝 **Devenir Partenaire** — hébergement, sécurité, graphisme, développement…\n" +
          "🚀 **Démarrer un projet** — accompagnement complet de ton serveur de jeu.",
        color: COLORS.brand,
      }),
    ],
    components: [new ActionRowBuilder().addComponents(...TICKET_TYPE_LIST.map(openButton))],
  };
}

/* ------------------------------------------------------------------ */
/* Ouverture du ticket                                                 */
/* ------------------------------------------------------------------ */

function formComponents(type, step = 0) {
  const rows = [];
  if (step === 0) {
    for (const select of type.selects) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`${ID}:sel:${type.key}:${select.key}`)
        .setPlaceholder(select.placeholder)
        .addOptions(select.options.map((o) => ({ label: o.label, value: o.value, default: Boolean(o.default) })));
      if (select.multi) menu.setMinValues(1).setMaxValues(select.options.length);
      rows.push(new ActionRowBuilder().addComponents(menu));
    }
  }
  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`${ID}:form:${type.key}:${step}`)
        .setLabel(step === 0 ? "📝 Remplir le formulaire" : "➡️ Continuer le formulaire")
        .setStyle(ButtonStyle.Success),
    ),
  );
  return rows;
}

const closeRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${ID}:close`).setLabel("🔒 Fermer le ticket").setStyle(ButtonStyle.Danger),
  );

async function handleOpen(interaction, typeKey) {
  const type = TICKET_TYPES[typeKey];
  if (!type) return;
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const member = interaction.member;
  const me = guild?.members?.me;

  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.editReply("Impossible d'ouvrir le ticket : permission « Gérer les salons » manquante.");
    return;
  }

  const name = channelNameFor(type, member);
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === name,
  );
  if (existing) {
    await interaction.editReply(`Tu as déjà un ticket **${type.label}** ouvert : ${existing}`);
    return;
  }

  const allow = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
  ];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id, allow },
    { id: me.id, allow: [...allow, PermissionFlagsBits.ManageChannels] },
  ];
  if (env.staffRoleId)
    overwrites.push({ id: env.staffRoleId, allow: [...allow, PermissionFlagsBits.ManageMessages] });

  let channel;
  try {
    channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: type.categoryId ?? undefined,
      reason: `Ticket ${type.label} ouvert par ${member.user.tag}`,
      permissionOverwrites: overwrites,
    });
  } catch (error) {
    logger.error("Création du ticket impossible", error);
    await logError(interaction.client, "Création de ticket impossible", `${type.label} — ${error.message}`);
    await interaction.editReply("Création du ticket impossible (catégorie ou permissions ?). L'équipe est notifiée.");
    return;
  }

  sessions.set(channel.id, { typeKey: type.key, userId: member.id, answers: {}, selects: {} });

  try {
    await channel.send({
      content: `${member}${env.staffRoleId ? ` <@&${env.staffRoleId}>` : ""}`,
      embeds: [
        baseEmbed({
          title: `${type.emoji} ${type.label}`,
          description: `${type.intro}\n\nComplète le formulaire ci-dessous pour finaliser ta demande.`,
          color: COLORS.brand,
        }),
      ],
      components: formComponents(type, 0),
    });
  } catch (error) {
    logger.warn("Envoi du formulaire impossible", error);
  }

  await interaction.editReply(`Ton ticket **${type.label}** est ouvert : ${channel}`);
  await logInfo(interaction.client, "Ticket ouvert", `${type.label} — ${channel.name} (${member.user.tag})`);
}

/* ------------------------------------------------------------------ */
/* Formulaire                                                          */
/* ------------------------------------------------------------------ */

function session(interaction) {
  let data = sessions.get(interaction.channelId);
  if (!data) {
    data = { typeKey: null, userId: interaction.user.id, answers: {}, selects: {} };
    sessions.set(interaction.channelId, data);
  }
  return data;
}

function isOwner(interaction) {
  const data = sessions.get(interaction.channelId);
  return !data?.userId || data.userId === interaction.user.id;
}

async function handleSelect(interaction, typeKey, key) {
  if (!isOwner(interaction)) {
    await interaction.reply({ content: "Seul l'auteur du ticket peut remplir ce formulaire.", flags: MessageFlags.Ephemeral });
    return;
  }
  const data = session(interaction);
  data.typeKey = typeKey;
  data.selects[key] = interaction.values;
  await interaction.reply({ content: "Réponse enregistrée ✅", flags: MessageFlags.Ephemeral });
}

async function handleFormButton(interaction, typeKey, step) {
  const type = TICKET_TYPES[typeKey];
  if (!type?.steps[step]) return;
  if (!isOwner(interaction)) {
    await interaction.reply({ content: "Seul l'auteur du ticket peut remplir ce formulaire.", flags: MessageFlags.Ephemeral });
    return;
  }

  const config = type.steps[step];
  const modal = new ModalBuilder()
    .setCustomId(`${ID}:modal:${type.key}:${step}`)
    .setTitle(config.title.slice(0, 45))
    .addComponents(
      ...config.fields.map((field) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(field.id)
            .setLabel(field.label.slice(0, 45))
            .setStyle(inputStyle(field))
            .setMaxLength(field.max ?? 500)
            .setRequired(Boolean(field.required)),
        ),
      ),
    );
  await interaction.showModal(modal);
}

async function handleModal(interaction, typeKey, step) {
  const type = TICKET_TYPES[typeKey];
  if (!type?.steps[step]) return;
  const data = session(interaction);
  data.typeKey = type.key;
  data.userId = interaction.user.id;
  for (const field of type.steps[step].fields) {
    data.answers[field.id] = interaction.fields.getTextInputValue(field.id)?.trim() || "";
  }

  const next = step + 1;
  if (type.steps[next]) {
    await interaction.reply({
      content: "Première partie enregistrée ✅ Termine avec la seconde partie.",
      components: formComponents(type, next),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferReply();
  try {
    await interaction.channel.send({ embeds: [recapEmbed(type, data, interaction.user)], components: [closeRow()] });
    await interaction.deleteReply().catch(() => {});
    await logSuccess(
      interaction.client,
      "Formulaire de ticket complété",
      `${type.label} — ${interaction.channel.name} (${interaction.user.tag})`,
    );
  } catch (error) {
    logger.error("Publication du récapitulatif impossible", error);
    await logError(interaction.client, "Récapitulatif de ticket impossible", error.message);
    await interaction.editReply("Impossible de publier le récapitulatif. L'équipe a été notifiée.");
  }
}

function recapEmbed(type, data, user) {
  const value = (raw) => {
    const text = String(raw ?? "").trim();
    return text ? text.slice(0, 1024) : "Non précisé";
  };
  const fields = [];

  for (const step of type.steps) {
    for (const field of step.fields) {
      if (!data.answers[field.id] && !field.required) continue;
      fields.push({ name: field.label, value: value(data.answers[field.id]), inline: false });
    }
  }
  for (const select of type.selects) {
    const chosen = data.selects[select.key];
    fields.push({
      name: select.label,
      value: value(Array.isArray(chosen) ? chosen.join(", ") : chosen),
      inline: true,
    });
  }

  let description = `Demande de ${user} • Statut : **Ouvert**`;

  if (type.key === "testeur") {
    const age = Number.parseInt(data.answers.age ?? "", 10);
    if (Number.isFinite(age) && age < 16) {
      description += `\n\n⚠️ **Attention staff : le candidat a ${age} ans**, en dessous de l'âge minimum souhaité (16 ans). Candidature conservée.`;
    }
    description += "\n\n💰 Rémunération : 0,50 € par test validé par BUREAU 23.";
  }
  if (type.key === "projet") {
    const wants = (data.selects.diagnostic ?? [])[0];
    if (wants === "Oui") description += `\n\n${diagnosticInfo().text}`;
  }

  return baseEmbed({
    title: `${type.emoji} Récapitulatif — ${type.label}`,
    description,
    color: COLORS.brand,
    fields: fields.slice(0, 25),
  });
}

/* ------------------------------------------------------------------ */
/* Fermeture + transcript                                              */
/* ------------------------------------------------------------------ */

async function handleClose(interaction) {
  if (!isStaff(interaction.member) && !interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: "Fermeture réservée au staff BUREAU 23.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({
    content: "Confirmer la fermeture ? Un transcript sera archivé avant la suppression du salon.",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`${ID}:close:yes`).setLabel("Confirmer").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`${ID}:close:no`).setLabel("Annuler").setStyle(ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCloseConfirm(interaction) {
  if (!isStaff(interaction.member) && !interaction.member?.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    await interaction.update({ content: "Action non autorisée.", components: [] });
    return;
  }
  await interaction.update({ content: "Génération du transcript…", components: [] });
  const channel = interaction.channel;
  try {
    await archiveTranscript(channel, interaction.user.tag);
    sessions.delete(channel.id);
    await channel.delete(`Ticket fermé par ${interaction.user.tag}`);
  } catch (error) {
    logger.error("Fermeture de ticket impossible", error);
    await logError(interaction.client, "Fermeture de ticket impossible", error.message);
    await interaction.followUp({ content: "Fermeture impossible. L'équipe a été notifiée.", flags: MessageFlags.Ephemeral });
  }
}

/* ------------------------------------------------------------------ */
/* Routeur                                                             */
/* ------------------------------------------------------------------ */

/** Retourne true si l'interaction a été prise en charge par ce système. */
export async function handleTicketFlow(interaction) {
  const customId = interaction.customId ?? "";
  if (!customId.startsWith(`${ID}:`)) return false;
  const [, action, a, b] = customId.split(":");

  try {
    if (interaction.isButton()) {
      if (action === "open") await handleOpen(interaction, a);
      else if (action === "form") await handleFormButton(interaction, a, Number(b));
      else if (action === "close" && a === "yes") await handleCloseConfirm(interaction);
      else if (action === "close" && a === "no")
        await interaction.update({ content: "Fermeture annulée.", components: [] });
      else if (action === "close") await handleClose(interaction);
      return true;
    }
    if (interaction.isStringSelectMenu() && action === "sel") {
      await handleSelect(interaction, a, b);
      return true;
    }
    if (interaction.isModalSubmit() && action === "modal") {
      await handleModal(interaction, a, Number(b));
      return true;
    }
  } catch (error) {
    logger.error("Erreur dans le système de tickets", error);
    await logError(interaction.client, "Erreur système de tickets", error.message);
    const payload = { content: "Une erreur est survenue. L'équipe a été notifiée.", flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
    return true;
  }
  return false;
}
