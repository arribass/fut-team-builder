import { parseHeader, parsePlayers, balanceTeams } from '@/lib/balancer';

const TEAM_EMOJIS = {
  white: { emoji: '⚪', name: 'EQUIPO BLANCO' },
  red: { emoji: '🔴', name: 'EQUIPO ROJO' },
  blue: { emoji: '🔵', name: 'EQUIPO AZUL' },
  yellow: { emoji: '🟡', name: 'EQUIPO AMARILLO' },
  green: { emoji: '🟢', name: 'EQUIPO VERDE' },
  black: { emoji: '🖤', name: 'EQUIPO NEGRO' },
  orange: { emoji: '🟠', name: 'EQUIPO NARANJA' },
  purple: { emoji: '🟣', name: 'EQUIPO MORADO' },
  cyan: { emoji: '🩵', name: 'EQUIPO CELESTE' },
  pink: { emoji: '🩷', name: 'EQUIPO ROSA' },
};

/**
 * Handles Meta Cloud API Webhook Verification GET requests
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fut_balancer_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return Response.json({
    status: 'ok',
    service: 'FUT Team Balancer WhatsApp Bot API',
    instructions: 'Envía un POST con { "message": "tu lista de jugadores..." } para procesar un equipo.'
  });
}

/**
 * Handles incoming WhatsApp messages via Webhook or direct JSON API
 */
export async function POST(request) {
  try {
    const body = await request.json();

    // Support both Meta Cloud API webhook structure and direct JSON { message, teamSize, orgId }
    let messageText = '';
    let senderId = 'user';

    if (body.message) {
      messageText = body.message;
    } else if (body.entry && body.entry[0]?.changes[0]?.value?.messages[0]) {
      const msg = body.entry[0].changes[0].value.messages[0];
      messageText = msg.text?.body || '';
      senderId = msg.from || 'user';
    }

    const teamSize = Number(body.teamSize) || 11;
    const orgId = body.orgId || 'default';
    const team1ColorKey = body.team1Color || 'white';
    const team2ColorKey = body.team2Color || 'red';

    const t1Obj = TEAM_EMOJIS[team1ColorKey] || TEAM_EMOJIS.white;
    const t2Obj = TEAM_EMOJIS[team2ColorKey] || TEAM_EMOJIS.red;

    const trimmed = messageText.trim().toLowerCase();
    let replyText = '';
    let actionExecuted = 'balance';

    const isInitCommand = (
      trimmed === '/fut-team-balancer init' ||
      trimmed === '/init' ||
      trimmed === '/vincular' ||
      trimmed === 'dime tu id de organizacion' ||
      trimmed === 'id' ||
      trimmed === '/id'
    );

    if (isInitCommand) {
      actionExecuted = 'get_org_id';
      replyText = `⚽ *FUT Team Balancer Bot Inicializado* ⚽\n\n🔑 *ID de Organización*: *${orgId}*\n\n✅ *Grupo vinculado.* Usa */equilibrar* o */make-team* para generar equipos.`;
    } else if (trimmed === '/ayuda' || trimmed === '/help' || trimmed === '/start') {
      actionExecuted = 'help';
      replyText = `⚽ *FUT Team Balancer Bot* ⚽\n\nComandos disponibles:\n\n1️⃣ *Equilibrar Equipos*:\nEscribe */equilibrar* o */make-team* junto con la lista de jugadores.\n\n2️⃣ *Ver ID de Grupo*:\nEscribe *dime tu id de organizacion* o */id*.\n\n3️⃣ *Ver un ejemplo*:\nEscribe */ejemplo* para ver una lista para probar.`;
    } else if (trimmed.startsWith('/perra')) {
      actionExecuted = 'perra';
      const perraList = [
        '¡Tú más! 🐶',
        '¡Guau guau! 🐕',
        '¡Eso lo serás tú! 😜',
        '¡Perra tú, mi reina! 👑💅',
        '¡Respeto con el Míster del equipo! ⚽',
        '¡A ti te quería yo ver tirando un penalti! ⚽💨',
        '¡Tú sí que eres perra vieja jugando al fútbol! ⚽🔥',
      ];
      replyText = perraList[Math.floor(Math.random() * perraList.length)];
    } else if (trimmed.startsWith('/ejemplo')) {
      actionExecuted = 'sample';
      replyText = `/equilibrar\nMiércoles 18:30 - Campo F11\n\n1. Aranda\n2. Patxi\n3. Ramon\n4. Sergio I\n5. Nico\n6. Facu\n7. Kevin\n8. Jose Ángel\n9. David gut\n10. Julito\n11. Geisler\n12. Moncho\n13. Max\n14. Julián Lemar\n15. Andrés\n16. Iñaki DK\n17. Jon\n18. Rafa L\n19. Felipe\n20. Sebas\n———-\nR1. Pablo V\nR2. Pierre`;
    } else if (
      trimmed.startsWith('/equilibrar') ||
      trimmed.startsWith('/make-team') ||
      trimmed.startsWith('/maketeam') ||
      trimmed.startsWith('/hacer-equipos') ||
      trimmed.startsWith('/balance') ||
      trimmed.startsWith('/generar') ||
      trimmed.startsWith('/equipos')
    ) {
      const cleanText = messageText.replace(/^\/(equilibrar|make-team|maketeam|hacer-equipos|balance|generar|equipos)\b\s*/i, '').trim();
      const matchHeader = parseHeader(cleanText);
      const players = parsePlayers(cleanText);

      if (players.length < 2) {
        actionExecuted = 'invalid_input';
        replyText = `⚽ *FUT Team Balancer Bot*\n\nPor favor, añade la lista de jugadores debajo del comando \`/equilibrar\`.\nEscribe */ejemplo* para ver cómo formatearlo.`;
      } else {
        const balanced = balanceTeams(players, teamSize);

        let reply = `⚽ *FUT Team Balancer*\n`;
        if (matchHeader) {
          reply += `📅 ${matchHeader}\n`;
        }
        reply += `\n`;

        // Team 1
        reply += `${t1Obj.emoji} *${t1Obj.name}*\n`;
        balanced.team1.forEach(p => {
          reply += `• *${p.name}*\n`;
        });

        // Team 2
        reply += `\n${t2Obj.emoji} *${t2Obj.name}*\n`;
        balanced.team2.forEach(p => {
          reply += `• *${p.name}*\n`;
        });

        // Reserves
        if (balanced.reserves.length > 0) {
          reply += `\n⏳ *RESERVAS*\n`;
          balanced.reserves.forEach(p => {
            reply += `• *${p.name}*\n`;
          });
        }

        replyText = reply;
      }
    }

    return Response.json({
      success: true,
      senderId,
      actionExecuted,
      reply: replyText
    });
  } catch (error) {
    console.error('Error in WhatsApp API route:', error);
    return Response.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
