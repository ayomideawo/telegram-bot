const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const WEATHER_KEY = process.env.WEATHER_KEY || '';

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN missing! Add it in Render variables.');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ===== STATE =====
const reminders = new Map();
const aiHistory = new Map();
const userNotes = new Map();

// ===== HELPERS =====
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// ===== DATA =====
const jokes = [
    "Why do programmers prefer dark mode? Light attracts bugs 🐛",
    "Why did the dev go broke? He used up all his cache 💸",
    "How many programmers to change a bulb? None, it's hardware 💡",
    "A SQL query walks into a bar: 'Can I join you?' 🍻",
    "I'd tell you a UDP joke, but you might not get it 📡"
];

const quotes = [
    "The best way to predict the future is to invent it. — Alan Kay",
    "Code is like humor. When you have to explain it, it's bad. — Cory House",
    "Simplicity is the soul of efficiency. — Austin Freeman",
    "Premature optimization is the root of all evil. — Donald Knuth"
];

const facts = [
    "Octopuses have three hearts 🐙",
    "Honey never spoils 🍯",
    "A day on Venus is longer than a year on Venus 🪐",
    "Bananas are berries, strawberries aren't 🍌",
    "Sharks existed before trees 🦈"
];

const riddles = [
    { q: "What has keys but can't open locks?", a: "A piano" },
    { q: "What gets wetter the more it dries?", a: "A towel" },
    { q: "What has a head and tail but no body?", a: "A coin" }
];

// ===== MENU =====
const MENU = `
🤖 *XITEXE ALL-IN-1 BOT*

*🎮 Fun*
/joke - Random joke
/quote - Random quote
/fact - Random fact
/dice - Roll dice
/coinflip - Heads or tails
/8ball <question> - Magic 8-ball
/riddle - Random riddle
/truth - Truth question
/dare - Dare challenge

*🤖 AI Chat*
/ai <question> - Ask AI anything
/reset - Clear AI memory

*🛠️ Utility*
/time - Current time
/date - Today's date
/calc 2+2 - Math
/random 1 100 - Random number
/password 16 - Generate password
/uuid - Generate UUID
/id - Your Telegram ID

*🌤️ Weather*
/weather <city> - Weather info

*🌐 Translation*
/tr <lang> <text> - Translate
Example: /tr es Hello

*📝 Notes*
/note <text> - Save a note
/notes - Show all notes
/clearnotes - Delete all

*⏰ Reminders*
/remind 5m water - Set reminder
/s = seconds, m = minutes, h = hours

*👥 Group Admin*
/groupinfo - Group stats
/tagall - Mention everyone
/pin - Pin replied message
/kick - Reply + kick user

*ℹ️ Info*
/menu - This menu
/help - Same as /menu
/about - About bot

Praise @Xitexes 🖕
`.trim();

// ===== COMMANDS =====

bot.start(ctx => {
    ctx.replyWithMarkdown(`👋 Welcome ${ctx.from.first_name}!\n\n${MENU}`);
});

bot.command(['menu', 'help', 'commands'], ctx => {
    ctx.replyWithMarkdown(MENU);
});

bot.command('about', ctx => {
    ctx.reply('🤖 XITEXE ALL-IN-1 BOT\nVersion: 1.0\nPowered by Telegraf\nPraise @Xitexes');
});

// ===== FUN =====
bot.command('joke', ctx => ctx.reply('😄 ' + rand(jokes)));
bot.command('quote', ctx => ctx.reply('💬 ' + rand(quotes)));
bot.command('fact', ctx => ctx.reply('🧠 ' + rand(facts)));
bot.command('dice', ctx => ctx.reply(`🎲 ${Math.floor(Math.random() * 6) + 1}`));
bot.command('coinflip', ctx => ctx.reply(Math.random() < 0.5 ? 'Heads 🪙' : 'Tails 🪙'));

bot.command('8ball', ctx => {
    const q = ctx.message.text.replace('/8ball', '').trim();
    if (!q) return ctx.reply('Usage: /8ball Will I win?');
    const answers = ["Yes ✅", "No ❌", "Maybe 🤔", "Absolutely 🔥", "Doubtful 🤨", "Definitely 💯", "Ask later 💭"];
    ctx.reply(`🎱 ${rand(answers)}`);
});

