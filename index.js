import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import ordinaTicket from './ordinaTicket.js';
import recensioneTicket from './recensioneTicket.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent
    ]
});

ordinaTicket(client);
recensioneTicket(client);

const token = process.env.TOKEN;

client.once('ready', () => {
    console.log(`✅ Bot attivo come ${client.user.tag}`);
});

client.login(token);
