import { EmbedBuilder } from "discord.js";

export const COLORS = {
  brand: 0x2b6cb0,
  success: 0x22c55e,
  warning: 0xf59e0b,
  danger: 0xef4444,
  neutral: 0x64748b,
};

export function baseEmbed({ title, description, color = COLORS.brand, fields = [] }) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTimestamp(new Date())
    .setFooter({ text: "BUREAU 23" });
  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (fields.length > 0) embed.addFields(fields);
  return embed;
}
