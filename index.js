require('dotenv').config(); // Loads .env file

const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

// Connect to MongoDB (replace with your connection string)
mongoose.connect('process.env.MONGODB_URI', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define clothing item schema
const clothingItemSchema = new mongoose.Schema({
  name: String,
  type: String, // shirt, pants, etc.
  location: { type: String, enum: ['my_house', 'girlfriend_house'], default: 'my_house' },
  lastMoved: Date
});

const ClothingItem = mongoose.model('ClothingItem', clothingItemSchema);

// Initialize bot with your token from BotFather
const bot = new Telegraf('process.env.BOT_TOKEN');

// Start command
bot.start((ctx) => {
  ctx.reply('Welcome to your Clothing Tracker Bot! Here are the commands you can use:\n\n' +
    '/add [item] - Add a new clothing item\n' +
    '/move [item] - Move an item between houses\n' +
    '/list - List all items and their locations\n' +
    '/list_my_house - List items at your house\n' +
    '/list_gf_house - List items at your girlfriend\'s house\n' +
    '/delete [item] - Remove an item from tracking');
});

// Add new clothing item
bot.command('add', async (ctx) => {
  const itemName = ctx.message.text.split(' ').slice(1).join(' ');
  if (!itemName) {
    return ctx.reply('Please specify an item name after /add');
  }

  try {
    const newItem = new ClothingItem({
      name: itemName,
      location: 'my_house',
      lastMoved: new Date()
    });
    await newItem.save();
    ctx.reply(`Added "${itemName}" to your house!`);
  } catch (err) {
    console.error(err);
    ctx.reply('Error adding item');
  }
});

// Move item between houses
bot.command('move', async (ctx) => {
  const itemName = ctx.message.text.split(' ').slice(1).join(' ');
  if (!itemName) {
    return ctx.reply('Please specify an item name after /move');
  }

  try {
    const item = await ClothingItem.findOne({ name: itemName });
    if (!item) {
      return ctx.reply(`Item "${itemName}" not found`);
    }

    const newLocation = item.location === 'my_house' ? 'girlfriends_house' : 'my_house';
    item.location = newLocation;
    item.lastMoved = new Date();
    await item.save();
    
    ctx.reply(`Moved "${itemName}" to ${newLocation.replace('_', ' ')}`);
  } catch (err) {
    console.error(err);
    ctx.reply('Error moving item');
  }
});

// List all items
bot.command('list', async (ctx) => {
  try {
    const items = await ClothingItem.find().sort({ location: 1 });
    if (items.length === 0) {
      return ctx.reply('No items being tracked yet!');
    }

    let message = 'Your clothing items:\n\n';
    items.forEach(item => {
      message += `- ${item.name}: ${item.location.replace('_', ' ')} (last moved: ${item.lastMoved.toLocaleDateString()})\n`;
    });
    
    ctx.reply(message);
  } catch (err) {
    console.error(err);
    ctx.reply('Error retrieving items');
  }
});

// List items at specific location
const createListCommand = (location, locationName) => {
  return async (ctx) => {
    try {
      const items = await ClothingItem.find({ location });
      if (items.length === 0) {
        return ctx.reply(`No items at ${locationName} yet!`);
      }

      let message = `Items at ${locationName}:\n\n`;
      items.forEach(item => {
        message += `- ${item.name} (last moved: ${item.lastMoved.toLocaleDateString()})\n`;
      });
      
      ctx.reply(message);
    } catch (err) {
      console.error(err);
      ctx.reply('Error retrieving items');
    }
  };
};

bot.command('list_my_house', createListCommand('my_house', 'your house'));
bot.command('list_gf_house', createListCommand('girlfriends_house', 'girlfriend\'s house'));

// Delete item
bot.command('delete', async (ctx) => {
  const itemName = ctx.message.text.split(' ').slice(1).join(' ');
  if (!itemName) {
    return ctx.reply('Please specify an item name after /delete');
  }

  try {
    const result = await ClothingItem.deleteOne({ name: itemName });
    if (result.deletedCount === 0) {
      return ctx.reply(`Item "${itemName}" not found`);
    }
    
    ctx.reply(`Deleted "${itemName}" from tracking`);
  } catch (err) {
    console.error(err);
    ctx.reply('Error deleting item');
  }
});

// Start the bot
bot.launch().then(() => {
  console.log('Clothing Tracker Bot is running!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));