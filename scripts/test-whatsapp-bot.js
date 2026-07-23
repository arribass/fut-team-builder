/**
 * WhatsApp Bot Simulator Script
 * Run with: node scripts/test-whatsapp-bot.js
 */

async function main() {
  const { parseHeader, parsePlayers, balanceTeams } = await import('../src/lib/balancer.js');

  const sampleList = `Miércoles 18:30 - Campo UNAV

1. Juan
2. Carlos
3. Alejandro
4. Sergio
5. Nico
6. Fernando
7. Mario
8. José
9. David
10. Julio
11. Lucas
12. Manuel
13. Mateo
14. Julián
15. Andrés
16. Iñaki
17. Jon
18. Rafael
19. Felipe
20. Sebastián
21. Óscar
22. Adrián
23. Diego
24. Santiago
———-
R1. Pablo
R2. Pedro`;

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
