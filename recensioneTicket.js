const { Events, PermissionsBitField, MessageFlags, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// Accedi alla variabile d'ambiente per l'ID del canale di log
const logRecensioneChannelId = process.env.LOG_RECENSIONE_CHANNEL_ID;

// Esporta una funzione che riceve il client
module.exports = (client) => {
    // Gestione del comando '!inviar' per recensioni
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === '!inviar') {
            // Controlla se l'utente ha i permessi di amministratore
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Non hai il permesso di usare questo comando.");
            }

            const channel = message.channel;
            const messages = await channel.messages.fetch({ limit: 10 });
            const existingMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

            if (existingMessage) {
                try {
                    await message.author.send("⚠️ Il messaggio per inviare una recensione è già presente in questo canale.");
                } catch (error) {
                    message.reply("⚠️ Il messaggio per inviare una recensione è già presente in questo canale. (DM disabilitati)");
                }
                return;
            }

            const recensioneEmbed = new EmbedBuilder()
                .setTitle("📝 Sistema Recensioni")
                .setDescription("Clicca sul pulsante qui sotto per lasciare la tua recensione.")
                .setColor(0x3498db);

            const openRecensioneButton = new ButtonBuilder()
                .setCustomId('open_recensione')
                .setLabel('Lascia una recensione')
                .setStyle('Primary');

            const actionRow = new ActionRowBuilder().addComponents(openRecensioneButton);

            await channel.send({ embeds: [recensioneEmbed], components: [actionRow] });
        }
    });

    // Gestione pulsante per aprire il modulo recensione
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        // Se l'interazione è il pulsante per aprire la recensione
        if (interaction.customId === 'open_recensione') {
            const user = interaction.user;

            // Crea il modulo per la recensione
            const modal = new ModalBuilder()
                .setCustomId('recensione_form')
                .setTitle('Modulo Recensione');

            const nomeInput = new TextInputBuilder()
                .setCustomId('nome')
                .setLabel('Nome')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const recensioneInput = new TextInputBuilder()
                .setCustomId('recensione')
                .setLabel('Descrivi la tua esperienza')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            // Cambiamo la valutazione da un select menu a un input di tipo numerico (0-5)
            const valutazioneInput = new TextInputBuilder()
                .setCustomId('valutazione')
                .setLabel('Valutazione (da 0 a 5)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(1)
                .setPlaceholder('Inserisci un numero da 0 a 5');

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(recensioneInput),
                new ActionRowBuilder().addComponents(valutazioneInput)
            );

            // Mostra il modulo all'utente
            await interaction.showModal(modal);
        }
    });

    // Gestione risposta modulo recensione
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'recensione_form') {
            const nome = interaction.fields.getTextInputValue('nome');
            const recensione = interaction.fields.getTextInputValue('recensione');
            const valutazione = interaction.fields.getTextInputValue('valutazione'); // Prendi la valutazione come numero

            // Assicurati che la valutazione sia compresa tra 0 e 5
            if (isNaN(valutazione) || valutazione < 0 || valutazione > 5) {
                return interaction.reply({ content: "❌ La valutazione deve essere un numero tra 0 e 5.", flags: MessageFlags.Ephemeral });
            }

            const logChannel = interaction.guild.channels.cache.get(logRecensioneChannelId);

            // Crea l'embed con la valutazione e la recensione
            const recensioneEmbed = new EmbedBuilder()
                .setTitle("📝 Nuova Recensione")
                .setColor(0x3498db)
                .addFields(
                    { name: "👤 Nome", value: nome, inline: true },
                    { name: "📝 Recensione", value: recensione, inline: false },
                    { name: "⭐ Valutazione", value: `${'⭐'.repeat(Number(valutazione))}`, inline: true }
                );

            // Invia la recensione nel canale di log
            if (logChannel) {
                await logChannel.send({ embeds: [recensioneEmbed] });
            }

            // Invia il messaggio di conferma in privato all'utente
            try {
                await interaction.user.send("✅ La tua recensione è stata inviata con successo!");
            } catch (error) {
                console.error("Errore nell'invio del messaggio privato:", error);
            }

            // Risposta nella chat di interazione (ephemeral)
            await interaction.reply({ content: "✅ La tua recensione è stata inviata con successo!", flags: MessageFlags.Ephemeral });
        }
    });
};
