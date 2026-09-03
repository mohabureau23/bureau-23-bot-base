import { MessageFlags, SlashCommandBuilder } from "discord.js";
import { baseEmbed } from "../../utils/embeds.js";

export default {
  category: "general",
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Affiche la liste des commandes disponibles."),

  async execute(interaction) {
    const commands = [...interaction.client.commands.values()];

    const visible = commands.filter((command) => {
      if (command.category !== "staff") return true;
      const required = command.data.default_member_permissions;
      return required ? interaction.memberPermissions?.has(BigInt(required)) : true;
    });

    const format = (category) =>
      visible
        .filter((command) => command.category === category)
        .map((command) => `\`/${command.data.name}\` — ${command.data.description}`)
        .join("\n") || "_Aucune_";

    await interaction.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [
        baseEmbed({
          title: "Commandes BUREAU 23",
          description: "Voici les commandes auxquelles tu as accès.",
          fields: [
            { name: "Général", value: format("general") },
            { name: "Staff", value: format("staff") },
          ],
        }),
      ],
    });
  },
};
