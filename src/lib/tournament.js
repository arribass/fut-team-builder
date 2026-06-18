/**
 * Generates a Round Robin schedule using the Circle/Rotation method.
 * @param {string[]} teams Array of team names
 * @returns {Array<{roundNumber: number, matches: Array<{id: string, home: string, away: string, homeScore: string, awayScore: string, played: boolean}>}>}
 */
export function generateRoundRobin(teams) {
  if (!teams || teams.length < 2) return [];

  let list = [...teams];
  // If odd number of teams, add a dummy team for byes
  const isOdd = list.length % 2 !== 0;
  if (isOdd) {
    list.push('DESCANSA');
  }

  const numTeams = list.length;
  const numRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const rounds = [];

  for (let round = 0; round < numRounds; round++) {
    const roundMatches = [];
    for (let match = 0; match < matchesPerRound; match++) {
      const home = list[match];
      const away = list[numTeams - 1 - match];

      // Only schedule the match if neither team is "DESCANSA"
      if (home !== 'DESCANSA' && away !== 'DESCANSA') {
        roundMatches.push({
          id: `rr-${round}-${match}`,
          home,
          away,
          homeScore: '',
          awayScore: '',
          played: false
        });
      }
    }

    rounds.push({
      roundNumber: round + 1,
      matches: roundMatches
    });

    // Rotate teams: keep first team fixed, rotate rest cyclically
    list = [list[0], list[numTeams - 1], ...list.slice(1, numTeams - 1)];
  }

  return rounds;
}

/**
 * Calculates league standings from a list of rounds and teams.
 * @param {Array} rounds Round Robin rounds containing matches
 * @param {string[]} teams List of teams in the league
 * @returns {Array<{team: string, played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number, goalDifference: number, points: number}>}
 */
export function calculateStandings(rounds, teams) {
  // Initialize standings stats for each team (excluding "DESCANSA" if any)
  const standingsMap = {};
  teams.forEach(team => {
    if (team !== 'DESCANSA') {
      standingsMap[team] = {
        team,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      };
    }
  });

  // Accumulate stats from played matches
  rounds.forEach(r => {
    r.matches.forEach(m => {
      const hScore = parseInt(m.homeScore, 10);
      const aScore = parseInt(m.awayScore, 10);

      // Only count matches that have valid scores entered
      if (!isNaN(hScore) && !isNaN(aScore)) {
        const homeStats = standingsMap[m.home];
        const awayStats = standingsMap[m.away];

        if (homeStats && awayStats) {
          homeStats.played += 1;
          awayStats.played += 1;

          homeStats.goalsFor += hScore;
          homeStats.goalsAgainst += aScore;
          awayStats.goalsFor += aScore;
          awayStats.goalsAgainst += hScore;

          if (hScore > aScore) {
            homeStats.won += 1;
            homeStats.points += 3;
            awayStats.lost += 1;
          } else if (aScore > hScore) {
            awayStats.won += 1;
            awayStats.points += 3;
            homeStats.lost += 1;
          } else {
            homeStats.drawn += 1;
            homeStats.points += 1;
            awayStats.drawn += 1;
            awayStats.points += 1;
          }
        }
      }
    });
  });

  // Calculate goal differences and convert to array
  const standings = Object.values(standingsMap).map(stats => {
    stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    return stats;
  });

  // Sort standings: Points -> Goal Difference -> Goals For -> Alphabetical
  standings.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    return a.team.localeCompare(b.team);
  });

  return standings;
}

/**
 * Initializes a Single Elimination bracket.
 * Pads teams up to the nearest power of 2 using "BYE" and schedules Round 1.
 * Automatically advances teams paired with a "BYE".
 * @param {string[]} teams Array of team names
 * @returns {Array<{roundName: string, matches: Array<{id: string, home: string|null, away: string|null, homeScore: string, awayScore: string, played: boolean, winner: string|null, penaltyWinner: string|null}>}>}
 */
