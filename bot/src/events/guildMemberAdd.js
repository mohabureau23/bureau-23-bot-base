import { Events } from "discord.js";
import { env } from "../config/env.js";
import { assignMemberRole, sendWelcomeMessage } from "../services/memberService.js";
import { logInfo } from "../services/logService.js";
import { logger } from "../utils/logger.js";

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (member.guild.id !== env.guildId) return;
    if (member.user.bot) return;

    try {
      await logInfo(member.client, "Nouvel arrivant", `${member.user.tag} (${member.id}) a rejoint le serveur.`);
      await sendWelcomeMessage(member);
      await assignMemberRole(member);
    } catch (error) {
      logger.error("Traitement guildMemberAdd échoué", error);
    }
  },
};
