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

function checkPassword(password: string) {
  const expected = process.env["ADMIN_PASSWORD"];
  if (!expected) throw new Error("ADMIN_PASSWORD non configuré.");
  if (password !== expected) throw new Error("Mot de passe administrateur invalide.");
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    checkPassword(data.password);
    return { ok: true };
  });

export const listChannels = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    checkPassword(data.password);
    return (await botFetch("/api/admin/channels")) as { channels: { id: string; name: string }[] };
  });

export const botStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => {
    checkPassword(data.password);
    return (await botFetch("/api/admin/status")) as {
      ready: boolean;
      tag: string | null;
      uptimeSeconds: number;
      commands: number;
    };
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
    checkPassword(data.password);
    const { password: _password, ...payload } = data;
    return (await botFetch("/api/admin/embed", {
      method: "POST",
      body: JSON.stringify(payload),
    })) as { ok: boolean; channelName: string };
  });
