import "dotenv/config";

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

  return {
    token: process.env.DISCORD_TOKEN.trim(),
    clientId: process.env.DISCORD_CLIENT_ID.trim(),
    guildId: process.env.DISCORD_GUILD_ID?.trim() || null,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID?.trim() || null,
    memberRoleId: process.env.MEMBER_ROLE_ID?.trim() || null,
    logChannelId: process.env.LOG_CHANNEL_ID?.trim() || null,
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
    logLevel: env.logLevel,
    token: "***redacted***",
  };
}
