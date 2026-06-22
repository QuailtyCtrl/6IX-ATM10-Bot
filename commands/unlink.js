// commands/unlink.js
const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../modules/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlink')
    .setDescription('Unlink your Discord account from your Minecraft player.'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const existing = await db.getPlayerByDiscordId(interaction.user.id);
    if (!existing) {
      await interaction.editReply(`❌ Your Discord account isn't linked to any Minecraft player.`);
      return;
    }

    await db.linkDiscordToPlayer(existing.uuid, null);
    await interaction.editReply(`✅ Your Discord account has been unlinked from **${existing.username}**.`);
  },
};
