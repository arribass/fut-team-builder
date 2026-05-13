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
    
    // If it starts with a number (like "1. ") or "R1", it's likely a player
    if (trimmed.match(/^([0-9]|R[0-9])/i)) break;
    
    // If it's a separator, skip it but it might be the end of the header
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

    // Skip common date/time patterns if they don't look like players
    // e.g. "Miércoles 15 abril", "F11 a las 18.00"
    // Only skip if it doesn't start with a player prefix
    if (!trimmed.match(/^([0-9]|R[0-9])/i)) {
      if (trimmed.match(/^(lunes|martes|miércoles|jueves|viernes|sábado|domingo)/i)) return;
      if (trimmed.match(/hora|hoy/i)) return;
    }

    // Detect reserves
    const isReserve = trimmed.match(/^(R[0-9]|Reserva)/i) !== null;

    // Clean name: remove "1. ", "R1. ", etc. and content in parentheses
    let name = trimmed
      .replace(/^[0-9]+[\.\s-]+/, '') // remove leading counters like "1. "
      .replace(/^(R[0-9]+|Reserva)[\.\s-]+/i, '') // remove reserve prefix
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
 * @returns {{team1: string[], team2: string[], reserves: string[]}}
 */
export function balanceTeams(players) {
  // Separate active players and reserves
  const activePlayers = players.filter(p => !p.isReserve);
  const reserves = players.filter(p => p.isReserve);

  // Shuffle active players to avoid order bias
  const shuffled = [...activePlayers].sort(() => Math.random() - 0.5);

  // Group by position and side
  const groups = {};
  shuffled.forEach(p => {
    const key = `${p.position || 'ANY'}-${p.side || 'ANY'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });

  const team1 = [];
  const team2 = [];
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

  return { team1, team2, reserves };
}

