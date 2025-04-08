import {
    Events,
    PermissionsBitField,
    MessageFlags,
    EmbedBuilder,
    ButtonBuilder,
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} from 'discord.js';

const logRecensioneChannelId = process.env.LOG_RECENSIONE_CHANNEL_ID;

export default (client) => {
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === '!inviar') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Non hai il permesso di usare questo comando.");
            }

            const channel = message.channel;
            const messages = await channel.messages.fetch({ limit: 10 });
            const existingMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

            if (existingMessage) {
                try {
                    await message.author.send("⚠️ Il messaggio per inviare una recensione è già presente.");
                } catch {
                    message.reply("⚠️ Il messaggio è già presente. (DM disabilitati)");
                }
                return;
            }

            const recensioneEmbed = new EmbedBuilder()
                .setTitle("📝 Sistema Recensioni")
                .setDescription("Clicca sul pulsante qui sotto per lasciare la tua recensione.")
                .setColor(0x3498db);

            const openRecensioneButton = new ButtonBuilder().setCustomId('open_recensione').setLabel('Lascia una recensione').setStyle('Primary');
            const actionRow = new ActionRowBuilder().addComponents(openRecensioneButton);

            await channel.send({ embeds: [recensioneEmbed], components: [actionRow] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'open_recensione') {
            const modal = new ModalBuilder().setCustomId('recensione_form').setTitle('Modulo Recensione');

            const nomeInput = new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short).setRequired(true);
            const recensioneInput = new TextInputBuilder().setCustomId('recensione').setLabel('Descrivi la tua esperienza').setStyle(TextInputStyle.Paragraph).setRequired(true);
            const valutazioneInput = new TextInputBuilder()
                .setCustomId('valutazione')
                .setLabel('Valutazione (da 0 a 5)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(1)
                .setPlaceholder('Numero da 0 a 5');

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(recensioneInput),
                new ActionRowBuilder().addComponents(valutazioneInput)
            );

            await interaction.showModal(modal);
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'recensione_form') {
            const nome = interaction.fields.getTextInputValue('nome');
            const recensione = interaction.fields.getTextInputValue('recensione');
            const valutazione = interaction.fields.getTextInputValue('valutazione');

            if (isNaN(valutazione) || valutazione < 0 || valutazione > 5) {
                return interaction.reply({ content: "❌ La valutazione deve essere un numero tra 0 e 5.", flags: MessageFlags.Ephemeral });
            }

            const logChannel = interaction.guild.channels.cache.get(logRecensioneChannelId);

            const recensioneEmbed = new EmbedBuilder()
                .setTitle("📝 Nuova Recensione")
                .setColor(0x3498db)
                .addFields(
                    { name: "👤 Nome", value: nome, inline: true },
                    { name: "📝 Recensione", value: recensione },
                    { name: "⭐ Valutazione", value: `${'⭐'.repeat(Number(valutazione))}`, inline: true }
                );

            if (logChannel) await logChannel.send({ embeds: [recensioneEmbed] });

            try {
                await interaction.user.send("✅ La tua recensione è stata inviata con successo!");
            } catch (error) {
                console.error("Errore nell'invio DM:", error);
            }

            await interaction.reply({ content: "✅ Recensione inviata con successo!", flags: MessageFlags.Ephemeral });
        }
    });
};
