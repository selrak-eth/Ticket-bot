const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } = require('discord.js');
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
] });





//
// DISCORD BOT TOKEN MANAGEMENT
//
require('dotenv').config();
client.login(process.env.BOT_TOKEN);


/*
    VARIABLES
*/
//Channels
const botLogsChannel =(process.env.BOT_STATUS_CHANNEL);
const startTicketChannel = (process.env.START_TICKET_CHANNEL);

// Categories of channels
const openTicketsCategory = (process.env.OPEN_TICKETS_CATEGORY);
const archivesCategory = (process.env.ARCHIVES_CATEGORY);



// tickets var
const cooldownWriteTicket = 2; // in minutes
const checkInterval = 10 * 1000;
let cooldownTicketSuggestions = [];
let cooldownTicketBugs = [];
let cooldownTicketComplaints = [];

/*
    TICKET SYSTEM
*/

// cooldown update
function manageCooldowns() {
    setInterval(() => {
        const now = Date.now();

        cooldownTicketSuggestions = cooldownTicketSuggestions.filter(user => now - user.timestamp < cooldownWriteTicket);
        cooldownTicketBugs = cooldownTicketBugs.filter(user => now - user.timestamp < cooldownWriteTicket);
        cooldownTicketComplaints = cooldownTicketComplaints.filter(user => now - user.timestamp < cooldownWriteTicket);
    }, checkInterval);
}

function addUserToCooldown(user, type) {
    const userWithTimestamp = { id: user.id, timestamp: Date.now() };

    switch (type) {
        case 'suggestions':
            cooldownTicketSuggestions.push(userWithTimestamp);
            break;
        case 'bug':
            cooldownTicketBugs.push(userWithTimestamp);
            break;
        case 'complaints':
            cooldownTicketComplaints.push(userWithTimestamp);
            break;
        default:
            console.error('Unknown ticket type');
            break;
    }
}


// initalizes embed called from .once('ready')
async function checkMessagesAndSendEmbed() {
    try {
        const channel = await client.channels.fetch(startTicketChannel);
        if (!channel) {
            console.error('Channel not found');
            return;
        }

        const messages = await channel.messages.fetch({ limit: 100 });

        // Check if any message already contains an embed
        const embedExists = messages.some(message => message.embeds.length > 0);
        if (embedExists) {
            console.log('An embed already exists in the channel.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Open Ticket ✍️')
            .setDescription('Welcome to our ticket system. \nTickets are reviewed by staff on weekly basis.\nDuplicated tickets will be removed.\n\nPlease select the type of ticket you would like to open.')
            .setColor('#0099ff');

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('suggestions')
                    .setLabel('Suggestions')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('bug')
                    .setLabel('Report bugs')
                    .setStyle(ButtonStyle.Primary)
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('complaints')
                    .setLabel('Complaints')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ embeds: [embed], components: [row1, row2, row3] });
        console.log('Embed sent successfully.');
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

// Handle button interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    switch (interaction.customId) {
        case 'suggestions':
            console.log('Suggestions button clicked');
            await createTicket(interaction.user, 'suggestions');
            break;
        case 'bug':
            console.log('Bug button clicked');
            await createTicket(interaction.user, 'bug');
            break;
        case 'complaints':
            console.log('Complaints button clicked');
            await createTicket(interaction.user, 'complaints');
            break;
        default:
            console.log('Unknown button clicked');
            break;
    }

    await interaction.reply({ content: 'Button clicked!', ephemeral: true });
});


// create a new ticket
async function createTicket(user, ticketKind) {
    let success = false;
    if (ticketKind !== 'suggestions' && ticketKind !== 'bug' && ticketKind !== 'complaints') {
        console.error('Invalid ticket kind');
        return success;
    }

    // Helper function to check if user is on cooldown
    const isOnCooldown = (array) => array.some(u => u.id === user.id);

    if (ticketKind === 'suggestions' && isOnCooldown(cooldownTicketSuggestions)) {
        console.log('User is on cooldown for suggestions');
        return success;
    }
    if (ticketKind === 'bug' && isOnCooldown(cooldownTicketBugs)) {
        console.log('User is on cooldown for bug reports');
        return success;
    }
    if (ticketKind === 'complaints' && isOnCooldown(cooldownTicketComplaints)) {
        console.log('User is on cooldown for complaints');
        return success;
    }

    // Add user to cooldown
    addUserToCooldown(user, ticketKind);

    // Your ticket creation logic here
    console.log(`Ticket created for ${ticketKind}`);
}



/*
    Base bot functions
*/


async function sayHello() {
    await checkMessagesAndSendEmbed();
    const channel = client.channels.cache.get(botLogsChannel);
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
    manageCooldowns();
});

// 
//  CLOSING BOT FUNCTIONS:
//


async function sayGoodbye() {
    const channel = client.channels.cache.get(botLogsChannel);
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



