require('dotenv').config();  // Carica le variabili d'ambiente dal file .env

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent
    ]
});

// Importa e avvia la logica dei ticket, passando il client
require('./ordinaTicket.js')(client);
require('./recensioneTicket.js')(client);

// Variabili d'ambiente
const token = process.env.TOKEN;

client.once('ready', () => {
    console.log(`✅ Bot attivo come ${client.user.tag}`);
});

// Login al bot
client.login(token);
