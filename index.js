// === Discord + Express Bot Starter ===

const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const express = require('express');
require('dotenv').config();

// === Create Discord Client ===
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// === Load Slash Commands ===
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// === On Bot Ready ===
client.once(Events.ClientReady, () => {
  console.log(`🟢 Logged in as ${client.user.tag}`);
});

// === Slash Command Handler ===
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, {
      allowedChannelId: process.env.ALLOWED_COMMAND_CHANNEL_ID,
      defconChannelId: process.env.DEFCON_STATUS_CHANNEL_ID,
      freshyId: process.env.FRESHY_USER_ID
    });
  } catch (error) {
    console.error(`❌ Error executing ${interaction.commandName}:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '⚠️ Something went wrong.', ephemeral: true });
    } else {
      await interaction.reply({ content: '⚠️ There was an error executing this command.', ephemeral: true });
    }
  }
});

// === Optional Logging When Joining/Leaving Servers ===
client.on('guildCreate', guild => {
  console.log(`✅ Joined guild: ${guild.name} (${guild.id})`);
});

client.on('guildDelete', guild => {
  console.log(`❌ Removed from guild: ${guild.name} (${guild.id})`);
});

// === Log in to Discord ===
client.login(process.env.DISCORD_TOKEN);

// === Keep-Alive Web Server for Render + UptimeRobot ===
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('🛰️ FreshyDefcon is alive.');
});

app.listen(PORT, () => {
  console.log(`🌐 Web service running on port ${PORT}`);
});

