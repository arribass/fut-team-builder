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

    if (trimmed === 'dime tu id de organizacion' || trimmed === 'id') {
      actionExecuted = 'get_org_id';
      replyText = `🤖 *FUT Balancer Bot*\n\nTu ID de organización configurado es: *${orgId}*`;
    } else if (trimmed === 'ayuda' || trimmed === 'help' || trimmed === '/help') {
      actionExecuted = 'help';
      replyText = `⚽ *FUT Team Balancer Bot*\n\n*Comandos disponibles:*\n• Pega una lista de jugadores para equilibrar automáticamente dos equipos.\n• *dime tu id de organizacion*: Muestra el ID de tu grupo registrado.`;
    } else {
      const matchHeader = parseHeader(messageText);
      const players = parsePlayers(messageText);

      if (players.length < 2) {
        actionExecuted = 'invalid_input';
        replyText = `⚽ *FUT Team Balancer Bot*\n\nNo he detectado suficientes jugadores en tu mensaje.\n\n*Ejemplo de lista:*\nMiércoles 18:00\n1. Aranda\n2. Patxi\n3. Ramon\n4. Sergio`;
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
