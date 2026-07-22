/**
 * Extracts a header (date/location) from the top of the text.
 * @param {string} text 
 * @returns {string}
 */
export function parseHeader(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const headerLines = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Stop if we hit a numbered player line or a team/category header line
    if (trimmed.match(/^([0-9]|R[0-9]|R[\.\s]|Reserva)/i)) break;
    if (trimmed.match(/^(blancos|rojos|equipo|equipos|titulares|suplentes|reservas)\b/i)) break;
    
    // If it's a separator, skip it
    if (trimmed.match(/^[—\-\._\*]+$/)) continue;
    
    headerLines.push(trimmed);
  }
  
  return headerLines.join(' • ');
}

/**
 * Parses a string of player names into an array of player objects.
 * Handles formats like:
 * - 1. Name
 * - Name
 * - R1. Name (marks as reserve)
 * @param {string} text 
 * @returns {Array<{name: string, isReserve: boolean}>}
 */
export function parsePlayers(text) {
  if (!text) return [];

  const lines = text.split('\n');
  const players = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Skip separators like "———-" or "****"
    if (trimmed.match(/^[—\-\._\*]+$/)) return;

    // Skip category/team headers (e.g. "Blancos ⚪️⚪️⚪️", "Rojos 🔴🔴", "Equipo 1", "Reservas", "Suplentes", "Blancos:", "Rojos:")
    if (trimmed.match(/^(blancos|rojos|equipo\s*[0-9]*|equipos|titulares|suplentes|reservas)\b/i)) return;

    // Skip common date/time patterns if they don't look like players
    // e.g. "Miércoles 15 abril", "F11 a las 18.00"
    if (!trimmed.match(/^([0-9]|R[0-9]|R[\.\s]|Reserva)/i)) {
      if (trimmed.match(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i)) return;
      if (trimmed.match(/hora|hoy/i)) return;
    }

    // Detect reserves (e.g. R. Patxi, R Alberto, R1. Pablo, Reserva Patxi)
    const isReserve = trimmed.match(/^(R[0-9]+|R[\.\s]|Reserva)/i) !== null;

    // Clean name: remove "1. ", reserve prefixes, etc. and content in parentheses
    let name = trimmed
      .replace(/^[0-9]+[\.\s-]+/, '') // remove leading counters like "1. "
      .replace(/^(R[0-9]+|R\.|R\s+|Reserva)[\.\s-]*/i, '') // remove reserve prefix safely without matching normal R names
      .replace(/\(.*?\)/g, '') // remove content in parentheses
      .replace(/[.,\s]+$/, '') // remove trailing punctuation and spaces
      .replace(/\s+/g, ' ') // collapse multiple spaces
      .trim();

    if (name && name.length > 1) { // Basic check to avoid stray chars
      players.push({ name, isReserve, position: null, side: null });
    }
  });

  return players;
}

/**
 * Splits players into two balanced teams.
 * For MVP, it alternate between teams to ensure equal numbers.
 * @param {Array<{name: string, isReserve: boolean}>} players 
 * @param {number} [teamSize=11]
 * @returns {{team1: string[], team2: string[], reserves: string[]}}
 */
export function balanceTeams(players, teamSize = 11) {
  // Separate active players and reserves
  const activePlayers = players.filter(p => !p.isReserve);
  const reserves = [...players.filter(p => p.isReserve)];

  // Shuffle active players to avoid order bias
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  // Group by position and side
  const groups = {};
  shuffled.forEach(p => {
    const key = `${p.position || 'ANY'}-${p.side || 'ANY'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  let team1 = [];
  let team2 = [];
  let turn = 0; // 0 for team1, 1 for team2

  const sortedKeys = Object.keys(groups).sort();
  
  sortedKeys.forEach(key => {
    groups[key].forEach(p => {
      if (turn === 0) {
        team1.push(p);
        turn = 1;
      } else {
        team2.push(p);
        turn = 0;
      }
    });
  });

  // Cap the teams to teamSize and send excess to reserves
  if (teamSize && teamSize > 0) {
    const excessTeam1 = team1.slice(teamSize);
    const excessTeam2 = team2.slice(teamSize);

    team1 = team1.slice(0, teamSize);
    team2 = team2.slice(0, teamSize);

    excessTeam1.forEach(p => {
      reserves.push({ ...p, isReserve: true, position: null, side: null, slotId: undefined });
    });
    excessTeam2.forEach(p => {
      reserves.push({ ...p, isReserve: true, position: null, side: null, slotId: undefined });
    });
  }

  return { team1, team2, reserves };
}

