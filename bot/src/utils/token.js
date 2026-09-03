import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Jetons signés HMAC (aucune base de données) :
 * payload base64url + signature. Usage unique et révocation via un
 * registre en mémoire — limite assumée : un redémarrage du bot remet ce
 * registre à zéro (un jeton déjà utilisé redeviendrait valide jusqu'à son
 * expiration). Suffisant pour un lien de témoignage de courte durée.
 */
const consumed = new Set();

function b64url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(data) {
  return createHmac("sha256", env.tokenSecret).update(data).digest("base64url");
}

export function createToken(payload, ttlSeconds = 60 * 60 * 24 * 7) {
  const body = { ...payload, jti: randomUUID(), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64url(JSON.stringify(body));
  return `${data}.${sign(data)}`;
}

/** @returns {{ ok: true, payload: object } | { ok: false, reason: string }} */
export function verifyToken(token) {
  if (typeof token !== "string" || !token.includes(".")) return { ok: false, reason: "invalide" };
  const [data, signature] = token.split(".");
  const expected = sign(data);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return { ok: false, reason: "signature invalide" };
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "invalide" };
  }

  if (payload.exp * 1000 < Date.now()) return { ok: false, reason: "expiré" };
  if (consumed.has(payload.jti)) return { ok: false, reason: "déjà utilisé ou annulé" };
  return { ok: true, payload };
}

/** Marque un jeton comme consommé (usage unique) ou annulé (staff). */
export function consumeToken(jti) {
  consumed.add(jti);
}

/** Annule tous les jetons émis pour une référence de commande. */
const byReference = new Map();

export function trackToken(reference, jti) {
  if (!reference) return;
  const list = byReference.get(reference) ?? [];
  list.push(jti);
  byReference.set(reference, list);
}

export function revokeByReference(reference) {
  const list = byReference.get(reference) ?? [];
  list.forEach((jti) => consumed.add(jti));
  byReference.delete(reference);
  return list.length;
}
