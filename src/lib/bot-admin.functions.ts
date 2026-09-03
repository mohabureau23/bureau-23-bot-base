import { createServerFn } from "@tanstack/react-start";

/**
 * Proxy serveur vers l'API du bot : le secret admin et l'URL du bot restent
 * côté serveur, jamais dans le navigateur (et jamais DISCORD_TOKEN).
 */
async function botFetch(path: string, init?: RequestInit) {
  const base = process.env["BOT_API_URL"]?.replace(/\/+$/, "");
  const secret = process.env["ADMIN_API_SECRET"];
  if (!base || !secret) throw new Error("BOT_API_URL / ADMIN_API_SECRET non configurés.");

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-admin-secret": secret, ...(init?.headers ?? {}) },
  });
  if (!response.ok) throw new Error(`Bot API ${response.status}`);
  return response.json();
}

/** Retourne un message d'erreur lisible plutôt que de casser le rendu. */
function checkPassword(password: string): string | null {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected)
    return "ADMIN_PASSWORD n'est pas configuré côté serveur. Ajoute-le dans les variables d'environnement du projet.";
  if (password !== expected) return "Mot de passe administrateur invalide.";
  return null;
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const error = checkPassword(data.password);
    return error ? { ok: false as const, error } : { ok: true as const };
  });

export const listChannels = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    const error = checkPassword(data.password);
    if (error) return { channels: [] as { id: string; name: string }[], error };
    try {
      return (await botFetch("/api/admin/channels")) as { channels: { id: string; name: string }[] };
    } catch (err) {
      return {
        channels: [] as { id: string; name: string }[],
        error: err instanceof Error ? err.message : "Bot injoignable",
      };
    }
  });


export const botStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    if (checkPassword(data.password)) return null;
    try {
      return (await botFetch("/api/admin/status")) as {
        ready: boolean;
        tag: string | null;
        uptimeSeconds: number;
        commands: number;
      };
    } catch {
      return null;
    }
  });

export type EmbedButton = { type: "url" | "ticket"; label: string; url?: string };

export const sendEmbed = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      password: string;
      channelId: string;
      title: string;
      description: string;
      color: string;
      footer: string;
      image: string;
      buttons: EmbedButton[];
    }) => data,
  )
  .handler(async ({ data }) => {
    const error = checkPassword(data.password);
    if (error) return { ok: false as const, channelName: "", error };
    const { password: _password, ...payload } = data;
    try {
      return (await botFetch("/api/admin/embed", {
        method: "POST",
        body: JSON.stringify(payload),
      })) as { ok: boolean; channelName: string; error?: string };
    } catch (err) {
      return {
        ok: false as const,
        channelName: "",
        error: err instanceof Error ? err.message : "Bot injoignable",
      };
    }
  });

