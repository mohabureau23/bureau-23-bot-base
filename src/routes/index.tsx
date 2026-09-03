import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminLogin,
  botStatus,
  listChannels,
  sendEmbed,
  type EmbedButton,
} from "@/lib/bot-admin.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BUREAU 23 — Panneau bot Discord" },
      {
        name: "description",
        content:
          "Panneau d'administration BUREAU 23 : composer et envoyer un embed Discord (couleur, image, boutons URL ou ticket) et suivre l'état du bot.",
      },
      { property: "og:title", content: "BUREAU 23 — Panneau bot Discord" },
      {
        property: "og:description",
        content: "Créer un embed Discord, prévisualiser, envoyer. Témoignages clients et tickets gérés par le bot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Channel = { id: string; name: string };

function Index() {
  const login = useServerFn(adminLogin);
  const fetchChannels = useServerFn(listChannels);
  const fetchStatus = useServerFn(botStatus);
  const send = useServerFn(sendEmbed);

  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [status, setStatus] = useState<{ ready: boolean; tag: string | null; commands: number } | null>(null);

  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#2b6cb0");
  const [footer, setFooter] = useState("BUREAU 23");
  const [image, setImage] = useState("");
  const [buttons, setButtons] = useState<EmbedButton[]>([]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await login({ data: { password } });
      setAuthed(true);
      const [{ channels: list }, botState] = await Promise.all([
        fetchChannels({ data: { password } }),
        fetchStatus({ data: { password } }).catch(() => null),
      ]);
      setChannels(list);
      if (list[0]) setChannelId(list[0].id);
      if (botState) setStatus(botState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible");
    }
  }

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      const result = await send({
        data: { password, channelId, title, description, color, footer, image, buttons },
      });
      setNotice(`Embed envoyé dans #${result.channelName}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible");
    }
  }

  const field = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm";

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl border border-border bg-card p-6">
          <h1 className="text-xl font-bold">BUREAU 23 — Panneau bot</h1>
          <p className="mt-1 text-sm text-muted-foreground">Accès réservé au staff.</p>
          <label className="mt-6 block text-sm text-muted-foreground" htmlFor="pw">
            Mot de passe administrateur
          </label>
          <input
            id="pw"
            type="password"
            className={`${field} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <button type="submit" className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Se connecter
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Bureau 23</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Panneau bot Discord</h1>
          </div>
          {status && (
            <p className="text-sm text-muted-foreground">
              {status.ready ? "🟢 En ligne" : "🔴 Hors ligne"} · {status.tag ?? "—"} · {status.commands} commandes
            </p>
          )}
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <form onSubmit={handleSend} className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Créer un embed</h2>

            <label className="mt-4 block text-sm text-muted-foreground">Salon cible</label>
            <select className={field} value={channelId} onChange={(e) => setChannelId(e.target.value)} required>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm text-muted-foreground">Titre</label>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={256} />

            <label className="mt-4 block text-sm text-muted-foreground">Description</label>
            <textarea
              className={`${field} min-h-28`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
            />

            <label className="mt-4 block text-sm text-muted-foreground">Couleur</label>
            <div className="flex gap-2">
              <input type="color" className="h-10 w-14 rounded-md border border-border bg-background" value={color} onChange={(e) => setColor(e.target.value)} />
              <input className={field} value={color} onChange={(e) => setColor(e.target.value)} />
            </div>

            <label className="mt-4 block text-sm text-muted-foreground">Image (URL)</label>
            <input className={field} value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." />

            <label className="mt-4 block text-sm text-muted-foreground">Footer</label>
            <input className={field} value={footer} onChange={(e) => setFooter(e.target.value)} maxLength={2048} />

            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Boutons</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 text-xs"
                  onClick={() => setButtons((b) => [...b, { type: "url", label: "", url: "" }])}
                >
                  + URL
                </button>
                <button
                  type="button"
                  className="rounded-md border border-border px-2 py-1 text-xs"
                  onClick={() => setButtons((b) => [...b, { type: "ticket", label: "Ouvrir un ticket" }])}
                >
                  + Ticket
                </button>
              </div>
            </div>

            {buttons.map((button, index) => (
              <div key={index} className="mt-3 rounded-md border border-border p-3">
                <p className="text-xs uppercase text-muted-foreground">{button.type === "url" ? "Lien" : "Ticket"}</p>
                <input
                  className={`${field} mt-2`}
                  placeholder="Libellé"
                  value={button.label}
                  onChange={(e) =>
                    setButtons((list) => list.map((b, i) => (i === index ? { ...b, label: e.target.value } : b)))
                  }
                />
                {button.type === "url" && (
                  <input
                    className={`${field} mt-2`}
                    placeholder="https://..."
                    value={button.url ?? ""}
                    onChange={(e) =>
                      setButtons((list) => list.map((b, i) => (i === index ? { ...b, url: e.target.value } : b)))
                    }
                  />
                )}
                <button
                  type="button"
                  className="mt-2 text-xs text-destructive"
                  onClick={() => setButtons((list) => list.filter((_, i) => i !== index))}
                >
                  Supprimer
                </button>
              </div>
            ))}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {notice && <p className="mt-4 text-sm text-muted-foreground">{notice}</p>}

            <button type="submit" className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Envoyer sur Discord
            </button>
          </form>

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold">Aperçu</h2>
            <div className="mt-4 rounded-md bg-muted p-4">
              <div className="rounded-md border-l-4 bg-background p-4" style={{ borderColor: color }}>
                {title && <p className="font-semibold">{title}</p>}
                {description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{description}</p>}
                {image && (
                  <img src={image} alt="Aperçu de l'embed" className="mt-3 max-h-56 rounded-md object-cover" loading="lazy" />
                )}
                {footer && <p className="mt-3 text-xs text-muted-foreground">{footer}</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {buttons.map((button, index) => (
                  <span key={index} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                    {button.label || (button.type === "url" ? "Lien" : "Ticket")}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Les témoignages sont publiés par le bot dans son salon dédié, uniquement via un lien à usage unique généré
              par <code className="rounded bg-muted px-1">/terminer-commande</code> ou par l'API Hub.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