export function generateSingleElimination(teams) {
  if (!teams || teams.length < 2) return [];

  const n = teams.length;
  // Find nearest power of 2 greater than or equal to n
  let p = 2;
  while (p < n) {
    p *= 2;
  }

  // Pad the team list with "BYE"
  const paddedTeams = [...teams, ...Array(p - n).fill('BYE')];

  // Number of rounds is log2(p)
  const numRounds = Math.log2(p);
  const rounds = [];

  // 1. Construct round names
  const getRoundName = (matchesCount) => {
    if (matchesCount === 1) return 'Final';
    if (matchesCount === 2) return 'Semifinales';
    if (matchesCount === 4) return 'Cuartos de final';
    if (matchesCount === 8) return 'Octavos de final';
    return `Ronda de ${matchesCount * 2}`;
  };

  // 2. Build empty structures for all rounds
  let currentMatchesCount = p / 2;
  for (let r = 0; r < numRounds; r++) {
    const roundMatches = [];
    for (let m = 0; m < currentMatchesCount; m++) {
      roundMatches.push({
        id: `se-${r}-${m}`,
        home: null,
        away: null,
        homeScore: '',
        awayScore: '',
        played: false,
        winner: null,
        penaltyWinner: null
      });
    }
    rounds.push({
      roundName: getRoundName(currentMatchesCount),
      matches: roundMatches
    });
    currentMatchesCount /= 2;
  }

  // 3. Populate Round 0 matches
  // We pair teams sequentially. To balance it: e.g. team 0 vs team 1, etc.
  const r0Matches = rounds[0].matches;
  for (let m = 0; m < r0Matches.length; m++) {
    r0Matches[m].home = paddedTeams[2 * m];
    r0Matches[m].away = paddedTeams[2 * m + 1];

    // If one of the slots is a "BYE", advance the other team automatically
    if (r0Matches[m].home === 'BYE') {
      r0Matches[m].played = true;
      r0Matches[m].winner = r0Matches[m].away;
      r0Matches[m].homeScore = '-';
      r0Matches[m].awayScore = 'W';
    } else if (r0Matches[m].away === 'BYE') {
      r0Matches[m].played = true;
      r0Matches[m].winner = r0Matches[m].home;
      r0Matches[m].homeScore = 'W';
      r0Matches[m].awayScore = '-';
    }
  }

  // 4. Propagate automatic BYE winners forward to Round 1 immediately
  let finalRounds = rounds;
  for (let m = 0; m < r0Matches.length; m++) {
    if (r0Matches[m].winner) {
      finalRounds = propagateBracketWinner(finalRounds, 0, m, r0Matches[m].winner);
    }
  }

  return finalRounds;
}

/**
 * Propagates the winner of a single elimination match to the next round.
 * Handles resetting/clearing downstream matches recursively if the winner changes.
 * @param {Array} rounds Current bracket rounds state
 * @param {number} roundIndex Index of the completed round
 * @param {number} matchIndex Index of the completed match
 * @param {string} winner Name of the winning team
 * @returns {Array} Updated rounds state
 */
export function propagateBracketWinner(rounds, roundIndex, matchIndex, winner) {
  const nextRoundIndex = roundIndex + 1;
  if (nextRoundIndex >= rounds.length) {
    // This was the Final, no next round to propagate to!
    return rounds;
  }

  const nextMatchIndex = Math.floor(matchIndex / 2);
  const isHome = matchIndex % 2 === 0;

  const newRounds = rounds.map((r, rIdx) => {
    if (rIdx !== nextRoundIndex) return r;

    const newMatches = r.matches.map((m, mIdx) => {
      if (mIdx !== nextMatchIndex) return m;

      const updatedMatch = { ...m };
      if (isHome) {
        if (updatedMatch.home !== winner) {
          updatedMatch.home = winner;
          // Reset score and winner of next match if team changes
          updatedMatch.homeScore = '';
          updatedMatch.awayScore = '';
          updatedMatch.played = false;
          updatedMatch.winner = null;
          updatedMatch.penaltyWinner = null;
        }
      } else {
        if (updatedMatch.away !== winner) {
          updatedMatch.away = winner;
          // Reset score and winner of next match if team changes
          updatedMatch.homeScore = '';
          updatedMatch.awayScore = '';
          updatedMatch.played = false;
          updatedMatch.winner = null;
          updatedMatch.penaltyWinner = null;
        }
      }
      return updatedMatch;
    });

    return { ...r, matches: newMatches };
  });

  // If the next match's winner was reset, recursively clear all downstream matches
  const nextMatch = newRounds[nextRoundIndex].matches[nextMatchIndex];
  if (!nextMatch.winner) {
    return clearDownstreamBracket(newRounds, nextRoundIndex, nextMatchIndex);
  }

  return newRounds;
}

/**
 * Recursively clears downstream matches when a predecessor team is modified or cleared.
 * @param {Array} rounds Bracket rounds state
 * @param {number} roundIndex Round index that was cleared
 * @param {number} matchIndex Match index that was cleared
 * @returns {Array} Updated rounds state
 */
export function clearDownstreamBracket(rounds, roundIndex, matchIndex) {
  const nextRoundIndex = roundIndex + 1;
  if (nextRoundIndex >= rounds.length) return rounds;

  const nextMatchIndex = Math.floor(matchIndex / 2);
  const isHome = matchIndex % 2 === 0;

  const newRounds = rounds.map((r, rIdx) => {
    if (rIdx !== nextRoundIndex) return r;

    const newMatches = r.matches.map((m, mIdx) => {
      if (mIdx !== nextMatchIndex) return m;

      const updatedMatch = { ...m };
      if (isHome) {
        updatedMatch.home = null;
      } else {
        updatedMatch.away = null;
      }
      updatedMatch.homeScore = '';
      updatedMatch.awayScore = '';
      updatedMatch.played = false;
      updatedMatch.winner = null;
      updatedMatch.penaltyWinner = null;
      return updatedMatch;
    });

    return { ...r, matches: newMatches };
  });

  return clearDownstreamBracket(newRounds, nextRoundIndex, nextMatchIndex);
}
