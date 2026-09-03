import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import { env, safeEnvSummary } from "./config/env.js";
import { loadModules } from "./utils/loadModules.js";
import { logger } from "./utils/logger.js";
import { startHttpServer } from "./http/server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

logger.setLevel(env.logLevel);
logger.debug("Configuration chargée", safeEnvSummary());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

async function registerCommands() {
  const commands = await loadModules(path.join(__dirname, "commands"));
  for (const command of commands) {
    if (!command?.data?.name || typeof command.execute !== "function") {
      logger.warn("Commande ignorée (structure invalide)");
      continue;
    }
    client.commands.set(command.data.name, command);
  }
  logger.info(`${client.commands.size} commande(s) chargée(s)`);
}

async function registerEvents() {
  const events = await loadModules(path.join(__dirname, "events"));
  for (const event of events) {
    if (!event?.name || typeof event.execute !== "function") continue;
    const handler = (...args) =>
      Promise.resolve(event.execute(...args)).catch((error) =>
        logger.error(`Erreur dans l'événement ${event.name}`, error),
      );
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }
  logger.info(`${events.length} événement(s) enregistré(s)`);
}

// Gestion d'erreurs globale : le process ne meurt pas silencieusement.
process.on("unhandledRejection", (reason) => logger.error("Rejet non géré", reason));
process.on("uncaughtException", (error) => logger.error("Exception non capturée", error));
client.on("error", (error) => logger.error("Erreur client Discord", error));
client.on("warn", (message) => logger.warn(message));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    logger.info(`Signal ${signal} reçu, arrêt propre du bot`);
    await client.destroy();
    process.exit(0);
  });
}

async function start() {
  await registerCommands();
  await registerEvents();
  startHttpServer(client);
  await client.login(env.token); // le token n'est jamais journalisé
}

start().catch((error) => {
  logger.error("Démarrage impossible", error);
  process.exit(1);
});
