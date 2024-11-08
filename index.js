const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers] });





//
// DISCORD BOT TOKEN MANAGEMENT
//
require('dotenv').config();
client.login(process.env.BOT_TOKEN);


// variables
const goodbyechannelId =(process.env.BOT_STATUS_CHANNEL);



async function sayHello() {
    const channel = client.channels.cache.get(goodbyechannelId);
    if (channel) {
        try {
            await channel.send(`${client.user.tag} is online!`);
        } catch (error) {
            console.error('Failed to send goodbye message:', error);
        }
    }
}
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await sayHello();
});

// 
//  CLOSING BOT FUNCTIONS:
//


async function sayGoodbye() {
    const channel = client.channels.cache.get(goodbyechannelId);
    if (channel) {
        try {
            await channel.send(`${client.user.tag} Turning off.`);
        } catch (error) {
            console.error('Failed to send goodbye message:', error);
        }
    }
}



async function goodByeLog(){
    console.log(`Turning off ${client.user.tag}!`);
}

// Capture bot shutdown
const handleShutdown = async () => {
    goodByeLog();
    await sayGoodbye();
    process.exit();
};

// Capture bot shutdown
process.on('SIGINT', handleShutdown);
process.on('exit', handleShutdown);

// Capture `client.destroy()`
client.on('destroy', handleShutdown);



