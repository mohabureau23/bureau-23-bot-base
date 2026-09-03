import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { logError, logSuccess } from "./logService.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";

/** Attribue le rôle « 🌐 MEMBRE » (MEMBER_ROLE_ID) à un nouvel arrivant. */
export async function assignMemberRole(member) {
  try {
    const role = member.guild.roles.cache.get(env.memberRoleId)
      ?? (await member.guild.roles.fetch(env.memberRoleId));

    if (!role) {
      await logError(member.client, "Rôle membre introuvable", `MEMBER_ROLE_ID invalide pour ${member.user.tag}`);
      return false;
    }

    const me = member.guild.members.me;
    if (!me?.permissions.has("ManageRoles") || role.position >= me.roles.highest.position) {
      await logError(
        member.client,
        "Attribution de rôle impossible",
        "Permission ManageRoles manquante ou hiérarchie de rôles insuffisante.",
      );
      return false;
    }

    await member.roles.add(role, "Attribution automatique à l'arrivée");
    await logSuccess(member.client, "Rôle attribué", `${role.name} → ${member.user.tag}`);
    return true;
  } catch (error) {
    logger.error("assignMemberRole a échoué", error);
    await logError(member.client, "Erreur attribution rôle", `${member.user.tag} : ${error.message}`);
    return false;
  }
}

/** Message de bienvenue dans WELCOME_CHANNEL_ID. */
export async function sendWelcomeMessage(member) {
  try {
    const channel = await member.client.channels.fetch(env.welcomeChannelId);
    if (!channel?.isTextBased?.()) {
      await logError(member.client, "Salon de bienvenue introuvable", "WELCOME_CHANNEL_ID invalide.");
      return false;
    }

    const embed = baseEmbed({
      title: "Bienvenue chez BUREAU 23",
      description: `Bonjour ${member}, ravi de t'accueillir sur le serveur.\nUtilise \`/help\` pour découvrir les commandes disponibles.`,
      color: COLORS.success,
    }).setThumbnail(member.user.displayAvatarURL());

    await channel.send({ content: `${member}`, embeds: [embed] });
    return true;
  } catch (error) {
    logger.error("sendWelcomeMessage a échoué", error);
    await logError(member.client, "Erreur message de bienvenue", error.message);
    return false;
  }
}
