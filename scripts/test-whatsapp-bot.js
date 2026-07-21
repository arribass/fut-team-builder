/**
 * WhatsApp Bot Simulator Script
 * Run with: node scripts/test-whatsapp-bot.js
 */

async function main() {
  const { parseHeader, parsePlayers, balanceTeams } = await import('../src/lib/balancer.js');

  const sampleList = `Miércoles 18:30 - Campo F11

1. Aranda
2. Patxi
3. Ramon
4. Sergio I
5. Nico
6. Facu
7. kevin
8. Jose Ángel 
9. David gut
10. Julito 
11. Geisler
12. Moncho
13. Max
14. Julián Lemar
15. Andrés 
16. Iñaki DK
17. Jon
18. Rafa L
19. Felipe
20. Sebas
21. Oscar
22. Adrián 
23. Diego
24. Santi
———-
R1. Pablo V
R2. Pierre`;

  function simulateBotResponse(inputMessage, teamSize = 11, orgId = 'Lunes-F11-Madrid') {
    const trimmed = inputMessage.trim().toLowerCase();

    if (trimmed === 'dime tu id de organizacion' || trimmed === 'id') {
      return `🤖 *FUT Balancer Bot*\n\nTu ID de organización configurado es: *${orgId}*`;
    }

    const header = parseHeader(inputMessage);
    const players = parsePlayers(inputMessage);

    if (players.length < 2) {
      return `⚽ *FUT Team Balancer Bot*\n\nNo he detectado suficientes jugadores en tu mensaje.`;
    }

    const balanced = balanceTeams(players, teamSize);

    let reply = `⚽ *FUT Team Balancer*\n`;
    if (header) reply += `📅 ${header}\n`;
    reply += `\n⚪ *EQUIPO BLANCO*\n`;
    balanced.team1.forEach(p => { reply += `• *${p.name}*\n`; });

    reply += `\n🔴 *EQUIPO ROJO*\n`;
    balanced.team2.forEach(p => { reply += `• *${p.name}*\n`; });

    if (balanced.reserves.length > 0) {
      reply += `\n⏳ *RESERVAS*\n`;
      balanced.reserves.forEach(p => { reply += `• *${p.name}*\n`; });
    }

    return reply;
  }

  console.log("==========================================");
  console.log("🤖 PROBANDO COMANDO 1: 'dime tu id de organizacion'");
  console.log("==========================================");
  console.log(simulateBotResponse("dime tu id de organizacion"));
  console.log("\n==========================================");
  console.log("⚽ PROBANDO COMANDO 2: Procesar Lista de WhatsApp");
  console.log("==========================================");
  console.log(simulateBotResponse(sampleList, 11));
  console.log("==========================================\n");
}

main().catch(console.error);
