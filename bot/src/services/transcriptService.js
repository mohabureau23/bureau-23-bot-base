import { AttachmentBuilder } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";

/**
 * Génère un transcript texte du salon et l'archive dans le salon de logs
 * existant (LOG_CHANNEL_ID). Réutilise le mécanisme de logs du projet.
 */
export async function archiveTranscript(channel, closedBy) {
  const lines = [];
  try {
    let before;
    const collected = [];
    for (let i = 0; i < 10; i += 1) {
      const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
      if (batch.size === 0) break;
      collected.push(...batch.values());
      before = batch.last()?.id;
      if (batch.size < 100) break;
    }
    collected
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .forEach((message) => {
        const time = new Date(message.createdTimestamp).toISOString();
        const author = message.author?.tag ?? "inconnu";
        const content = message.content?.trim();
        const embeds = message.embeds
          .map((embed) => `[embed] ${embed.title ?? ""} — ${(embed.description ?? "").replace(/\n/g, " ")}`)
          .join("\n");
        const files = message.attachments.map((a) => `[fichier] ${a.url}`).join("\n");
        lines.push([`[${time}] ${author}: ${content || ""}`, embeds, files].filter(Boolean).join("\n"));
      });
  } catch (error) {
    logger.warn("Lecture des messages impossible pour le transcript", error);
    lines.push("(Transcript partiel : lecture des messages impossible.)");
  }

  const body =
    `Transcript BUREAU 23 — #${channel.name}\n` +
    `Fermé par : ${closedBy}\nDate : ${new Date().toISOString()}\n` +
    "=".repeat(60) +
    "\n" +
    (lines.join("\n") || "(aucun message)");

  if (!env.logChannelId) {
    logger.info(`Transcript de #${channel.name} (aucun salon de logs configuré)`);
    return false;
  }

  try {
    const logChannel = await channel.client.channels.fetch(env.logChannelId);
    if (!logChannel?.isTextBased?.()) return false;
    const file = new AttachmentBuilder(Buffer.from(body, "utf8"), {
      name: `transcript-${channel.name.replace(/[^\w-]+/g, "-")}-${Date.now()}.txt`,
    });
    await logChannel.send({
      embeds: [
        baseEmbed({
          title: "Transcript de ticket",
          description: `Salon **#${channel.name}** fermé par ${closedBy}.`,
          color: COLORS.neutral,
        }),
      ],
      files: [file],
    });
    return true;
  } catch (error) {
    logger.warn("Archivage du transcript impossible", error);
    return false;
  }
}
