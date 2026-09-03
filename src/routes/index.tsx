import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BUREAU 23 Discord Bot — V1" },
      {
        name: "description",
        content:
          "Bot Discord.js v14 de BUREAU 23 : /ping, /help, bienvenue, rôle automatique, logs et commandes staff, déployable sur Render.",
      },
      { property: "og:title", content: "BUREAU 23 Discord Bot — V1" },
      {
        property: "og:description",
        content:
          "Architecture maintenable commands/events/services/utils, sans secrets dans le dépôt, prête pour Render 24/7.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { name: "/ping", desc: "Latence aller-retour et WebSocket." },
  { name: "/help", desc: "Commandes visibles selon les permissions." },
  { name: "Bienvenue", desc: "Embed automatique dans le salon dédié." },
  { name: "🌐 MEMBRE", desc: "Rôle attribué à l'arrivée, erreurs loggées." },
  { name: "Logs", desc: "Console masquant le token + salon Discord." },
  { name: "Staff", desc: "/status protégé par Manage Server." },
];

function Index() {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Bureau 23
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Discord Bot — V1
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Le code du bot vit dans le dossier <code className="rounded bg-muted px-1.5 py-0.5">bot/</code>{" "}
          : discord.js v14, structure commands / events / services / utils, aucune valeur secrète
          dans le dépôt. Voir <code className="rounded bg-muted px-1.5 py-0.5">bot/README.md</code>{" "}
          pour le déploiement Render.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <li key={feature.name} className="rounded-xl border border-border bg-card p-4">
              <p className="font-semibold text-card-foreground">{feature.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{feature.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
