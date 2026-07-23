/**
 * WhatsApp QR Bot Runner (using whatsapp-web.js)
 * 
 * Instructions:
 * 1. Install dependencies: npm install
 * 2. Run script: node scripts/whatsapp-qr-bot.js
 * 3. Scan QR code displayed in terminal with WhatsApp -> Linked Devices
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import { parseHeader, parsePlayers, balanceTeams } from '../src/lib/balancer.js';

const TEAM_EMOJIS = {
  white: { emoji: '⚪', name: 'EQUIPO BLANCO' },
  red: { emoji: '🔴', name: 'EQUIPO ROJO' },
};

const PERRA_RESPONSES = [
  '¡Tú más! 🐶',
  '¡Guau guau! 🐕',
  '¡Eso lo serás tú! 😜',
  '¡Perra tú, mi reina! 👑💅',
  '¡Respeto con el Míster del equipo! ⚽',
  '¡A ti te quería yo ver tirando un penalti! ⚽💨',
  '¡Tú sí que eres perra vieja jugando al fútbol! ⚽🔥',
];

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const INIT_FILE = path.join(process.cwd(), '.initialized_groups.json');
const SETTINGS_FILE = path.join(process.cwd(), '.group_settings.json');

function loadInitializedGroups() {
  try {
    if (fs.existsSync(INIT_FILE)) {
      const data = fs.readFileSync(INIT_FILE, 'utf-8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error('Error loading initialized groups:', e);
  }
  return new Set(['default']); // Self-chat always initialized by default
}

function saveInitializedGroups(set) {
  try {
    fs.writeFileSync(INIT_FILE, JSON.stringify(Array.from(set), null, 2));
  } catch (e) {
    console.error('Error saving initialized groups:', e);
  }
}

const initializedGroups = loadInitializedGroups();

const MISTERS_FILE = path.join(process.cwd(), '.misters.json');

function loadMisters() {
  try {
    if (fs.existsSync(MISTERS_FILE)) {
      const data = fs.readFileSync(MISTERS_FILE, 'utf-8');
      return new Set(JSON.parse(data));
    }
  } catch (e) {
    console.error('Error loading misters:', e);
  }
  return new Set();
}

function saveMisters(set) {
  try {
    fs.writeFileSync(MISTERS_FILE, JSON.stringify(Array.from(set), null, 2));
  } catch (e) {
    console.error('Error saving misters:', e);
  }
}

const mistersSet = loadMisters();

function loadGroupSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading group settings:', e);
  }
  return {};
}

function saveGroupSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Error saving group settings:', e);
  }
}

const groupSettingsMap = loadGroupSettings();

function getGroupTeamConfig(groupId) {
  const current = groupSettingsMap[groupId] || {};
  return {
    team1: {
      name: current.team1?.name || 'EQUIPO BLANCO',
      emoji: current.team1?.emoji || '⚪'
    },
    team2: {
      name: current.team2?.name || 'EQUIPO ROJO',
      emoji: current.team2?.emoji || '🔴'
    }
  };
}

let lastActiveChatId = null;
const isSilent = process.argv.includes('--silent') || process.argv.includes('-s');

// Clean up stale Chromium lock files if present
try {
  const lockFile = path.join(process.cwd(), '.wwebjs_auth', 'session', 'SingletonLock');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
  }
} catch (e) {
  // Ignore lock removal errors
}

console.log('🚀 Iniciando FUT Balancer WhatsApp Bot...');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018944837-alpha.html',
  },
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  console.log('\n======================================================');
  console.log('📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
  console.log('(WhatsApp -> Menú de 3 puntos -> Dispositivos vinculados)');
  console.log('======================================================\n');
  qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
  console.log('✅ Sesión de WhatsApp autenticada correctamente.');
});

client.on('ready', async () => {
  const phone = client.info?.wid?.user || 'Desconocido';
  const name = client.info?.pushname || 'Usuario';
  console.log('\n======================================================');
  console.log('🎉 ¡BOT DE FUT BALANCER CONECTADO CON ÉXITO!');
  console.log(`📱 Número de WhatsApp conectado: +${phone} (${name})`);
  console.log('======================================================');
  console.log('👉 Puedes enviarle mensajes a este número (+' + phone + ') desde otro móvil,');
  console.log('👉 O probar tú mismo abriendo el chat "Mensajes a ti mismo" en tu propio WhatsApp.\n');

  if (isSilent) {
    console.log('ℹ️ Inicio silencioso activado. No se enviarán mensajes de inicio.');
    return;
  }
});

client.on('message_create', async (msg) => {
  try {
    // Prevent bot from replying to its own generated team response messages
    if (msg.fromMe && msg.body.includes('FUT Team Balancer')) {
      return;
    }

    const text = msg.body || '';
    const trimmed = text.trim().toLowerCase();

    const isGroup = (msg.from && msg.from.endsWith('@g.us')) || (msg.to && msg.to.endsWith('@g.us'));
    const myWid = client.info?.wid?._serialized;
    const cleanJid = (jid) => jid ? jid.replace(/:.*@/, '@') : '';
    const isSelfChat = !isGroup && (cleanJid(msg.from) === cleanJid(msg.to));

    let recipientName = (msg.to || '').split('@')[0];
    try {
      const chat = await msg.getChat();
      if (chat && chat.name) recipientName = chat.name;
    } catch (e) {
      // Ignore getChat failure on temporary/status messages
    }

    const senderPhone = (msg.author || msg.from || '').split('@')[0].split(':')[0].split('-')[0];

    let chatType = '[CHAT PRIVADO]';
    if (isSelfChat) chatType = '[PROPIO CHAT (Mensajes a ti mismo)]';
    else if (isGroup) chatType = `[GRUPO: ${recipientName}]`;

    const chatJid = isSelfChat ? msg.from : (msg.fromMe ? msg.to : msg.from);

    // Override msg.reply to guarantee the bot replies quoting the user's message
    const originalReply = msg.reply.bind(msg);
    msg.reply = async (replyText, options = {}) => {
      try {
        return await client.sendMessage(chatJid, replyText, {
          quotedMessageId: msg.id._serialized,
          ...options
        });
      } catch (e) {
        console.error('Error in custom msg.reply override, falling back:', e);
        return await originalReply(replyText, options);
      }
    };

    // Consecutive message tracker per chat
    const senderDigits = senderPhone.replace(/\D/g, '');
    const activeChatId = (msg.from.endsWith('@g.us') ? msg.from : msg.to).split('@')[0];

    if (!global.consecutiveTracker) global.consecutiveTracker = {};
    if (!global.consecutiveTracker[activeChatId]) {
      global.consecutiveTracker[activeChatId] = { sender: null, count: 0 };
    }

    if (global.consecutiveTracker[activeChatId].sender === senderDigits) {
      global.consecutiveTracker[activeChatId].count += 1;
    } else {
      global.consecutiveTracker[activeChatId].sender = senderDigits;
      global.consecutiveTracker[activeChatId].count = 1;
    }

    // STRICT COMMAND FILTERING: Ignore any message that does NOT start with a slash or explicit ID query
    const isExplicitSlashCommand = trimmed.startsWith('/') || trimmed === 'dime tu id de organizacion' || trimmed === 'id';

    if (!isExplicitSlashCommand) {
      return;
    }

    lastActiveChatId = chatJid;

    // Print rich debug info for terminal (only for processed commands)
    const msgDate = new Date((msg.timestamp || Math.floor(Date.now() / 1000)) * 1000);
    let dateStr = msgDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1).replace(',', '');
    const timeStr = msgDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const formattedTimestamp = `${dateStr} a las ${timeStr}`;

    console.log(`\n📩 Mensaje recibido (Comando):`);
    console.log(`   • Fecha: ${formattedTimestamp}`);
    console.log(`   • Remitente: ${msg.fromMe ? 'Tú (' + senderPhone + ')' : '+' + senderPhone}`);
    console.log(`   • Chat/Destinatario: ${recipientName} ${chatType}`);
    console.log(`   • Texto: "${text.replace(/\n/g, ' ')}"`);

    const groupId = isGroup ? (msg.from.endsWith('@g.us') ? msg.from : msg.to).split('@')[0] : 'default';
    const groupName = isGroup ? recipientName : 'Chat Privado';

    // Command 1: Init / ID Query (/fut-team-balancer init, /init, dime tu id de organizacion, /id)
    const isInitCommand = (
      trimmed === '/fut-team-balancer init' ||
      trimmed === '/init' ||
      trimmed === '/vincular' ||
      trimmed === 'dime tu id de organizacion' ||
      trimmed === 'id' ||
      trimmed === '/id'
    );

    if (isInitCommand) {
      console.log(`🤖 -> Inicializando / mostrando ID en ${groupName} (${groupId})`);
      initializedGroups.add(groupId);
      saveInitializedGroups(initializedGroups);

      if (isGroup) {
        const initReply = `⚽ *FUT Team Balancer Bot Inicializado* ⚽\n\n📌 *Grupo*: *${groupName}*\n🔑 *ID de Organización*: *${groupId}*\n\n✅ *Grupo vinculado con éxito.* Usa */equilibrar* o */make-team* junto con tu lista de partido para generar los equipos.`;
        await msg.reply(initReply);
      } else {
        const initReply = `⚽ *FUT Team Balancer Bot Inicializado* ⚽\n\n🔑 *ID de Organización por defecto*: *default*\n\n✅ Para vincular un grupo de fútbol, añade este bot al grupo y escribe */fut-team-balancer init*.`;
        await msg.reply(initReply);
      }
      return;
    }

    // Cooldown check for meme commands (1 minute)
    let cmdKey = null;
    if (trimmed.startsWith('/perra')) cmdKey = 'perra';
    else if (trimmed.startsWith('/ardillita')) cmdKey = 'ardillita';
    else if (trimmed.startsWith('/lola')) cmdKey = 'lola';

    if (cmdKey) {
      if (!global.memeCooldownTracker) {
        global.memeCooldownTracker = {};
      }
      if (!global.memeWarnedUsers) {
        global.memeWarnedUsers = {};
      }

      const cooldownKey = `${senderDigits}_${cmdKey}`;
      const now = Date.now();
      const lastUsed = global.memeCooldownTracker[cooldownKey] || 0;
      const cooldownMs = 1 * 60 * 1000; // 1 minute

      if (now - lastUsed < cooldownMs) {
        const remainingMs = cooldownMs - (now - lastUsed);
        const remainingSecs = Math.ceil(remainingMs / 1000);
        console.log(`🔒 -> Cooldown activo para +${senderDigits} en el comando '${cmdKey}' (${remainingSecs}s restantes).`);
        if (!global.memeWarnedUsers[senderDigits]) {
          global.memeWarnedUsers[senderDigits] = true;
          await msg.reply('corta corta ✂️ espera 1 minuto');
        }
        return;
      }
      global.memeCooldownTracker[cooldownKey] = now;
    }

    // Command: Help / Ayuda (/help, /ayuda, /start)
    if (trimmed.startsWith('/help') || trimmed.startsWith('/ayuda') || trimmed === '/start') {
      let targetHelp = 'general';

      if (!isGroup) {
        if (trimmed.includes('strokes')) {
          targetHelp = 'strokes';
        } else if (trimmed.includes('leyendasunav') || trimmed.includes('leyendas')) {
          targetHelp = 'leyendasunav';
        } else {
          targetHelp = 'self-chat-menu';
        }
      } else {
        const strokesGroupId = process.env.STROKES_GROUP_ID;
        const leyendasGroupId = process.env.LEYENDAS_GROUP_ID;

        if (strokesGroupId && groupId.includes(strokesGroupId)) {
          targetHelp = 'strokes';
        } else if (leyendasGroupId && groupId.includes(leyendasGroupId)) {
          targetHelp = 'leyendasunav';
        } else {
          targetHelp = 'general';
        }
      }

      console.log(`🤖 -> Respondiendo comando de ayuda (${targetHelp}) en ${groupName}`);

      let helpReply = '';
      if (targetHelp === 'strokes') {
        helpReply = `🐿️ *Strokes Help* 🐿️\n\nComandos disponibles en este grupo:\n• */equilibrar* [lista]: Equilibra los equipos de fútbol.\n• */ardillita*: Envía el sticker de la Ardillita.`;
      } else if (targetHelp === 'leyendasunav') {
        helpReply = `🏆 *Leyendas UNAV Help* 🏆\n\nComandos disponibles en este grupo:\n• */equilibrar* [lista]: Equilibra los equipos de Leyendas UNAV.\n• */ejemplo*: Muestra un ejemplo de lista formateada.\n• */id*: Muestra el ID de vinculación del grupo.`;
      } else if (targetHelp === 'self-chat-menu') {
        helpReply = `⚽ *Menú de Ayuda* ⚽\n\nEscribe uno de estos comandos para ver la ayuda específica de cada grupo:\n• */help strokes*\n• */help leyendasunav*\n\n*(O utiliza cualquiera de los comandos generales como /equilibrar o /ejemplo)*`;
      } else {
        helpReply = `⚽ *Ayuda* ⚽\n\nComandos disponibles:\n• */equilibrar* [lista]: Equilibra los equipos de fútbol.\n• */make-teams-xl* [lista]: Equilibra equipos de 12 vs 12.\n• */ejemplo*: Muestra un ejemplo de lista formateada.\n• */id* o *id*: Muestra el ID de vinculación del grupo.\n\n🔧 *Configuración de Equipos (Solo Místers):*\n• */config-equipos* [Equipo1] vs [Equipo2]: Configura nombres y emojis. (Ej: */config-equipos ⚪ Blancos vs 🔴 Rojos*)\n• */set-team1* o */set-team2* [Nombre]: Cambia el nombre de un equipo.`;
      }

      await msg.reply(helpReply);
      return;
    }

    // Command: Secret Help / Ayuda Secreta (/secreto, /secret, /ayudasecreta, /ayuda-secreta)
    if (trimmed === '/secreto' || trimmed === '/secret' || trimmed === '/ayudasecreta' || trimmed === '/ayuda-secreta') {
      console.log(`🤖 -> Respondiendo comando de ayuda secreta en ${groupName}`);
      const secretHelpText = `🕵️‍♂️ *FUT Balancer Bot - Menú Secreto* 🕵️‍♂️\n\nComandos ocultos del bot:\n• */lola*: Envía un sticker de Lola 🐶 (solo permitido para usuarios autorizados y el dueño).`;
      await msg.reply(secretHelpText);
      return;
    }

    // Command: Ardillita (doesn't require init, only allowed in authorized group or self-chat)
    if (trimmed.startsWith('/ardillita')) {
      const strokesGroupId = process.env.STROKES_GROUP_ID;
      const isAllowedGroup = (strokesGroupId && groupId.includes(strokesGroupId)) || isSelfChat || !isGroup;
      if (!isAllowedGroup) {
        console.log(`🔒 -> /ardillita denegado para el grupo '${groupName}' (${groupId}).`);
        return;
      }

      console.log('🤖 -> Respondiendo comando /ardillita');
      const possibleDirs = [
        path.join(process.cwd(), 'assets', 'strokes_amsterdam')
      ];

      let foundFiles = [];
      let activeDir = possibleDirs[0];

      for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|gif|webp|bmp|jpeg)$/i.test(f));
          if (files.length > 0) {
            foundFiles = files.map(f => path.join(dir, f));
            activeDir = dir;
            break;
          }
        }
      }

      if (foundFiles.length === 0) {
        await msg.reply('🐿️ No encontré fotos en `assets/strokes_amsterdam`.');
        return;
      }

      const ardillitaFile = foundFiles.find(f => path.basename(f).toLowerCase().includes('ardillita')) || foundFiles[0];
      const media = MessageMedia.fromFilePath(ardillitaFile);
      await client.sendMessage(chatJid, media, {
        sendMediaAsSticker: true,
        stickerName: 'Ardillita 🐿️',
        stickerAuthor: 'FUT Balancer Bot',
        quotedMessageId: msg.id._serialized
      });
      console.log(`✅ -> Enviado sticker de Ardillita (${path.basename(ardillitaFile)}) desde ${activeDir}`);
      return;
    }

    // Command: Reset Bot (/reset, /reset-bot, /resetbot, /reiniciar)
    const isResetCommand = trimmed.startsWith('/reset') || trimmed.startsWith('/reiniciar');
    if (isResetCommand) {
      if (!msg.fromMe) {
        await msg.reply('⛔ No tienes permiso para reiniciar el bot.');
        return;
      }

      console.log('🔄 -> Reiniciando el bot...');
      const isSilentReset = trimmed.includes('--silent') || trimmed.includes('-s');

      if (!isSilentReset) {
        await msg.reply('🔄 *Reiniciando el bot...* Vuelvo en unos segundos.');
      } else {
        await msg.reply('🔄 *Reiniciando el bot silenciosamente...*');
      }

      setTimeout(() => {
        let spawnArgs = process.argv.slice(1);
        
        if (isSilentReset) {
          if (!spawnArgs.includes('--silent')) {
            spawnArgs.push('--silent');
          }
        } else {
          spawnArgs = spawnArgs.filter(arg => arg !== '--silent' && arg !== '-s');
        }

        if (process.platform === 'win32') {
          const child = spawn('cmd.exe', ['/c', 'start', process.argv[0], ...spawnArgs], {
            cwd: process.cwd(),
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } else {
          const child = spawn(process.argv[0], spawnArgs, {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit'
          });
          child.unref();
        }
        process.exit(0);
      }, 1000);
      return;
    }

    // Command: Shutdown Bot (/apagar, /shutdown, /off)
    if (trimmed === '/apagar' || trimmed === '/shutdown' || trimmed === '/off') {
      if (!msg.fromMe) {
        await msg.reply('⛔ No tienes permiso para apagar el bot.');
        return;
      }

      console.log('🔌 -> Apagando el bot...');
      await msg.reply('🔌 *Apagando el bot...* ¡Hasta pronto! 👋');

      setTimeout(() => {
        process.exit(0);
      }, 1000);
      return;
    }

    // Command: Perra
    if (trimmed.startsWith('/perra')) {
      console.log('🤖 -> Respondiendo comando /perra');
      const randomResponse = PERRA_RESPONSES[Math.floor(Math.random() * PERRA_RESPONSES.length)];
      await msg.reply(randomResponse);
      return;
    }

    // Command: Lola
    if (trimmed.startsWith('/lola')) {
      const senderDigits = senderPhone.replace(/\D/g, '');
      const isAllowedLolaUser = msg.fromMe || (process.env.LOLA_ALLOWED_PHONE && senderDigits === process.env.LOLA_ALLOWED_PHONE);

      if (!isAllowedLolaUser) {
        console.log(`🔒 -> /lola denegado para +${senderPhone} (solo permitido para administradores).`);
        await msg.reply('⛔ No tienes permiso para ejecutar este comando.');
        return;
      }

      console.log('🤖 -> Respondiendo comando /lola');
      const possibleDirs = [
        path.join(process.cwd(), 'assets', 'lola')
      ];

      let foundFiles = [];
      let activeDir = possibleDirs[0];

      for (const dir of possibleDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter(f => /\.(png|jpe?g|gif|webp|bmp|jpeg)$/i.test(f));
          if (files.length > 0) {
            foundFiles = files.map(f => path.join(dir, f));
            activeDir = dir;
            break;
          }
        }
      }

      if (foundFiles.length === 0) {
        await msg.reply('🐶 No encontré fotos en `assets/lola`. ¡Añade fotos de Lola ahí!');
        return;
      }

      const randomFilePath = foundFiles[Math.floor(Math.random() * foundFiles.length)];
      const media = MessageMedia.fromFilePath(randomFilePath);
      const stickerAuthor = 'FUT Balancer Bot';
      await client.sendMessage(chatJid, media, {
        sendMediaAsSticker: true,
        stickerName: 'Lola 🐶',
        stickerAuthor: stickerAuthor,
        quotedMessageId: msg.id._serialized
      });
      console.log(`✅ -> Enviado sticker de Lola (${path.basename(randomFilePath)}) desde ${activeDir}`);
      return;
    }

    // Command: Ejemplo
    if (trimmed.startsWith('/ejemplo')) {
      console.log('🤖 -> Enviando lista de EJEMPLO');
      const sampleList = `/equilibrar\nMiércoles 18:30 - Campo F11\n\n1. Aranda\n2. Patxi\n3. Ramon\n4. Sergio I\n5. Nico\n6. Facu\n7. Kevin\n8. Jose Ángel\n9. David gut\n10. Julito\n11. Geisler\n12. Moncho\n13. Max\n14. Julián Lemar\n15. Andrés\n16. Iñaki DK\n17. Jon\n18. Rafa L\n19. Felipe\n20. Sebas\n———-\nR1. Pablo V\nR2. Pierre`;
      await msg.reply(sampleList);
      return;
    }

    // Command: Hacer Míster
    if (trimmed.startsWith('/hacer-mister') || trimmed.startsWith('/hacermister') || trimmed.startsWith('/add-mister')) {
      if (!msg.fromMe) {
        await msg.reply('⛔ No tienes permiso para nombrar Místers.');
        return;
      }

      let targetPhone = '';
      const hasQuote = msg.hasQuotedMsg || !!(msg._data && msg._data.quotedMsg);
      if (hasQuote) {
        const quotedMsg = msg._data?.quotedMsg;
        if (quotedMsg && (quotedMsg.author || quotedMsg.from)) {
          targetPhone = (quotedMsg.author || quotedMsg.from).split('@')[0].split('-')[0].replace(/\D/g, '');
        } else {
          try {
            const qm = await msg.getQuotedMessage();
            if (qm && (qm.author || qm.from)) {
              targetPhone = (qm.author || qm.from).split('@')[0].split('-')[0].replace(/\D/g, '');
            }
          } catch (e) { }
        }
      }

      if (!targetPhone) {
        await msg.reply('👔 Por favor, responde al mensaje de la persona que quieras nombrar Míster con `/hacer-mister`.');
        return;
      }

      mistersSet.add(targetPhone);
      saveMisters(mistersSet);
      await msg.reply(`👔 *¡Nuevo Míster asignado!* ⚽\n\n+${targetPhone} ahora tiene permisos para ejecutar comandos del bot.`);
      return;
    }

    // Command: Quitar Míster
    if (trimmed.startsWith('/quitar-mister') || trimmed.startsWith('/quitarmister') || trimmed.startsWith('/remove-mister')) {
      if (!msg.fromMe) {
        await msg.reply('⛔ No tienes permiso para destituir Místers.');
        return;
      }

      let targetPhone = '';
      const hasQuote = msg.hasQuotedMsg || !!(msg._data && msg._data.quotedMsg);
      if (hasQuote) {
        const quotedMsg = msg._data?.quotedMsg;
        if (quotedMsg && (quotedMsg.author || quotedMsg.from)) {
          targetPhone = (quotedMsg.author || quotedMsg.from).split('@')[0].split('-')[0].replace(/\D/g, '');
        } else {
          try {
            const qm = await msg.getQuotedMessage();
            if (qm && (qm.author || qm.from)) {
              targetPhone = (qm.author || qm.from).split('@')[0].split('-')[0].replace(/\D/g, '');
            }
          } catch (e) { }
        }
      }

      if (!targetPhone) {
        await msg.reply('👔 Por favor, responde al mensaje del Míster que quieras destituir con `/quitar-mister`.');
        return;
      }

      mistersSet.delete(targetPhone);
      saveMisters(mistersSet);
      await msg.reply(`👔 *Míster destituido*: +${targetPhone} ya no tiene permisos de Míster.`);
      return;
    }

    // Command: Config Teams
    if (
      trimmed.startsWith('/set-team') ||
      trimmed.startsWith('/set team') ||
      trimmed.startsWith('/config-equipos') ||
      trimmed.startsWith('/equipo1') ||
      trimmed.startsWith('/equipo2')
    ) {
      const senderDigits = senderPhone.replace(/\D/g, '');
      const isOwner = msg.fromMe;
      const isMister = mistersSet.has(senderDigits);

      if (!isOwner && !isMister) {
        console.log(`🔒 -> Configuración denegada a +${senderPhone} (no es Míster).`);
        await msg.reply('⛔ No tienes permiso para ejecutar este comando.');
        return;
      }

      if (!groupSettingsMap[groupId]) {
        groupSettingsMap[groupId] = {
          team1: { name: 'EQUIPO BLANCO', emoji: '⚪' },
          team2: { name: 'EQUIPO ROJO', emoji: '🔴' }
        };
      }

      if (trimmed.startsWith('/config-equipos')) {
        const payload = text.replace(/^\/config-equipos\s*/i, '').trim();
        const parts = payload.split(/\s+vs\s+|\s+vs\.\s+/i);
        if (parts.length === 2) {
          const emoji1 = parts[0].match(/\p{Extended_Pictographic}/u);
          if (emoji1) {
            groupSettingsMap[groupId].team1.emoji = emoji1[0];
            parts[0] = parts[0].replace(emoji1[0], '');
          }
          if (parts[0].trim()) {
            groupSettingsMap[groupId].team1.name = parts[0].trim().toUpperCase();
          }

          const emoji2 = parts[1].match(/\p{Extended_Pictographic}/u);
          if (emoji2) {
            groupSettingsMap[groupId].team2.emoji = emoji2[0];
            parts[1] = parts[1].replace(emoji2[0], '');
          }
          if (parts[1].trim()) {
            groupSettingsMap[groupId].team2.name = parts[1].trim().toUpperCase();
          }

          saveGroupSettings(groupSettingsMap);
          const cfg = getGroupTeamConfig(groupId);
          await msg.reply(`⚙️ *Equipos de este grupo configurados*:\n\n1️⃣ ${cfg.team1.emoji} *${cfg.team1.name}*\n2️⃣ ${cfg.team2.emoji} *${cfg.team2.name}*`);
          return;
        }
      }

      const isTeam1 = (
        trimmed.startsWith('/set-team1') ||
        trimmed.startsWith('/set team 1') ||
        trimmed.startsWith('/set team1') ||
        trimmed.startsWith('/equipo1')
      );

      const isTeam2 = (
        trimmed.startsWith('/set-team2') ||
        trimmed.startsWith('/set team 2') ||
        trimmed.startsWith('/set team2') ||
        trimmed.startsWith('/equipo2')
      );

      if (isTeam1 || isTeam2) {
        const teamKey = isTeam1 ? 'team1' : 'team2';
        const teamLabel = isTeam1 ? 'Equipo 1' : 'Equipo 2';
        let rawVal = text.replace(/^\/(set-team[12]|set team [12]|set team[12]|equipo[12]|set-team1-name|set-team2-name|set-team1-icon|set-team2-icon|set team [12] name|set team [12] icon)\s*/i, '').trim();

        const emojiMatch = rawVal.match(/\p{Extended_Pictographic}/u);
        if (emojiMatch) {
          groupSettingsMap[groupId][teamKey].emoji = emojiMatch[0];
          rawVal = rawVal.replace(emojiMatch[0], '').trim();
        }
        if (rawVal) {
          groupSettingsMap[groupId][teamKey].name = rawVal.toUpperCase();
        }

        saveGroupSettings(groupSettingsMap);
        const cfg = getGroupTeamConfig(groupId);
        await msg.reply(`⚙️ *${teamLabel} configurado*: ${cfg[teamKey].emoji} *${cfg[teamKey].name}*`);
        return;
      }

      await msg.reply(`⚙️ *Uso de configuración de equipos*:\n\n• */set-team1 🦁 Los Leones*\n• */set-team2 🐯 Los Tigres*\n• */config-equipos 🦁 Los Leones vs 🐯 Los Tigres*`);
      return;
    }

    // Command: Team balancing
    const isTeamBalanceCommand = (
      trimmed.startsWith('/make-teams') ||
      trimmed.startsWith('/make-team') ||
      trimmed.startsWith('/maketeams') ||
      trimmed.startsWith('/maketeam') ||
      trimmed.startsWith('/equilibrar') ||
      trimmed.startsWith('/hacer-equipos') ||
      trimmed.startsWith('/balance') ||
      trimmed.startsWith('/generar') ||
      trimmed.startsWith('/equipos')
    );

    if (isTeamBalanceCommand) {
      const senderDigits = senderPhone.replace(/\D/g, '');
      const isOwner = msg.fromMe;
      const isMister = mistersSet.has(senderDigits);

      if (!isOwner && !isMister) {
        console.log(`🔒 -> Generar equipos denegado a +${senderPhone} (no es Míster).`);
        await msg.reply('⛔ No tienes permiso para ejecutar este comando.');
        return;
      }

      let fullText = text;

      const hasQuote = msg.hasQuotedMsg || !!(msg._data && msg._data.quotedMsg);
      if (hasQuote) {
        let quotedBody = msg._data?.quotedMsg?.body || msg._data?.quotedMsg?.caption || '';
        if (!quotedBody) {
          try {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg) quotedBody = quotedMsg.body || quotedMsg.caption || '';
          } catch (e) { }
        }
        if (quotedBody) {
          console.log(`💬 -> Cita detectada: "${quotedBody.replace(/\n/g, ' ').substring(0, 50)}..."`);
          fullText = `${text}\n${quotedBody}`;
        }
      }

      const isXL = (
        trimmed.startsWith('/make-teams-xl') ||
        trimmed.startsWith('/make-team-xl') ||
        trimmed.startsWith('/equilibrar-xl') ||
        trimmed.startsWith('/make-teams-12') ||
        trimmed.startsWith('/equilibrar-12')
      );
      const teamSize = isXL ? 12 : 11;

      const cleanText = fullText.replace(/^\/(make-teams-xl|make-team-xl|equilibrar-xl|make-teams-12|equilibrar-12|make-teams|make-team|maketeams|maketeam|equilibrar|hacer-equipos|balance|generar|equipos)\b\s*/i, '').trim();

      const players = parsePlayers(cleanText);
      if (players.length >= 2) {
        console.log(`🤖 -> Comando de equipos detectado con ${players.length} jugadores (${teamSize}v${teamSize}). Equilibrando...`);
        const header = parseHeader(cleanText);
        const balanced = balanceTeams(players, teamSize);
        const teamConfig = getGroupTeamConfig(groupId);

        let reply = `⚽ *FUT Team Balancer*\n`;
        if (header) reply += `📅 ${header}\n`;

        reply += `\n${teamConfig.team1.emoji} *${teamConfig.team1.name}*\n`;
        balanced.team1.forEach(p => { reply += `• *${p.name}*\n`; });

        reply += `\n${teamConfig.team2.emoji} *${teamConfig.team2.name}*\n`;
        balanced.team2.forEach(p => { reply += `• *${p.name}*\n`; });

        if (balanced.reserves.length > 0) {
          reply += `\n⏳ *RESERVAS*\n`;
          balanced.reserves.forEach(p => { reply += `• *${p.name}*\n`; });
        }

        await msg.reply(reply);
        console.log(`✅ -> Equipos generados y respuesta enviada a WhatsApp.`);
      } else {
        await msg.reply('⚽ *FUT Team Balancer*\n\nPor favor, responde a una lista con el comando `/equilibrar` o escribe la lista justo debajo del comando.\nEscribe */ejemplo* para ver cómo formatearlo.');
      }
      return;
    }
  } catch (err) {
    console.error('❌ Error procesando mensaje de WhatsApp:', err);
  }
});

// Graceful shutdown handler
let isShuttingDown = false;
async function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n🛑 Recibida señal de apagado (Ctrl+C). Cerrando bot...');
  process.exit(0);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

client.initialize();
