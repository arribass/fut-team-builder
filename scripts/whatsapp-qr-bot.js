/**
 * WhatsApp QR Bot Runner (using whatsapp-web.js)
 * 
 * Instructions:
 * 1. Install dependencies: npm install whatsapp-web.js qrcode-terminal
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

client.on('ready', () => {
  const phone = client.info?.wid?.user || 'Desconocido';
  const name = client.info?.pushname || 'Usuario';
  console.log('\n======================================================');
  console.log('🎉 ¡BOT DE FUT BALANCER CONECTADO CON ÉXITO!');
  console.log(`📱 Número de WhatsApp conectado: +${phone} (${name})`);
  console.log('======================================================');
  console.log('👉 Puedes enviarle mensajes a este número (+' + phone + ') desde otro móvil,');
  console.log('👉 O probar tú mismo abriendo el chat "Mensajes a ti mismo" en tu propio WhatsApp.\n');
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
    const isSelfChat = !isGroup && (msg.from === msg.to || (myWid && (msg.from === myWid || msg.to === myWid)));

    let recipientName = (msg.to || '').split('@')[0];
    try {
      const chat = await msg.getChat();
      if (chat && chat.name) recipientName = chat.name;
    } catch (e) {
      // Ignore getChat failure on temporary/status messages
    }

    const senderPhone = (msg.author || msg.from || '').split('@')[0].split('-')[0];
    
    let chatType = '[CHAT PRIVADO]';
    if (isSelfChat) chatType = '[PROPIO CHAT (Mensajes a ti mismo)]';
    else if (isGroup) chatType = `[GRUPO: ${recipientName}]`;

    // Print rich debug info for terminal
    console.log(`\n📩 Mensaje recibido:`);
    console.log(`   • Remitente: ${msg.fromMe ? 'Tú (' + senderPhone + ')' : '+' + senderPhone}`);
    console.log(`   • Chat/Destinatario: ${recipientName} ${chatType}`);
    console.log(`   • Texto: "${text.replace(/\n/g, ' ')}"`);

    // STRICT COMMAND FILTERING: Ignore any message that does NOT start with a slash or explicit ID query
    const isExplicitSlashCommand = trimmed.startsWith('/') || trimmed === 'dime tu id de organizacion' || trimmed === 'id';

    if (!isExplicitSlashCommand) {
      console.log(`ℹ️ -> Mensaje ignorado (no contiene comando explícito con '/').`);
      return;
    }

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

    // BLOCK ALL COMMANDS IF GROUP IS NOT INITIALIZED FIRST
    if (!initializedGroups.has(groupId) && isGroup) {
      console.log(`🔒 -> El grupo '${groupName}' (${groupId}) NO ha sido inicializado con '/fut-team-balancer init'. Comando ignorado.`);
      return;
    }

    // Command 2: Ayuda
    if (trimmed === '/ayuda' || trimmed === '/help' || trimmed === '/start') {
      console.log('🤖 -> Respondiendo comando de AYUDA');
      const helpMsg = `⚽ *FUT Team Balancer Bot* ⚽\n\nComandos disponibles:\n\n1️⃣ *Equilibrar Equipos*:\nEscribe */equilibrar* o */make-team* junto con la lista de jugadores.\n\n2️⃣ *Ver ID de Grupo*:\nEscribe *dime tu id de organizacion* o */id*.\n\n3️⃣ *Ver un ejemplo*:\nEscribe */ejemplo* para ver una lista para probar.`;
      await msg.reply(helpMsg);
      return;
    }

    // Command 3: Perra
    if (trimmed.startsWith('/perra')) {
      console.log('🤖 -> Respondiendo comando /perra');
      const randomResponse = PERRA_RESPONSES[Math.floor(Math.random() * PERRA_RESPONSES.length)];
      await msg.reply(randomResponse);
      return;
    }

    // Command 4: Lola
    if (trimmed.startsWith('/lola')) {
      console.log('🤖 -> Respondiendo comando /lola');
      const possibleDirs = [
        path.join(process.cwd(), 'public', 'assets', 'lola'),
        path.join(process.cwd(), 'src', 'assets', 'lola'),
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
        await msg.reply('🐶 No encontré fotos en `public/assets/lola` ni en `src/assets/lola`. ¡Añade fotos de Lola ahí para que el bot las envíe!');
        return;
      }

      const randomFilePath = foundFiles[Math.floor(Math.random() * foundFiles.length)];
      const media = MessageMedia.fromFilePath(randomFilePath);
      await msg.reply(media);
      console.log(`✅ -> Enviada foto de Lola (${path.basename(randomFilePath)}) desde ${activeDir}`);
      return;
    }

    // Command 5: Ejemplo
    if (trimmed.startsWith('/ejemplo')) {
      console.log('🤖 -> Enviando lista de EJEMPLO');
      const sampleList = `/equilibrar\nMiércoles 18:30 - Campo F11\n\n1. Aranda\n2. Patxi\n3. Ramon\n4. Sergio I\n5. Nico\n6. Facu\n7. Kevin\n8. Jose Ángel\n9. David gut\n10. Julito\n11. Geisler\n12. Moncho\n13. Max\n14. Julián Lemar\n15. Andrés\n16. Iñaki DK\n17. Jon\n18. Rafa L\n19. Felipe\n20. Sebas\n———-\nR1. Pablo V\nR2. Pierre`;
      await msg.reply(sampleList);
      return;
    }

    // Command 6: Config Teams (/set-team1, /set-team2, /config-equipos, /equipo1, /equipo2)
    if (
      trimmed.startsWith('/set-team') ||
      trimmed.startsWith('/set team') ||
      trimmed.startsWith('/config-equipos') ||
      trimmed.startsWith('/equipo1') ||
      trimmed.startsWith('/equipo2')
    ) {
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

    // Command 7: Team balancing (/equilibrar, /make-team, /hacer-equipos, /balance, /generar, /equipos)
    const isTeamBalanceCommand = (
      trimmed.startsWith('/equilibrar') ||
      trimmed.startsWith('/make-team') ||
      trimmed.startsWith('/maketeam') ||
      trimmed.startsWith('/hacer-equipos') ||
      trimmed.startsWith('/balance') ||
      trimmed.startsWith('/generar') ||
      trimmed.startsWith('/equipos')
    );

    if (isTeamBalanceCommand) {
      let fullText = text;

      if (msg.hasQuotedMsg) {
        let quotedBody = msg._data?.quotedMsg?.body || msg._data?.quotedMsg?.caption || '';
        if (!quotedBody) {
          try {
            const quotedMsg = await msg.getQuotedMessage();
            if (quotedMsg) quotedBody = quotedMsg.body || quotedMsg.caption || '';
          } catch (e) {
            // Ignore Puppeteer fetch errors for uncached messages
          }
        }
        if (quotedBody) {
          console.log(`💬 -> Cita detectada: "${quotedBody.replace(/\n/g, ' ').substring(0, 50)}..."`);
          fullText = `${text}\n${quotedBody}`;
        }
      }

      const cleanText = fullText.replace(/^\/(equilibrar|make-team|maketeam|hacer-equipos|balance|generar|equipos)\b\s*/i, '').trim();

      const players = parsePlayers(cleanText);
      if (players.length >= 2) {
        console.log(`🤖 -> Comando de equipos detectado con ${players.length} jugadores. Equilibrando...`);
        const header = parseHeader(cleanText);
        const balanced = balanceTeams(players, 11);
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

    console.log(`ℹ️ -> Comando '${trimmed.split(' ')[0]}' no reconocido.`);
  } catch (err) {
    console.error('❌ Error procesando mensaje de WhatsApp:', err);
  }
});

client.initialize();
