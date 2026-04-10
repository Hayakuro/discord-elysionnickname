const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

// 🔑 VARIABLES (Railway)
console.log("TOKEN =", process.env.TOKEN);
console.log("CLIENT_ID =", process.env.CLIENT_ID);
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// ⚙️ CONFIG
const ALLOWED_ROLES = ['ID_ROLE_ICI'];
const COOLDOWN_TIME = 5 * 60 * 1000;

// stockage cooldown
const cooldowns = new Map();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📌 Commande
const commands = [
  new SlashCommandBuilder()
    .setName('pseudo')
    .setDescription('Changer ton pseudo')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

// 📌 Déploiement commande
(async () => {
  try {
    console.log('🔄 Déploiement des commandes...');
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Commandes déployées');
  } catch (err) {
    console.error(err);
  }
});

// 🚀 Ready
client.once(Events.ClientReady, () => {
  console.log(`🔥 Connecté en tant que ${client.user.tag}`);
});

// ⚠️ Anti crash
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// 🔥 INTERACTIONS
client.on(Events.InteractionCreate, async interaction => {

  // ===== /pseudo =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'pseudo') {

      const member = interaction.member;

      // 🔒 Vérif rôle
      const hasRole = member.roles.cache.some(role =>
        ALLOWED_ROLES.includes(role.id)
      );

      if (!hasRole) {
        return interaction.reply({
          content: "❌ Tu n'as pas le rôle requis.",
          ephemeral: true
        });
      }

      // ⏱ Cooldown
      const now = Date.now();
      const userCooldown = cooldowns.get(member.id);

      if (userCooldown && now < userCooldown) {
        const timeLeft = Math.round((userCooldown - now) / 1000);
        return interaction.reply({
          content: `⏳ Attends encore ${timeLeft}s.`,
          ephemeral: true
        });
      }

      // 📌 Modal
      const modal = new ModalBuilder()
        .setCustomId('modalPseudo')
        .setTitle('📼 ZAZOU - Nouveau pseudo');

      const input = new TextInputBuilder()
        .setCustomId('newPseudo')
        .setLabel('Ton nouveau pseudo')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(32);

      const row = new ActionRowBuilder().addComponents(input);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }
  }

  // ===== Modal =====
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'modalPseudo') {

      const member = interaction.member;
      const inputPseudo = interaction.fields.getTextInputValue('newPseudo');

      // 🔍 VALIDATION
      const regex = /^[a-zA-Z0-9 _-]{3,32}$/;

      if (!regex.test(inputPseudo)) {
        return interaction.reply({
          content: "❌ Pseudo invalide (3-32 caractères, lettres/chiffres).",
          ephemeral: true
        });
      }

      // 🚫 mots interdits
      const bannedWords = ['admin', 'mod', 'staff'];
      const lower = inputPseudo.toLowerCase();

      if (bannedWords.some(word => lower.includes(word))) {
        return interaction.reply({
          content: "❌ Mot interdit dans le pseudo.",
          ephemeral: true
        });
      }

      // 🎨 FORMAT ZAZOU
      const newPseudo = `📼 ZAZOU | ${inputPseudo}`;

      try {
        await member.setNickname(newPseudo);

        // ⏱ cooldown
        cooldowns.set(member.id, Date.now() + COOLDOWN_TIME);

        await interaction.reply({
          content: `✅ Nouveau pseudo : **${newPseudo}**`,
          ephemeral: true
        });

      } catch (err) {
        console.error(err);
        await interaction.reply({
          content: "❌ Erreur (permissions du bot ?).",
          ephemeral: true
        });
      }
    }
  }

});

client.login(TOKEN);
