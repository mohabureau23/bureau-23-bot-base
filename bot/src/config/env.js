import "dotenv/config";
import { randomBytes } from "node:crypto";

/**
 * Chargement et validation centralisés des variables d'environnement.
 * Le token n'est JAMAIS journalisé ni exposé.
 */

// Sans ces deux valeurs, le bot ne peut tout simplement pas se connecter.
const REQUIRED = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID"];

// Optionnelles : le bot démarre quand même, avec la fonctionnalité désactivée.
const OPTIONAL = [
  "DISCORD_GUILD_ID",
  "WELCOME_CHANNEL_ID",
  "MEMBER_ROLE_ID",
  "LOG_CHANNEL_ID",
  "TESTIMONIAL_CHANNEL_ID",
  "STAFF_ROLE_ID",
  "TICKET_CATEGORY_ID",
  "PUBLIC_BASE_URL",
  "ADMIN_API_SECRET",
  "HUB_API_SECRET",
  "TESTIMONIAL_TOKEN_SECRET",
];

function readEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      [
        "",
        "==================================================",
        ` Variable(s) manquante(s) : ${missing.join(", ")}`,
        "",
        " Ajoute-les dans les variables d'environnement de",
        " ton hébergeur (ou dans un fichier .env local).",
        " DISCORD_TOKEN      = Discord Dev Portal > Bot > Reset Token",
        " DISCORD_CLIENT_ID  = Discord Dev Portal > General > Application ID",
        "==================================================",
        "",
      ].join("\n"),
    );
  }

  const missingOptional = OPTIONAL.filter((key) => !process.env[key]?.trim());

  // Les hébergeurs fournissent le port : PORT (Render) ou SERVER_PORT (Pterodactyl/ACL Clouds).
  const port = Number(process.env.PORT?.trim() || process.env.SERVER_PORT?.trim() || 8081);
  // Écoute sur toutes les interfaces, sinon le proxy de l'hébergeur renvoie 502.
  const host = process.env.HOST?.trim() || process.env.SERVER_IP?.trim() || "0.0.0.0";

  return {
    token: process.env.DISCORD_TOKEN.trim(),
    clientId: process.env.DISCORD_CLIENT_ID.trim(),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID?.trim() || null,
    memberRoleId: process.env.MEMBER_ROLE_ID?.trim() || null,
    logChannelId: process.env.LOG_CHANNEL_ID?.trim() || null,

    // Témoignages / staff / tickets
    testimonialChannelId: process.env.TESTIMONIAL_CHANNEL_ID?.trim() || null,
    staffRoleId: process.env.STAFF_ROLE_ID?.trim() || null,
    ticketCategoryId: process.env.TICKET_CATEGORY_ID?.trim() || null,

    // API HTTP (mini-site admin + Bureau 23 Hub)
    port: Number.isFinite(port) ? port : 8081,
    host,
    publicBaseUrl: (process.env.PUBLIC_BASE_URL?.trim() || `http://localhost:${port}`).replace(/\/+$/, ""),
    adminApiSecret: process.env.ADMIN_API_SECRET?.trim() || null,
    hubApiSecret: process.env.HUB_API_SECRET?.trim() || null,
    // Sans secret fourni, on en génère un éphémère : les liens deviennent
    // invalides au redémarrage (jamais de secret en dur dans le dépôt).
    tokenSecret: process.env.TESTIMONIAL_TOKEN_SECRET?.trim() || randomBytes(32).toString("hex"),

    logLevel: process.env.LOG_LEVEL?.trim() || "info",
    missingOptional,
  };
}

export const env = readEnv();

/** Vue sûre de la configuration (sans secret) pour affichage / debug. */
export function safeEnvSummary() {
  return {
    clientId: env.clientId,
    guildId: env.guildId,
    welcomeChannelId: env.welcomeChannelId,
    memberRoleId: env.memberRoleId,
    logChannelId: env.logChannelId,
    testimonialChannelId: env.testimonialChannelId,
    staffRoleId: env.staffRoleId,
    ticketCategoryId: env.ticketCategoryId,
    port: env.port,
    host: env.host,
    publicBaseUrl: env.publicBaseUrl,
    adminApiSecret: env.adminApiSecret ? "***set***" : null,
    hubApiSecret: env.hubApiSecret ? "***set***" : null,
    tokenSecret: "***redacted***",
    logLevel: env.logLevel,
    token: "***redacted***",
  };
}
