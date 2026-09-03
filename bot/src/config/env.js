import "dotenv/config";

/**
 * Chargement et validation centralisés des variables d'environnement.
 * Le token n'est JAMAIS journalisé ni exposé.
 */

const REQUIRED = [
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "DISCORD_GUILD_ID",
  "WELCOME_CHANNEL_ID",
  "MEMBER_ROLE_ID",
  "LOG_CHANNEL_ID",
];

function readEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}. Voir .env.example`,
    );
  }

  return {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    welcomeChannelId: process.env.WELCOME_CHANNEL_ID,
    memberRoleId: process.env.MEMBER_ROLE_ID,
    logChannelId: process.env.LOG_CHANNEL_ID,
    logLevel: process.env.LOG_LEVEL?.trim() || "info",
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
