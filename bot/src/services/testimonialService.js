import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { logError, logInfo } from "./logService.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";
import { consumeToken, createToken, trackToken, verifyToken } from "../utils/token.js";

const TTL_SECONDS = 60 * 60 * 24 * 7; // 7 jours

/**
 * Génère un lien de témoignage à usage unique pour une commande terminée.
 * Le lien contient un jeton signé (HMAC) : impossible à deviner.
 */
export function createTestimonialLink({ reference, clientName, discordUserId, source }) {
  const token = createToken(
    { ref: reference ?? null, name: clientName ?? null, uid: discordUserId ?? null, src: source ?? "discord" },
    TTL_SECONDS,
  );
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
  trackToken(reference, payload.jti);
  return { token, url: `${env.publicBaseUrl}/t/${token}`, expiresAt: new Date(payload.exp * 1000).toISOString() };
}

export function revokeTestimonial(reference) {
  return import("../utils/token.js").then(({ revokeByReference }) => revokeByReference(reference));
}

export function readTestimonialToken(token) {
  return verifyToken(token);
}

/** Publie le témoignage dans le salon dédié (jamais modifiable par l'utilisateur). */
export async function publishTestimonial(client, { payload, rating, message, displayName }) {
  if (!env.testimonialChannelId) {
    throw new Error("TESTIMONIAL_CHANNEL_ID n'est pas configuré.");
  }

  const channel = await client.channels.fetch(env.testimonialChannelId).catch(() => null);
  if (!channel?.isTextBased?.()) {
    await logError(client, "Salon témoignages introuvable", "TESTIMONIAL_CHANNEL_ID invalide.");
    throw new Error("Salon de témoignages introuvable.");
  }

  const author = payload.uid ? `<@${payload.uid}>` : displayName || payload.name || "Client";
  const stars = rating ? "⭐".repeat(rating) + "☆".repeat(5 - rating) : null;

  const fields = [];
  if (stars) fields.push({ name: "Note", value: `${stars} (${rating}/5)`, inline: true });
  if (payload.ref) fields.push({ name: "Commande", value: `\`${payload.ref}\``, inline: true });
  fields.push({ name: "Date", value: `<t:${Math.floor(Date.now() / 1000)}:D>`, inline: true });

  const embed = baseEmbed({
    title: "Nouveau témoignage client",
    description: `**Client :** ${author}\n\n> ${message.replace(/\n/g, "\n> ")}`,
    color: COLORS.success,
    fields,
  });

  await channel.send({ embeds: [embed] });
  consumeToken(payload.jti);
  await logInfo(client, "Témoignage publié", `Commande : ${payload.ref ?? "n/a"}`);
  logger.info("Témoignage publié (lien consommé)");
  return true;
}

/** Bouton « Laisser un témoignage » (le lien reste hors des logs). */
export function testimonialButtonRow(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Laisser un témoignage").setURL(url),
  );
}
