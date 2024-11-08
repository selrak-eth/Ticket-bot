const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle, PermissionsBitField, ChannelType, } = require('discord.js');
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
const staffLogChannel = (process.env.STAFF_LOG_CHANNEL);
const adminLogChannel = (process.env.ADMIN_LOG_CHANNEL);

// Categories of channels
const openTicketsCategory = (process.env.OPEN_TICKET_CATEGORY);
const archivesCategory = (process.env.ARCHIVES_CATEGORY);

// Roles
const staffRole = (process.env.STAFF_ROLE);



// tickets var
const cooldownWriteTicket = 2 * 60000; // in minutes
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

    // Determine the emoji for the ticket kind
    let emoji;
    switch (ticketKind) {
        case 'suggestions':
            emoji = '💡';
            break;
        case 'bug':
            emoji = '🤖';
            break;
        case 'complaints':
            emoji = '🚧';
            break;
        default:
            emoji = '';
            break;
    }

    // Create the channel name
    const channelName = `${emoji}-${user.tag}-${user.id}`;

    try {
        // Fetch the guild and create the channel
        const guild = client.guilds.cache.get(process.env.GUILD_ID); // Replace with your guild ID
        if (!guild) {
            console.error('Guild not found');
            return success;
        }

        const channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        console.log(`Channel created: ${channelName}, moving to category: ${openTicketsCategory}`);

        // Move the channel to the specified category
        await channel.setParent(openTicketsCategory);

        // Send a message in the channel
        await channel.send(`Your **${ticketKind} ticket**${emoji} has been created <@${user.id}>.\nYou can now write your message here.\n\n*To close the ticket at any point, use the command **\/ticketarchive.***`);

        // Ping the staff role in the staff log channel
        const staffLogChannelObj = guild.channels.cache.get(staffLogChannel);
        if (staffLogChannelObj) {
            await staffLogChannelObj.send(`A new **${ticketKind}** ${emoji} ticket has been created by <@${user.id}>. <@&${staffRole}> please check it out.`);
        } else {
            console.error('Staff log channel not found');
        }

        console.log(`Ticket channel created: ${channelName}`);
        success = true;
    } catch (error) {
        console.error('Failed to create ticket channel:', error);
    }

    return success;
}

/*
    COMMAND Handler
*/

// Handle button interactions and slash commands
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        let replyMessage = '';

        switch (interaction.customId) {
            case 'suggestions':
                console.log('Suggestions button clicked');
                if (await createTicket(interaction.user, 'suggestions')) {
                    replyMessage = `Your **suggestion ticket** has been created successfully on <#${openTicketsCategory}>`;
                } else {
                    replyMessage = 'You are on cooldown to create **suggestion tickets**. \n*You need to wait two minutes after sending a ticket.*';
                }
                break;
            case 'bug':
                console.log('Bug button clicked');
                if (await createTicket(interaction.user, 'bug')) {
                    replyMessage = `Your **bug report ticket** has been created successfully on <#${openTicketsCategory}>`;
                } else {
                    replyMessage = 'You are on cooldown to create **bug report tickets.** \n*You need to wait two minutes after sending a ticket.*';
                }
                break;
            case 'complaints':
                console.log('Complaints button clicked');
                if (await createTicket(interaction.user, 'complaints')) {
                    replyMessage = `Your **complaint ticket** has been created successfully on <#${openTicketsCategory}>`;
                } else {
                    replyMessage = 'You are on cooldown to create **complaint tickets**. \n*You need to wait two minutes after sending a ticket.*';
                }
                break;
            default:
                console.log('Unknown button clicked');
                replyMessage = 'Unknown button clicked.';
                break;
        }

        await interaction.reply({ content: replyMessage, ephemeral: true });
    } 
    else if (interaction.isCommand()) {
        if (interaction.commandName === 'ticketarchive') {
            // Archive the ticket channel
            const channel = interaction.channel;
            if (channel.parentId !== openTicketsCategory || channel.id === startTicketChannel) {
                await interaction.reply({ content: 'This command can only be used in a ticket channel.', ephemeral: true });
                return;
            }
            // Send a message in the channel saying the channel is being archived
            await channel.send('This channel is being archived. 💽');
            // send message in channel staff log pinging the user who prompted the command and the staff role
            const staffLogChannelObj = interaction.guild.channels.cache.get(staffLogChannel);
            if (staffLogChannelObj) {
                await staffLogChannelObj.send(`The ticket channel <#${channel.id}> is being archived by order of <@${interaction.user.id}>.`);
            } else {
                console.error('Staff log channel not found');
            }
    
            try {
                await channel.setParent(archivesCategory);
                await channel.setName(`💽${channel.name}`);
                await interaction.reply({ content: 'Ticket archived. 💽', ephemeral: true });
            } catch (error) {
                console.error('Failed to archive ticket channel:', error);
                await interaction.reply({ content: 'Failed to archive the ticket channel. :x:', ephemeral: true });
            }
        }
    }
});


// Register commands with Discord
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const commands = [
    {
        name: 'ticketarchive',
        description: 'Archives ticket channel.',
    }

];

// command initialitzation
const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
            body: commands,
        });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

/*
    Starting functions
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

/*
  CLOSING BOT FUNCTIONS:
*/
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