bot.command('riddle', async ctx => {
    const r = rand(riddles);
    await ctx.reply(`🧩 ${r.q}\n\n_Answer in 20s..._`, { parse_mode: 'Markdown' });
    setTimeout(() => ctx.reply(`💡 Answer: ${r.a}`), 20000);
});

bot.command('truth', ctx => {
    const qs = ["What's your most embarrassing moment?", "Who's your secret crush?", "What's the biggest lie you've told?"];
    ctx.reply('💬 ' + rand(qs));
});

bot.command('dare', ctx => {
    const ds = ["Send the last photo in your gallery.", "Voice note yourself singing.", "Text your crush 'hey'."];
    ctx.reply('🔥 ' + rand(ds));
});

// ===== AI =====
bot.command('ai', async ctx => {
    if (!GROQ_API_KEY) return ctx.reply('❌ Set GROQ_API_KEY in Render variables');
    const q = ctx.message.text.replace('/ai', '').trim();
    if (!q) return ctx.reply('Usage: /ai What is gravity?');

    const loading = await ctx.reply('🤔 Thinking...');
    try {
        const history = aiHistory.get(ctx.from.id) || [];
        history.push({ role: 'user', content: q });

        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: 'You are a helpful Telegram assistant. Keep replies concise.' },
                ...history.slice(-6)
            ],
            max_tokens: 500
        }, {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` }
        });

        const ans = res.data.choices[0].message.content;
        history.push({ role: 'assistant', content: ans });
        aiHistory.set(ctx.from.id, history);

        await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, `🤖 ${ans}`);
    } catch (e) {
        await ctx.telegram.editMessageText(ctx.chat.id, loading.message_id, undefined, '❌ AI error: ' + e.message);
    }
});

bot.command('reset', ctx => {
    aiHistory.delete(ctx.from.id);
    ctx.reply('🧹 AI memory cleared');
});

// ===== UTILITY =====
bot.command('time', ctx => ctx.reply(`🕐 ${new Date().toLocaleString()}`));
bot.command('date', ctx => ctx.reply(`📅 ${new Date().toDateString()}`));

bot.command('calc', ctx => {
    const expr = ctx.message.text.replace('/calc', '').trim();
    if (!expr) return ctx.reply('Usage: /calc 2+2');
    if (!/^[0-9+\-*/().\s]+$/.test(expr)) return ctx.reply('❌ Only numbers and + - * / ( ) allowed');
    try { ctx.reply(`🧮 ${expr} = ${eval(expr)}`); }
    catch { ctx.reply('❌ Invalid expression'); }
});

bot.command('random', ctx => {
    const args = ctx.message.text.split(' ');
    const min = parseInt(args[1]) || 1;
    const max = parseInt(args[2]) || 100;
    ctx.reply(`🎲 ${Math.floor(Math.random() * (max - min + 1)) + min}`);
});

bot.command('password', ctx => {
    const args = ctx.message.text.split(' ');
    const len = Math.min(parseInt(args[1]) || 16, 64);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let p = '';
    for (let i = 0; i < len; i++) p += chars[Math.floor(Math.random() * chars.length)];
    ctx.reply(`🔐 \`${p}\``, { parse_mode: 'Markdown' });
});

bot.command('uuid', ctx => {
    const u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    ctx.reply(`🆔 ${u}`);
});

bot.command('id', ctx => ctx.reply(`Your Telegram ID: ${ctx.from.id}`));

