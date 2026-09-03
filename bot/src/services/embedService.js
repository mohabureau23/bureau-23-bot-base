import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { env } from "../config/env.js";
import { baseEmbed, COLORS } from "../utils/embeds.js";
import { logInfo } from "./logService.js";

/** Salons texte réellement accessibles au bot (jamais de liste codée en dur). */
export async function listTextChannels(client) {
  if (!env.guildId) return [];
  const guild = await client.guilds.fetch(env.guildId).catch(() => null);
  if (!guild) return [];
  const channels = await guild.channels.fetch().catch(() => null);
  if (!channels) return [];

  return [...channels.values()]
    .filter(
      (channel) =>
        channel &&
        (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
        channel.viewable,
    )
    .map((channel) => ({ id: channel.id, name: channel.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function parseColor(hex) {
  const value = Number.parseInt(String(hex ?? "").replace("#", ""), 16);
  return Number.isFinite(value) ? value : COLORS.brand;
}

/**
 * Envoie un embed configuré depuis le mini-site admin.
 * buttons: [{ type: "url", label, url } | { type: "ticket", label }]
 */
export async function sendConfiguredEmbed(client, { channelId, title, description, color, footer, image, buttons = [] }) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) throw new Error("Salon introuvable ou inaccessible.");

  const embed = baseEmbed({ title, description, color: parseColor(color) });
  if (footer) embed.setFooter({ text: String(footer).slice(0, 2048) });
  if (image) embed.setImage(image);

  const components = [];
  const row = new ActionRowBuilder();
  for (const button of buttons.slice(0, 5)) {
    if (!button?.label) continue;
    if (button.type === "url" && button.url) {
      row.addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(button.label.slice(0, 80)).setURL(button.url),
      );
    } else if (button.type === "ticket") {
      row.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel(button.label.slice(0, 80))
          .setCustomId("ticket:open"),
      );
    }
  }
  if (row.components.length > 0) components.push(row);

  const message = await channel.send({ embeds: [embed], components });
  await logInfo(client, "Embed envoyé", `Salon #${channel.name}`);
  return { messageId: message.id, channelName: channel.name };
}
