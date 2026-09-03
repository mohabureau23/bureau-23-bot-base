import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { listTextChannels, sendConfiguredEmbed } from "../services/embedService.js";
import {
  createTestimonialLink,
  publishTestimonial,
  readTestimonialToken,
} from "../services/testimonialService.js";

/**
 * Petite API HTTP (node:http, aucune dépendance) :
 *  - /t/<token>            formulaire de témoignage à usage unique
 *  - /api/orders/complete  appelée par Bureau 23 Hub (header x-hub-secret)
 *  - /api/admin/*          mini-site admin (header x-admin-secret)
 * Le DISCORD_TOKEN n'est jamais exposé.
 */

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, x-admin-secret, x-hub-secret",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...CORS });
  res.end(JSON.stringify(body));
}

function html(res, status, body) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(body);
}

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
    if (chunks.reduce((n, c) => n + c.length, 0) > 100_000) throw new Error("Corps de requête trop volumineux");
  }
  return Buffer.concat(chunks).toString("utf8");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function page(title, body) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — BUREAU 23</title>
<style>
:root{color-scheme:dark}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b1220;color:#e2e8f0;font:16px/1.5 system-ui,sans-serif;padding:24px}
.card{width:100%;max-width:520px;background:#111a2e;border:1px solid #1e2b47;border-radius:16px;padding:24px}
h1{font-size:20px;margin:0 0 16px}label{display:block;margin:16px 0 6px;font-size:14px;color:#94a3b8}
input,textarea,select{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid #1e2b47;background:#0b1220;color:#e2e8f0}
textarea{min-height:120px;resize:vertical}
button{margin-top:20px;width:100%;padding:12px;border:0;border-radius:8px;background:#2b6cb0;color:#fff;font-weight:600;cursor:pointer}
p.small{color:#94a3b8;font-size:13px}
</style></head><body><div class="card">${body}</div></body></html>`;
}

function testimonialForm(token, payload, error) {
  return page(
    "Témoignage",
    `<h1>Votre témoignage</h1>
${payload.ref ? `<p class="small">Commande <code>${escapeHtml(payload.ref)}</code></p>` : ""}
${error ? `<p style="color:#f87171">${escapeHtml(error)}</p>` : ""}
<form method="post" action="/t/${encodeURIComponent(token)}">
<label for="name">Votre nom / pseudo</label>
<input id="name" name="name" maxlength="60" value="${escapeHtml(payload.name ?? "")}" required>
<label for="rating">Note</label>
<select id="rating" name="rating">
<option value="5">★★★★★ (5/5)</option><option value="4">★★★★☆ (4/5)</option>
<option value="3">★★★☆☆ (3/5)</option><option value="2">★★☆☆☆ (2/5)</option>
<option value="1">★☆☆☆☆ (1/5)</option></select>
<label for="message">Votre témoignage</label>
<textarea id="message" name="message" maxlength="1500" required></textarea>
<button type="submit">Envoyer</button>
<p class="small">Lien personnel, à usage unique.</p>
</form>`,
  );
}

export function startHttpServer(client) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const { pathname } = url;

      if (req.method === "OPTIONS") {
        res.writeHead(204, CORS);
        res.end();
        return;
      }

      if (pathname === "/health") return json(res, 200, { ok: true, ready: client.isReady() });

      // ---- Témoignage (public, protégé par jeton signé) ----
      if (pathname.startsWith("/t/")) {
        const token = decodeURIComponent(pathname.slice(3));
        const result = readTestimonialToken(token);
        if (!result.ok) {
          return html(res, 410, page("Lien invalide", `<h1>Lien indisponible</h1><p>Ce lien est ${escapeHtml(result.reason)}.</p>`));
        }
        if (req.method === "GET") return html(res, 200, testimonialForm(token, result.payload));

        if (req.method === "POST") {
          const params = new URLSearchParams(await readBody(req));
          const message = (params.get("message") ?? "").trim();
          const rating = Number(params.get("rating"));
          if (message.length < 5) {
            return html(res, 400, testimonialForm(token, result.payload, "Témoignage trop court."));
          }
          await publishTestimonial(client, {
            payload: result.payload,
            rating: rating >= 1 && rating <= 5 ? rating : null,
            message: message.slice(0, 1500),
            displayName: (params.get("name") ?? "").slice(0, 60),
          });
          return html(res, 200, page("Merci", "<h1>Merci !</h1><p>Votre témoignage a bien été publié. 💙</p>"));
        }
      }

      // ---- Hub : commande terminée ----
      if (pathname === "/api/orders/complete" && req.method === "POST") {
        if (!env.hubApiSecret || !safeEqual(req.headers["x-hub-secret"], env.hubApiSecret)) {
          return json(res, 401, { error: "unauthorized" });
        }
        const body = JSON.parse((await readBody(req)) || "{}");
        if (!body.orderId) return json(res, 400, { error: "orderId requis" });

        const link = createTestimonialLink({
          reference: String(body.orderId),
          clientName: body.clientName ? String(body.clientName) : null,
          discordUserId: body.discordUserId ? String(body.discordUserId) : null,
          source: "hub",
        });

        if (body.discordUserId) {
          const user = await client.users.fetch(String(body.discordUserId)).catch(() => null);
          await user
            ?.send(
              `Votre commande \`${body.orderId}\` est terminée ✅\nMerci de votre confiance — vous pouvez laisser un témoignage ici : ${link.url}`,
            )
            .catch(() => logger.warn("DM témoignage impossible (MP fermés)"));
        }

        logger.info(`Commande terminée reçue du Hub : ${body.orderId}`);
        return json(res, 200, { ok: true, testimonialUrl: link.url, expiresAt: link.expiresAt });
      }

      // ---- Admin (mini-site) ----
      if (pathname.startsWith("/api/admin/")) {
        if (!env.adminApiSecret || !safeEqual(req.headers["x-admin-secret"], env.adminApiSecret)) {
          return json(res, 401, { error: "unauthorized" });
        }

        if (pathname === "/api/admin/channels" && req.method === "GET") {
          return json(res, 200, { channels: await listTextChannels(client) });
        }

        if (pathname === "/api/admin/embed" && req.method === "POST") {
          const body = JSON.parse((await readBody(req)) || "{}");
          if (!body.channelId) return json(res, 400, { error: "channelId requis" });
          const sent = await sendConfiguredEmbed(client, body);
          return json(res, 200, { ok: true, ...sent });
        }

        if (pathname === "/api/admin/status" && req.method === "GET") {
          return json(res, 200, {
            ready: client.isReady(),
            tag: client.user?.tag ?? null,
            uptimeSeconds: Math.floor((client.uptime ?? 0) / 1000),
            commands: client.commands.size,
          });
        }
      }

      json(res, 404, { error: "not found" });
    } catch (error) {
      logger.error("Erreur API HTTP", error);
      json(res, 500, { error: "internal error" });
    }
  });

  server.listen(env.port, () => logger.info(`API HTTP à l'écoute sur le port ${env.port}`));
  return server;
}
