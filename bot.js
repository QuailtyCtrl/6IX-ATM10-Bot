// bot.js
// Entry point. Loads commands, logs into Discord, initializes the database,
// and starts the log-polling scheduler.

const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');

const config = require('./modules/config');
const db = require('./modules/database');
const serverMonitor = require('./modules/serverMonitor');
const chatBridge = require('./modules/chatBridge');
const scheduler = require('./modules/scheduler');
const permissions = require('./modules/permissions');
const commandLogger = require('./modules/commandLogger');

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
  if (!command?.data || !command?.execute) {
    console.warn(`[bot] Skipping ${file}: missing "data" or "execute" export.`);
    continue;
  }
  client.commands.set(command.data.name, command);
  commandData.push(command.data.toJSON());
}

// --- Register slash commands (guild-scoped for instant updates) ---
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);
  try {
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commandData }
    );
    console.log(`[bot] Registered ${commandData.length} slash commands.`);
  } catch (err) {
    console.error('[bot] Failed to register slash commands:', err);
  }
}

// --- Interaction handling ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  const ADMIN_COMMANDS = ['console', 'ban', 'kick', 'restart', 'stop'];
  if (ADMIN_COMMANDS.includes(command.data.name)) {
    const allowed = await permissions.requireAdmin(interaction);
    if (!allowed) return;
  }

  try {
    await command.execute(interaction, client);

    if (ADMIN_COMMANDS.includes(command.data.name)) {
      const summary =
        interaction.options?.data?.length > 0
          ? `/${command.data.name} ${interaction.options.data.map((o) => o.value).join(' ')}`
          : `/${command.data.name}`;
      await commandLogger.logCommand(client, interaction.user.tag, summary);
    }
  } catch (err) {
    console.error(`[bot] Error executing /${command.data.name}:`, err);
    const payload = { content: '\u26A0 Something went wrong executing that command.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// --- Boot sequence ---
client.once('clientReady', async () => {
  console.log(`[bot] Logged in as ${client.user.tag}`);

  await db.init();
  await registerCommands();

  serverMonitor.init(client);
  chatBridge.registerDiscordListener(client);

  scheduler.start('log-poll', config.polling.logIntervalMs, () => {
    serverMonitor.pollOnce();
  });
});

process.on('SIGINT', () => {
  console.log('[bot] Shutting down...');
  scheduler.stopAll();
  process.exit(0);
});

client.login(config.discord.token);
