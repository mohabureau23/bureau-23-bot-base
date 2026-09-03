# Bureau 23 Bot Base

Crée un projet séparé nommé « BUREAU 23 Discord Bot ». Ne modifie jamais Bureau 23 Hub. Objectif : préparer le code d’un bot Discord.js v14 maintenable et déployable sur Render 24/7, sans secrets dans le dépôt. V1 uniquement : /ping, /help, bienvenue, attribution automatique du rôle « 🌐 MEMBRE », logs, gestion d’erreurs, commandes staff protégées par permissions. Utiliser principalement Slash Commands/interactions. Prévoir variables d’environnement DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID, WELCOME_CHANNEL_ID, MEMBER_ROLE_ID, LOG_CHANNEL_ID. Créer .env.example sans valeurs, .gitignore Node.js excluant .env, package.json avec npm start, README de déploiement Render et structure claire commands/events/services/utils. Ne pas implémenter tickets, clients, projets ou synchronisation Hub maintenant, seulement préparer une architecture extensible. Ne jamais utiliser Administrator par défaut et ne jamais afficher le token dans les logs. Avant de terminer, vérifier le build/typecheck et résumer les fichiers créés. Optimise ce premier passage pour limiter les crédits : fais toute la V1 en une seule intervention, sans ajout de fonctionnalités non demandées.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ff480b15-2693-4770-9c3a-8d5bd1b51750).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
