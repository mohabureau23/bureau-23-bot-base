import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";

/**
 * Envoi des logs applicatifs vers le salon Discord dédié (LOG_CHANNEL_ID).
 * Toute erreur d'envoi est absorbée pour ne jamais casser le flux principal.
 */
async function fetchLogChannel(client) {
  if (!env.logChannelId) return null;
  try {
    const channel = await client.channels.fetch(env.logChannelId);
    if (!channel?.isTextBased?.()) return null;
    return channel;
  } catch (error) {
    logger.warn("Salon de logs introuvable", error);
    return null;
  }
}

export async function sendLog(client, { title, description, color = COLORS.neutral, fields = [] }) {
  logger.info(`${title} — ${description ?? ""}`);
  const channel = await fetchLogChannel(client);
  if (!channel) return;
  try {
    await channel.send({ embeds: [baseEmbed({ title, description, color, fields })] });
  } catch (error) {
    logger.warn("Échec de l'envoi du log Discord", error);
  }
}

export function logInfo(client, title, description, fields) {
  return sendLog(client, { title, description, color: COLORS.brand, fields });
}

export function logSuccess(client, title, description, fields) {
  return sendLog(client, { title, description, color: COLORS.success, fields });
}

export function logError(client, title, description, fields) {
  return sendLog(client, { title, description, color: COLORS.danger, fields });
}
