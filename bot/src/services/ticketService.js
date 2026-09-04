import { ChannelType, PermissionFlagsBits } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { logError, logSuccess } from "./logService.js";

function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20) || "membre"
  );
}

/**
 * Crée un salon privé « ticket-pseudo » visible uniquement par le membre
 * et le rôle staff. Jamais Administrator.
 */
export async function createTicketChannel(guild, member) {
  const channelName = `ticket-${slugify(member.user.username)}`;

  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === channelName,
  );
  if (existing) return { created: false, channel: existing };

  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    throw new Error("Permission « Gérer les salons » manquante pour créer le ticket.");
  }

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
    {
      id: me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  if (env.staffRoleId) {
    overwrites.push({
      id: env.staffRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ],
    });
  }

  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: env.ticketCategoryId ?? undefined,
      reason: `Ticket ouvert par ${member.user.tag}`,
      permissionOverwrites: overwrites,
    });

    await channel.send({
      content: `${member}${env.staffRoleId ? ` <@&${env.staffRoleId}>` : ""}`,
      embeds: [
        {
          title: "Nouveau ticket",
          description: "Décris ta demande, l'équipe BUREAU 23 te répond au plus vite.",
          color: 0x2b6cb0,
        },
      ],
    });

    await logSuccess(guild.client, "Ticket créé", `${channel.name} pour ${member.user.tag}`);
    return { created: true, channel };
  } catch (error) {
    logger.error("createTicketChannel a échoué", error);
    await logError(guild.client, "Création de ticket impossible", error.message);
    throw error;
  }
}

/** Vrai si le membre possède le rôle staff configuré. */
export function isStaff(member) {
  if (!env.staffRoleId || !member) return false;
  const roles = member.roles;
  // Selon la source (interaction, cache partiel, API brute), roles est un
  // GuildMemberRoleManager, une Collection, ou un simple tableau d'IDs.
  if (roles?.cache?.has?.(env.staffRoleId)) return true;
  if (typeof roles?.has === "function" && roles.has(env.staffRoleId)) return true;
  if (Array.isArray(roles) && roles.includes(env.staffRoleId)) return true;
  if (Array.isArray(roles?.valueOf?.()) && roles.valueOf().includes(env.staffRoleId)) return true;
  return false;
}
