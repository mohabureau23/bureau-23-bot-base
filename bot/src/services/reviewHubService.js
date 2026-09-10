import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Client serveur-à-serveur vers Bureau 23 Hub (projet séparé).
 *
 * Contrat :
 *   POST <REVIEW_HUB_URL>/api/reviews/tokens
 *   Header  Authorization: Bearer <REVIEW_API_KEY>
 *   Body    { discordUserId, discordUsername, projectName?, orderId? }
 *   Réponse { url, token, expiresAt }
 *
 * La clé n'est jamais journalisée ni renvoyée au navigateur.
 */

const TIMEOUT_MS = 6000;

export function isReviewHubConfigured() {
  return Boolean(env.reviewHubUrl && env.reviewApiKey);
}

/**
 * @returns {Promise<{ ok: true, url: string, expiresAt: string|null } | { ok: false, reason: string }>}
 */
export async function requestReviewLink({ discordUserId, discordUsername, projectName, orderId }) {
  if (!isReviewHubConfigured()) {
    return { ok: false, reason: "Hub non configuré (REVIEW_HUB_URL / REVIEW_API_KEY absents)" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${env.reviewHubUrl}/api/reviews/tokens`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.reviewApiKey}`,
      },
      body: JSON.stringify({
        discordUserId: discordUserId ?? null,
        discordUsername: discordUsername ?? null,
        projectName: projectName ?? null,
        orderId: orderId ?? null,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { ok: false, reason: `Hub HTTP ${response.status}` };
    }

    const data = await response.json().catch(() => null);
    const url = typeof data?.url === "string" ? data.url : null;
    if (!url || !/^https?:\/\//i.test(url)) {
      return { ok: false, reason: "Réponse du Hub invalide (url manquante)" };
    }

    return { ok: true, url, expiresAt: typeof data.expiresAt === "string" ? data.expiresAt : null };
  } catch (error) {
    const reason = error?.name === "AbortError" ? "Hub injoignable (timeout)" : `Hub injoignable (${error.message})`;
    logger.warn(`Création du lien de témoignage impossible : ${reason}`);
    return { ok: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
