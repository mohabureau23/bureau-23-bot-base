# BUREAU 23 Discord Bot — V1

Bot Discord.js v14 (Node 20+, ESM), conçu pour tourner 24/7 sur Render en Background Worker.
Aucun secret n'est stocké dans le dépôt : tout passe par des variables d'environnement.

## Périmètre V1

- `/ping` — latence et disponibilité
- `/help` — liste des commandes accessibles à l'utilisateur
- Message de bienvenue automatique (`WELCOME_CHANNEL_ID`)
- Attribution automatique du rôle « 🌐 MEMBRE » (`MEMBER_ROLE_ID`)
- Logs applicatifs console + salon Discord (`LOG_CHANNEL_ID`)
- Gestion d'erreurs globale (commandes, événements, process)
- Commandes staff protégées par permissions (`/status` → `Manage Server`)

Hors périmètre pour l'instant : tickets, clients, projets, synchronisation Hub.
L'architecture est prête à les accueillir (nouveaux dossiers `commands/<catégorie>` et `services/`).

## Structure

```
bot/
├── src/
│   ├── index.js                 # bootstrap client, chargement dynamique, arrêt propre
│   ├── deploy-commands.js       # enregistrement des slash commands sur la guilde
│   ├── config/env.js            # lecture + validation des variables d'environnement
│   ├── commands/
│   │   ├── general/ping.js
│   │   ├── general/help.js
│   │   └── staff/status.js      # protégée par ManageGuild
│   ├── events/
│   │   ├── ready.js
│   │   ├── guildMemberAdd.js    # bienvenue + rôle membre
│   │   └── interactionCreate.js # routage + gestion d'erreurs
│   ├── services/
│   │   ├── logService.js
│   │   └── memberService.js
│   └── utils/
│       ├── logger.js            # logger avec masquage systématique du token
│       ├── loadModules.js
│       └── embeds.js
├── .env.example
├── .gitignore
└── package.json
```

## Variables d'environnement

| Variable             | Description                                    |
| -------------------- | ---------------------------------------------- |
| `DISCORD_TOKEN`      | Token du bot (secret, jamais loggé)            |
| `DISCORD_CLIENT_ID`  | ID de l'application Discord                    |
| `DISCORD_GUILD_ID`   | ID du serveur BUREAU 23                        |
| `WELCOME_CHANNEL_ID` | Salon des messages de bienvenue                |
| `MEMBER_ROLE_ID`     | ID du rôle « 🌐 MEMBRE »                       |
| `LOG_CHANNEL_ID`     | Salon des logs du bot                          |
| `LOG_LEVEL`          | Optionnel : `debug`/`info`/`warn`/`error`      |

## Installation locale

```bash
cd bot
cp .env.example .env      # renseigner les valeurs
npm install
npm run deploy:commands   # une fois, ou après ajout/modif de commandes
npm start
```

## Configuration Discord

1. Portail développeur → Bot → activer l'intent privilégié **Server Members Intent**.
2. Inviter le bot avec les scopes `bot` + `applications.commands` et les permissions
   minimales : `Manage Roles`, `View Channels`, `Send Messages`, `Embed Links`.
   **Ne pas donner Administrator.**
3. Placer le rôle du bot **au-dessus** du rôle « 🌐 MEMBRE » dans la hiérarchie,
   sinon l'attribution automatique échouera (l'erreur sera loggée).

## Déploiement Render (24/7)

1. Pousser le dépôt sur GitHub (le `.env` est ignoré par `.gitignore`).
2. Render → **New** → **Background Worker** (pas Web Service : le bot n'expose pas de port).
3. Repository : ce dépôt. **Root Directory** : `bot`.
4. Runtime `Node`, Build Command : `npm install`, Start Command : `npm start`.
5. Onglet **Environment** → ajouter les 6 variables ci-dessus (+ `LOG_LEVEL` si besoin).
   Ne jamais committer ces valeurs.
6. Déployer. Les logs Render doivent afficher `Connecté en tant que ...`.
7. Après chaque ajout de commande, relancer `npm run deploy:commands`
   (en local avec le même `.env`, ou via un one-off job Render).

Le plan gratuit Render peut recycler l'instance ; pour un fonctionnement réellement
24/7, utiliser un plan payant du Background Worker.

## Ajouter une commande

Créer `src/commands/<catégorie>/<nom>.js` exportant par défaut
`{ category, data: SlashCommandBuilder, execute(interaction) }`.
Le chargement est automatique ; pour une commande staff, utiliser
`.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)` (ou une permission
plus fine) — jamais `Administrator` par défaut.