// ===== WEATHER =====
bot.command('weather', async ctx => {
    const city = ctx.message.text.replace('/weather', '').trim();
    if (!city) return ctx.reply('Usage: /weather Lagos');
    if (!WEATHER_KEY) return ctx.reply('❌ Weather API key not set');

    try {
        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_KEY}&units=metric`);
        const d = res.data;
        ctx.reply(`🌤️ *${d.name}, ${d.sys.country}*\n🌡️ ${d.main.temp}°C\n☁️ ${d.weather[0].description}\n💧 Humidity: ${d.main.humidity}%`, { parse_mode: 'Markdown' });
    } catch {
        ctx.reply('❌ City not found or weather API error');
    }
});

// ===== TRANSLATE =====
bot.command('tr', async ctx => {
    const parts = ctx.message.text.split(' ');
    const lang = parts[1];
    const text = parts.slice(2).join(' ');
    if (!lang || !text) return ctx.reply('Usage: /tr es Hello friend');

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await axios.get(url);
        const translated = res.data[0].map(x => x[0]).filter(Boolean).join('');
        ctx.reply(`🌐 *${lang}:*\n${translated}`, { parse_mode: 'Markdown' });
    } catch {
        ctx.reply('❌ Translation failed');
    }
});

// ===== NOTES =====
bot.command('note', ctx => {
    const text = ctx.message.text.replace('/note', '').trim();
    if (!text) return ctx.reply('Usage: /note buy milk');
    const notes = userNotes.get(ctx.from.id) || [];
    notes.push(text);
    userNotes.set(ctx.from.id, notes);
    ctx.reply(`📝 Saved! Total: ${notes.length} notes`);
});

bot.command('notes', ctx => {
    const notes = userNotes.get(ctx.from.id) || [];
    if (!notes.length) return ctx.reply('No notes yet. Use /note <text>');
    ctx.reply('📝 *Your Notes:*\n' + notes.map((n, i) => `${i + 1}. ${n}`).join('\n'), { parse_mode: 'Markdown' });
});

bot.command('clearnotes', ctx => {
    userNotes.delete(ctx.from.id);
    ctx.reply('🗑️ All notes cleared');
});

// ===== REMINDERS =====
bot.command('remind', ctx => {
    const args = ctx.message.text.split(' ');
    const timeArg = args[1];
    const text = args.slice(2).join(' ');

    if (!timeArg || !text) return ctx.reply('Usage: /remind 5m Take a break');
    const m = timeArg.match(/^(\d+)(s|m|h)$/);
    if (!m) return ctx.reply('Format: 5m, 30s, 2h');

    const unit = m[2];
    const ms = unit === 's' ? +m[1] * 1000 : unit === 'm' ? +m[1] * 60000 : +m[1] * 3600000;

    setTimeout(() => ctx.reply(`⏰ *Reminder:* ${text}`, { parse_mode: 'Markdown' }), ms);
    ctx.reply(`✅ Reminder set in ${m[1]}${unit}: "${text}"`);
});

// ===== GROUP =====
bot.command('groupinfo', ctx => {
    if (ctx.chat.type === 'private') return ctx.reply('❌ Groups only');
    ctx.reply(`📊 *${ctx.chat.title}*\nType: ${ctx.chat.type}\nID: ${ctx.chat.id}`, { parse_mode: 'Markdown' });
});

bot.command('tagall', async ctx => {
    if (ctx.chat.type === 'private') return ctx.reply('❌ Groups only');
    try {
        const admins = await ctx.telegram.getChatAdministrators(ctx.chat.id);
        let text = '📢 *Attention everyone:*\n\n';
        admins.forEach(a => { text += `@${a.user.username || a.user.first_name} `; });
        ctx.reply(text, { parse_mode: 'Markdown' });
    } catch {
        ctx.reply('❌ Could not mention members');
    }
});

bot.command('kick', async ctx => {
    if (ctx.chat.type === 'private') return ctx.reply('❌ Groups only');
    if (!ctx.message.reply_to_message) return ctx.reply('Reply to a message with /kick');
    try {
        await ctx.telegram.kickChatMember(ctx.chat.id, ctx.message.reply_to_message.from.id);
        ctx.reply(`✅ Kicked ${ctx.message.reply_to_message.from.first_name}`);
    } catch {
        ctx.reply('❌ Cannot kick (bot needs admin rights)');
    }
});

bot.command('pin', async ctx => {
    if (!ctx.message.reply_to_message) return ctx.reply('Reply to a message with /pin');
    try {
        await ctx.telegram.pinChatMessage(ctx.chat.id, ctx.message.reply_to_message.message_id);
        ctx.reply('📌 Message pinned');
    } catch {
        ctx.reply('❌ Cannot pin (bot needs admin rights)');
    }
});

// ===== UNKNOWN =====
bot.on('text', ctx => {
    const text = ctx.message.text;
    if (text.startsWith('/')) {
        ctx.reply(`❌ Unknown command.\nType /menu for all commands`);
    }
});

// ===== LAUNCH =====
bot.launch();
console.log('🤖 XITEXE ALL-IN-1 BOT is running!');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
