// commands/link.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../modules/database');
const serverMonitor = require('../modules/serverMonitor');

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account to your Minecraft player.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const existing = await db.getPlayerByDiscordId(interaction.user.id);
    if (existing) {
      await interaction.editReply(
        `✅ Your Discord is already linked to **${existing.username}**.\nRun \`/unlink\` first if you want to switch accounts.`
      );
      return;
    }

    const code = generateCode();
    await db.saveLinkCode(code, interaction.user.id);

    // Hold onto this interaction — serverMonitor will resolve it once the
    // player types !link <code> in-game, keeping the reply ephemeral.
    serverMonitor.registerLinkInteraction(interaction.user.id, interaction);

    await interaction.editReply(
      `🔗 **Link your Minecraft account**\n\nJoin the server and type this command in-game:\n\`\`\`/link ${code}\`\`\`\nThis code expires in **10 minutes**.`
    );
  },
};
