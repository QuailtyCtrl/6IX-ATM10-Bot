const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes, MessageFlags } = require('discord.js');

const config = require('./modules/config');
const db = require('./modules/database');
const serverMonitor = require('./modules/serverMonitor');
const chatBridge = require('./modules/chatBridge');
const scheduler = require('./modules/scheduler');
const permissions = require('./modules/permissions');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// --- Load commands ---
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'));

const commandData = [];
for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  if (!command?.data || !command?.execute) continue;
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandData }
    );
    console.log('[bot] Successfully registered slash commands.');
  } catch (err) {
    console.error('[bot] Failed to register slash commands:', err);
  }
}

// --- Interaction Handling ---
client.on('interactionCreate', async (interaction) => {
  console.log(`[debug] Received interaction: ${interaction.type} | ID: ${interaction.customId || interaction.commandName}`);

  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const ADMIN_COMMANDS = ['console', 'ban', 'kick', 'restart', 'stop'];
    if (ADMIN_COMMANDS.includes(command.data.name)) {
      if (!(await permissions.requireAdmin(interaction))) return;
    }

    try {
      await command.execute(interaction, client);
    } catch (err) {
      console.error(`[bot] Command error in ${interaction.commandName}:`, err);
    }
  }

  // 2. Handle Buttons and Menus
  else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    const customId = interaction.customId;
    const parts = customId.split('_');

    // Expected format: 'page_PAGE_ACTION' or 'select_player_ACTION'
    let actionType;
    if (parts[0] === 'page') actionType = parts[2];
    else if (parts[0] === 'select') actionType = parts[2];

    const command = client.commands.get(actionType);
    if (!command) {
      console.log(`[error] No command found for action type: ${actionType}`);
      return;
    }

    try {
      if (interaction.isButton() && command.showPlayerPagination) {
        await command.showPlayerPagination(interaction, parseInt(parts[1]), actionType);
      } else if (interaction.isStringSelectMenu() && command.handleSelection) {
        await command.handleSelection(interaction, interaction.values[0]);
      }
    } catch (err) {
      console.error(`[bot] Component error in ${actionType}:`, err);
    }
  }
});

client.once('clientReady', async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);
  await db.init();
  await registerCommands();
  serverMonitor.init(client);
  chatBridge.registerDiscordListener(client);
  scheduler.start('log-poll', config.polling.logIntervalMs, async () => {
    await serverMonitor.pollOnce();
  });
});

client.login(config.discord.token);