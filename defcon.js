const { SlashCommandBuilder } = require('discord.js');

// === Custom DEFCON Emojis and Blurbs ===
const defconBlurbs = {
  5: { emoji: '🧊', blurb: '“Situation: chilling”' },
  4: { emoji: '🌫️', blurb: '“Just bullshitting”' },
  3: { emoji: '🔺', blurb: '“fuck around and find out”' },
  2: { emoji: '🚨', blurb: '“The pistol is cocked”' },
  1: { emoji: '☢️', blurb: '“All bets off. Nuclear War.”' },
};

let currentDefcon = 5;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('defcon')
    .setDescription('Set or get the current DEFCON level.')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('Set the DEFCON level (1–5).')
        .addIntegerOption(opt =>
          opt.setName('level')
            .setDescription('DEFCON level to set')
            .setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('get')
        .setDescription('Check the current DEFCON level.')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const level = interaction.options.getInteger('level');

    const allowedChannelId = process.env.ALLOWED_COMMAND_CHANNEL_ID;
    const defconStatusChannelId = process.env.DEFCON_STATUS_CHANNEL_ID;
    const modRoleId = process.env.MOD_ROLE_ID;
    const adminRoleId = process.env.ADMIN_ROLE_ID;
    const freshyId = process.env.FRESHY_USER_ID;
    const chartId = process.env.CHART_USER_ID;

    if (interaction.channel.id !== allowedChannelId) {
      return interaction.reply({
        content: '❌ This command can only be used in the DEFCON control channel.',
        ephemeral: true
      });
    }

    if (sub === 'get') {
      const { emoji, blurb } = defconBlurbs[currentDefcon];
      return interaction.reply({
        content: `Current DEFCON: **${currentDefcon} ${emoji}**\n${blurb}`
      });
    }

    if (sub === 'set') {
      if (level < 1 || level > 5) {
        return interaction.reply({
          content: '❌ DEFCON level must be between 1 and 5.'
        });
      }

      const isPrivileged =
        interaction.user.id === freshyId ||
        interaction.user.id === chartId ||
        interaction.member.roles.cache.has(modRoleId) ||
        interaction.member.roles.cache.has(adminRoleId);

      if (!isPrivileged) {
        return interaction.reply({
          content: '🚫 You do not have permission to set the DEFCON level.'
        });
      }

      // === Send public log message early
      try {
        await interaction.reply({
          content: `🔄 **${interaction.user.username}** is setting DEFCON to **${level}**...`
        });
      } catch (err) {
        console.error('⚠️ Failed to send interaction reply:', err);
      }

      currentDefcon = level;
      const { emoji, blurb } = defconBlurbs[level];

      let defconChannel;

      try {
        defconChannel = await interaction.guild.channels.fetch(defconStatusChannelId);
      } catch (err) {
        console.error('❌ Could not fetch DEFCON channel:', err);
        return await interaction.followUp({
          content: '❌ Could not find the DEFCON channel.'
        });
      }

      if (!defconChannel || !defconChannel.manageable) {
        return await interaction.followUp({
          content: '❌ I can’t manage the DEFCON channel.'
        });
      }

      // === Attempt rename
      const newChannelName = `defcon-${level}`;
      try {
        console.log(`🔄 Trying to rename channel to ${newChannelName}`);
        await defconChannel.setName(newChannelName);
        console.log(`✅ Renamed channel to ${newChannelName}`);
      } catch (renameErr) {
        console.warn(`⚠️ Rename to ${newChannelName} failed. Using fallback.`, renameErr);
        try {
          await defconChannel.setName('defcon-error');
          console.log('✅ Fallback rename to defcon-error successful.');
        } catch (fallbackErr) {
          console.error('❌ Fallback rename also failed:', fallbackErr);
          await interaction.followUp({
            content: '❌ Could not rename the DEFCON channel — even fallback failed.'
          });
        }
      }

      // === Post the DEFCON alert
      try {
        if (defconChannel.isTextBased()) {
          await defconChannel.send({
            content: `**DEFCON ${level} ${emoji}**\n${blurb}`,
            allowedMentions: { parse: [] }
          });
        }
      } catch (sendErr) {
        console.error('⚠️ Failed to send message in DEFCON channel:', sendErr);
        await interaction.followUp({
          content: '❌ Could not send DEFCON alert in the target channel.'
        });
      }

      // === Final follow-up
      try {
        await interaction.followUp({
          content: '✅ DEFCON level set successfully.'
        });
      } catch (finalErr) {
        console.warn('⚠️ Could not send final confirmation message:', finalErr);
      }
    }
  }
};
