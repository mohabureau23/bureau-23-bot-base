#!/bin/sh
# Démarrage du bot Discord depuis la racine du dépôt (ACL Clouds / Pterodactyl).
# Startup command à mettre dans le panel :  sh /home/container/start-bot.sh
cd "$(dirname "$0")/bot" || exit 1
[ -d node_modules ] || npm install --omit=dev
exec node index.js
