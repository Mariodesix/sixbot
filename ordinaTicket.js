const { Events, PermissionsBitField, MessageFlags, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType } = require('discord.js');

// Accedi alla variabile d'ambiente per l'ID della categoria
const categoryId = process.env.CATEGORY_ID;
const logChannelId = process.env.LOG_CHANNEL_ID; // Canale di log per i ticket

// Esporta una funzione che riceve il client
module.exports = (client) => {
    // Gestione del comando '!invia'
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === '!invia') {
            // Controlla se l'utente ha i permessi di amministratore
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return message.reply("❌ Non hai il permesso di usare questo comando.");
            }

            const channel = message.channel;
            const messages = await channel.messages.fetch({ limit: 10 });
            const existingMessage = messages.find(m => m.author.id === client.user.id && m.embeds.length > 0);

            if (existingMessage) {
                try {
                    await message.author.send("⚠️ Il messaggio per aprire i ticket è già presente in questo canale.");
                } catch (error) {
                    message.reply("⚠️ Il messaggio per aprire i ticket è già presente in questo canale. (DM disabilitati)");
                }
                return;
            }

            const ticketEmbed = new EmbedBuilder()
                .setTitle("📦 Sistema Ordini")
                .setDescription("Clicca sul pulsante qui sotto per inviare la tua ordinazione.")
                .setColor(0x3498db);

            const openTicketButton = new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('Apri Ticket')
                .setStyle('Primary');

            const actionRow = new ActionRowBuilder().addComponents(openTicketButton);

            await channel.send({ embeds: [ticketEmbed], components: [actionRow] });
        }
    });

    // Gestione pulsanti di creazione ticket
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'open_ticket') {
            const user = interaction.user;
            const guild = interaction.guild;
            const existingChannel = guild.channels.cache.find(c => c.name === `ordine-${user.username}`);

            if (existingChannel) {
                try {
                    await user.send("⚠️ Hai già un ordine aperto! Aspetta che sia completato quello precedente per effettuarne un altro.");
                } catch (error) {
                    return interaction.reply({ content: "⚠️ Hai già un ordine aperto! Controlla i tuoi canali.", flags: MessageFlags.Ephemeral });
                }
                return;
            }

            const ticketChannel = await guild.channels.create({
                name: `ordine-${user.username}`,
                type: ChannelType.GuildText,
                parent: categoryId,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: guild.members.me, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.ManageChannels] }
                ]
            });

            await interaction.reply({ content: `📦 Il tuo ticket è stato aperto: ${ticketChannel}`, flags: MessageFlags.Ephemeral });

            const startButton = new ButtonBuilder()
                .setCustomId('start_ticket')
                .setLabel('Ordina')
                .setStyle('Primary');

            const closeButton = new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Chiudi Ordine')
                .setStyle('Danger');

            const cancelButton = new ButtonBuilder()
                .setCustomId('cancel_ticket')
                .setLabel('Annulla Ordine')
                .setStyle('Secondary');

            const actionRow = new ActionRowBuilder().addComponents(startButton, closeButton, cancelButton);

            await ticketChannel.send({
                content: `Ciao ${user}, premi "Ordina" per descrivere il tuo ordine. Quando hai finito, puoi chiudere il ticket con "Chiudi Ordine" (solo per admin) o annullarlo con "Annulla Ordine".`,
                components: [actionRow]
            });
        }
    });

    // Gestione del modulo ordine
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'start_ticket') {
            const modal = new ModalBuilder()
                .setCustomId('ticket_form')
                .setTitle('Modulo Ordine');

            const nomeInput = new TextInputBuilder()
                .setCustomId('nome')
                .setLabel('Nome')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const problemaInput = new TextInputBuilder()
                .setCustomId('problema')
                .setLabel('Descrizione del problema')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            const servizioInput = new TextInputBuilder()
                .setCustomId('servizio')
                .setLabel('Quale servizio ti serve?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nomeInput),
                new ActionRowBuilder().addComponents(problemaInput),
                new ActionRowBuilder().addComponents(servizioInput)
            );

            await interaction.showModal(modal);
        }
    });

    // Gestione risposta modulo ordine
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'ticket_form') {
            const nome = interaction.fields.getTextInputValue('nome');
            const problema = interaction.fields.getTextInputValue('problema');
            const servizio = interaction.fields.getTextInputValue('servizio');

            const ticketChannel = interaction.channel;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);

            const responseEmbed = new EmbedBuilder()
                .setTitle("📩 Nuovo Ticket Aperto")
                .setColor(0x3498db)
                .addFields(
                    { name: "👤 Nome", value: nome, inline: true },
                    { name: "❓ Problema", value: problema, inline: false },
                    { name: "💼 Servizio richiesto", value: servizio, inline: false }
                );

            await ticketChannel.send({ embeds: [responseEmbed] });

            if (logChannel) {
                await logChannel.send({ embeds: [responseEmbed] });
            }

            await interaction.reply({ content: "✅ Modulo inviato con successo!", flags: MessageFlags.Ephemeral });
        }
    });

    // Gestione chiusura o annullamento del ticket
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'close_ticket' && interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await interaction.channel.send("❌ Il ticket verrà chiuso in 5 secondi...");
            setTimeout(() => interaction.channel.delete(), 5000);
        }

        if (interaction.customId === 'cancel_ticket') {
            const ticketChannel = interaction.channel;
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            await ticketChannel.send("❌ Il ticket è stato annullato.");
            if (logChannel) await logChannel.send(`Ordine annullato nel ticket ${ticketChannel.name}.`);
            setTimeout(() => ticketChannel.delete(), 5000);
        }
    });
};
