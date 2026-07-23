'use client';

import { useState, useEffect } from 'react';
import { 
  generateRoundRobin, 
  calculateStandings, 
  generateSingleElimination, 
  propagateBracketWinner 
} from '@/lib/tournament';

export default function TournamentGenerator({ initialTeams }) {
  const [inputTeamsText, setInputTeamsText] = useState('');
  const [tournamentType, setTournamentType] = useState('single_elimination'); // 'single_elimination' | 'round_robin'
  const [activeTournament, setActiveTournament] = useState(false);
  const [teams, setTeams] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [standings, setStandings] = useState([]);
  const [champion, setChampion] = useState(null);
  const [whatsappCopied, setWhatsappCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Prepopulate custom teams example
  useEffect(() => {
    setInputTeamsText(
      "Real Madrid\nBarcelona\nAtlético Madrid\nBayern Múnich\nManchester City\nPSG"
    );
  }, []);

  // Recalculate standings when round robin matches are scored
  useEffect(() => {
    if (activeTournament && tournamentType === 'round_robin') {
      const stats = calculateStandings(rounds, teams);
      setStandings(stats);

      // Check if all matches are played to determine if there's a leader/champion
      const totalMatches = rounds.reduce((acc, r) => acc + r.matches.length, 0);
      const playedMatches = rounds.reduce(
        (acc, r) => acc + r.matches.filter(m => m.played).length, 
        0
      );

      if (totalMatches > 0 && playedMatches === totalMatches && stats.length > 0) {
        setChampion(stats[0].team);
      } else {
        setChampion(null);
      }
    }
  }, [rounds, activeTournament, tournamentType, teams]);

  // Load from balanced teams from Tab 1
  const handleLoadFromBalancer = (mode) => {
    if (!initialTeams || (!initialTeams.team1.length && !initialTeams.team2.length)) {
      setErrorMessage("No hay equipos generados en el Equilibrador. Genera equipos primero.");
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    if (mode === 'teams') {
      // Option 1: Custom team names & colors from balancer
      const balancerTeams = [];
      if (initialTeams.team1 && initialTeams.team1.length > 0) balancerTeams.push(initialTeams.team1Name || "⚪ Equipo Blanco");
      if (initialTeams.team2 && initialTeams.team2.length > 0) balancerTeams.push(initialTeams.team2Name || "🔴 Equipo Rojo");
      setInputTeamsText(balancerTeams.join('\n'));
    } else if (mode === 'players') {
      // Option 2: Individual player names (1vs1 tournament)
      const allPlayers = [
        ...initialTeams.team1.map(p => p.name),
        ...initialTeams.team2.map(p => p.name)
      ];
      setInputTeamsText(allPlayers.join('\n'));
    }
  };

  const handleStartTournament = () => {
    const list = inputTeamsText
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (list.length < 2) {
      setErrorMessage("Se necesitan al menos 2 equipos para comenzar un torneo.");
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    setTeams(list);
    setChampion(null);

    if (tournamentType === 'round_robin') {
      const generatedRounds = generateRoundRobin(list);
      setRounds(generatedRounds);
    } else {
      const generatedRounds = generateSingleElimination(list);
      setRounds(generatedRounds);

      // Check if bracket is already completed (e.g. if all matches advanced automatically)
      const lastRound = generatedRounds[generatedRounds.length - 1];
      if (lastRound && lastRound.matches.length === 1 && lastRound.matches[0].winner) {
        setChampion(lastRound.matches[0].winner);
      }
    }

    setActiveTournament(true);
  };

  const handleScoreChange = (roundIdx, matchIdx, side, value) => {
    // Keep raw string to let users backspace, but parse for calculations
    const updatedRounds = rounds.map((r, rIdx) => {
      if (rIdx !== roundIdx) return r;

      const updatedMatches = r.matches.map((m, mIdx) => {
        if (mIdx !== matchIdx) return m;

        const updatedMatch = { ...m };
        if (side === 'home') {
          updatedMatch.homeScore = value;
        } else {
          updatedMatch.awayScore = value;
        }

        const hScore = parseInt(updatedMatch.homeScore, 10);
        const aScore = parseInt(updatedMatch.awayScore, 10);

        if (!isNaN(hScore) && !isNaN(aScore)) {
          updatedMatch.played = true;

          if (tournamentType === 'single_elimination') {
            if (hScore > aScore) {
              updatedMatch.winner = updatedMatch.home;
              updatedMatch.penaltyWinner = null;
            } else if (aScore > hScore) {
              updatedMatch.winner = updatedMatch.away;
              updatedMatch.penaltyWinner = null;
            } else {
              // Draw requires penalty resolution
              updatedMatch.winner = updatedMatch.penaltyWinner || null;
            }
          }
        } else {
          updatedMatch.played = false;
          if (tournamentType === 'single_elimination') {
            updatedMatch.winner = null;
            updatedMatch.penaltyWinner = null;
          }
        }

        return updatedMatch;
      });

      return { ...r, matches: updatedMatches };
    });

    setRounds(updatedRounds);

    // If it's single elimination and we determined a winner, propagate it!
    if (tournamentType === 'single_elimination') {
      const match = updatedRounds[roundIdx].matches[matchIdx];
      let newRounds = updatedRounds;

      if (match.winner) {
        newRounds = propagateBracketWinner(updatedRounds, roundIdx, matchIdx, match.winner);
        setRounds(newRounds);
      }

      // Check if final round is completed to set Champion
      const finalRoundIdx = newRounds.length - 1;
      const finalMatch = newRounds[finalRoundIdx]?.matches[0];
      if (finalMatch && finalMatch.winner) {
        setChampion(finalMatch.winner);
      } else {
        setChampion(null);
      }
    }
  };

  const handleChoosePenaltyWinner = (roundIdx, matchIdx, teamName) => {
    const updatedRounds = rounds.map((r, rIdx) => {
      if (rIdx !== roundIdx) return r;

      const updatedMatches = r.matches.map((m, mIdx) => {
        if (mIdx !== matchIdx) return m;

        const updatedMatch = { ...m };
        updatedMatch.penaltyWinner = teamName;
        updatedMatch.winner = teamName;
        return updatedMatch;
      });

      return { ...r, matches: updatedMatches };
    });

    setRounds(updatedRounds);

    const match = updatedRounds[roundIdx].matches[matchIdx];
    let newRounds = propagateBracketWinner(updatedRounds, roundIdx, matchIdx, teamName);
    setRounds(newRounds);

    // Check if champion is decided
    const finalRoundIdx = newRounds.length - 1;
    const finalMatch = newRounds[finalRoundIdx]?.matches[0];
    if (finalMatch && finalMatch.winner) {
      setChampion(finalMatch.winner);
    } else {
      setChampion(null);
    }
  };

  const handleResetTournament = () => {
    setActiveTournament(false);
    setRounds([]);
    setStandings([]);
    setChampion(null);
  };

  // WhatsApp formatted message text
  const generateWhatsAppMessage = () => {
    if (!activeTournament) return '';

    let text = `🏆 *RESULTADOS DEL TORNEO (BETA)* 🏆\n`;
    text += `⚽ Formato: ${tournamentType === 'round_robin' ? 'Liga (Todos contra todos)' : 'Eliminatoria Directa'}\n\n`;

    if (tournamentType === 'round_robin') {
      text += `📋 *TABLA DE CLASIFICACIÓN*\n`;
      standings.forEach((s, idx) => {
        const medal = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : `${idx + 1}. `;
        text += `${medal}*${s.team}* - ${s.points} pts | PJ: ${s.played} (DG: ${s.goalDifference > 0 ? '+' : ''}${s.goalDifference})\n`;
      });

      text += `\n📅 *JORNADAS Y PARTIDOS*\n`;
      rounds.forEach(r => {
        text += `\n*Jornada ${r.roundNumber}*\n`;
        r.matches.forEach(m => {
          const score = m.played ? `${m.homeScore} - ${m.awayScore}` : 'vs';
          text += `• ${m.home}  *${score}*  ${m.away}\n`;
        });
      });
    } else {
      text += `📅 *PARTIDOS DE LA ELIMINATORIA*\n`;
      rounds.forEach(r => {
        text += `\n*${r.roundName}*\n`;
        r.matches.forEach(m => {
          const homeName = m.home || 'Por definir';
          const awayName = m.away || 'Por definir';
          let matchText = `• ${homeName} `;
          if (m.played) {
            matchText += `*${m.homeScore} - ${m.awayScore}*`;
            if (m.penaltyWinner) {
              matchText += ` (Pen: ${m.penaltyWinner})`;
            }
            matchText += ` ${awayName}`;
            matchText += `  ➔ Ganador: *${m.winner}*`;
          } else {
            matchText += `vs ${awayName}`;
          }
          text += `${matchText}\n`;
        });
      });

      if (champion) {
        text += `\n👑 *CAMPEÓN DEL TORNEO:* 🏆 *${champion}* 🏆\n`;
      }
    }

    return text;
  };

  const handleShareWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyToClipboard = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setWhatsappCopied(true);
    setTimeout(() => setWhatsappCopied(false), 2000);
  };

  return (
    <div className="tournament-section">
      {!activeTournament ? (
        <div className="container" style={{ minHeight: 'auto' }}>
          {/* Setup view */}
          <div className="left-panel">
            <div className="card">
              <h2 className="team-title">Configurar Torneo</h2>
              <p className="card-subtitle" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Ingresa los equipos o jugadores y selecciona el formato.
              </p>

              <div className="textarea-container" style={{ minHeight: '200px' }}>
                <textarea
                  placeholder="Escribe los nombres de los equipos, uno por línea..."
                  value={inputTeamsText}
                  onChange={(e) => setInputTeamsText(e.target.value)}
                />
              </div>

              {errorMessage && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem', fontWeight: 600 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {initialTeams && (initialTeams.team1.length > 0 || initialTeams.team2.length > 0) && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Cargar desde balanceador:
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="header-btn" 
                      onClick={() => handleLoadFromBalancer('teams')}
                      style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}
                    >
                      ⚡ Cargar Equipos
                    </button>
                    <button 
                      className="header-btn" 
                      onClick={() => handleLoadFromBalancer('players')}
                      style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}
                    >
                      👥 Jugadores 1vs1
                    </button>
                  </div>
                </div>
              )}

              <div className="team-size-config" style={{ marginTop: '1.25rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Formato del Torneo:</label>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                  <label className="toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tournament_format"
                      checked={tournamentType === 'single_elimination'}
                      onChange={() => setTournamentType('single_elimination')}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                    />
                    <span className="toggle-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Eliminatoria (Playoff)</span>
                  </label>
                  <label className="toggle-container" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="tournament_format"
                      checked={tournamentType === 'round_robin'}
                      onChange={() => setTournamentType('round_robin')}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent-red)' }}
                    />
                    <span className="toggle-label" style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Todos contra todos (Liga)</span>
                  </label>
                </div>
              </div>

              <button className="btn" onClick={handleStartTournament} style={{ marginTop: '1.5rem' }}>
                Iniciar Torneo 🚀
              </button>
            </div>
          </div>

          <div className="right-panel">
            <div className="card" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <div className="placeholder-text" style={{ maxWidth: '300px' }}>
                <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>🏆</span>
                Configura los equipos a la izquierda y pulsa "Iniciar Torneo" para generar el fixture.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Header controls for active tournament */}
          <div className="card" style={{ padding: '1.25rem', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 className="team-title" style={{ fontSize: '1.4rem' }}>
                {tournamentType === 'round_robin' ? '🏆 Formato Liga (Beta)' : '🏆 Formato Eliminatorias (Beta)'}
              </h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Equipos: {teams.length} | Introduce los goles para actualizar standings o avanzar en la ronda.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="header-btn" onClick={handleCopyToClipboard}>
                {whatsappCopied ? '✓ ¡Copiado!' : '📋 Copiar'}
              </button>
              <button 
                className="header-btn" 
                onClick={handleShareWhatsApp}
                style={{ borderColor: '#25D366', color: '#25D366' }}
              >
                💬 Enviar WhatsApp
              </button>
              <button className="header-btn" onClick={handleResetTournament} style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                ⚙️ Reiniciar
              </button>
            </div>
          </div>

          {champion && (
            <div className="champion-banner animate-celebration">
              <div className="champion-badge">👑 CAMPEÓN 👑</div>
              <div className="champion-name">{champion}</div>
              <div className="champion-decor">🎉 ¡Felicitaciones por la victoria! 🏆</div>
            </div>
          )}

          {/* Active Tournament Layout */}
          {tournamentType === 'round_robin' ? (
            <div className="tournament-grid">
              {/* Round Robin Fixtures Column */}
              <div className="fixtures-column">
                <h3 className="team-title" style={{ marginBottom: '1rem' }}>📅 Partidos por Jornada</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '700px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                  {rounds.map((r) => (
                    <div key={`round-${r.roundNumber}`} className="round-card">
                      <h4 className="round-title">Jornada {r.roundNumber}</h4>
                      <div className="round-matches-list">
                        {r.matches.map((m, mIdx) => (
                          <div key={m.id} className={`tournament-match-item ${m.played ? 'match-played' : ''}`}>
                            <div className="match-team home-team">{m.home}</div>
                            <div className="match-score-inputs">
                              <input
                                type="text"
                                maxLength="2"
                                placeholder="-"
                                value={m.homeScore}
                                onChange={(e) => handleScoreChange(r.roundNumber - 1, mIdx, 'home', e.target.value)}
                                className="score-input"
                              />
                              <span className="vs-divider">:</span>
                              <input
                                type="text"
                                maxLength="2"
                                placeholder="-"
                                value={m.awayScore}
                                onChange={(e) => handleScoreChange(r.roundNumber - 1, mIdx, 'away', e.target.value)}
                                className="score-input"
                              />
                            </div>
                            <div className="match-team away-team">{m.away}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Standings Column */}
              <div className="standings-column">
                <div className="card" style={{ height: 'fit-content' }}>
                  <h3 className="team-title" style={{ marginBottom: '1.25rem' }}>📋 Tabla de Posiciones</h3>
                  <div className="table-responsive">
                    <table className="standings-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>Pos</th>
                          <th>Equipo</th>
                          <th title="Partidos Jugados">PJ</th>
                          <th title="Partidos Ganados">PG</th>
                          <th title="Partidos Empatados">PE</th>
                          <th title="Partidos Perdidos">PP</th>
                          <th title="Goles a Favor">GF</th>
                          <th title="Goles en Contra">GC</th>
                          <th title="Diferencia de Goles">DG</th>
                          <th title="Puntos">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((s, idx) => (
                          <tr key={s.team} className={idx === 0 ? 'standings-row-leader' : ''}>
                            <td>
                              <span className={`pos-rank rank-${idx + 1}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="team-cell">{s.team}</td>
                            <td>{s.played}</td>
                            <td>{s.won}</td>
                            <td>{s.drawn}</td>
                            <td>{s.lost}</td>
                            <td>{s.goalsFor}</td>
                            <td>{s.goalsAgainst}</td>
                            <td className={s.goalDifference > 0 ? 'text-positive' : s.goalDifference < 0 ? 'text-negative' : ''}>
                              {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                            </td>
                            <td className="pts-cell">{s.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Elimination Bracket view */
            <div className="bracket-wrapper">
              <h3 className="team-title" style={{ marginBottom: '1.25rem' }}>📋 Árbol de Eliminatorias</h3>
              <div className="bracket-container">
                {rounds.map((r, rIdx) => (
                  <div key={`bracket-round-${rIdx}`} className="bracket-round-column">
                    <h4 className="bracket-round-header">{r.roundName}</h4>
                    <div className="bracket-matches-column">
                      {r.matches.map((m, mIdx) => {
                        const homeName = m.home || 'Por definir';
                        const awayName = m.away || 'Por definir';
                        const isHomeBye = m.home === 'BYE';
                        const isAwayBye = m.away === 'BYE';
                        const hasBye = isHomeBye || isAwayBye;

                        const isDraw = m.played && m.homeScore === m.awayScore;

                        return (
                          <div key={m.id} className="bracket-match-node">
                            <div className={`bracket-match-card ${m.played ? 'node-played' : ''}`}>
                              {/* Home Team Row */}
                              <div className={`bracket-team-row ${m.winner === m.home && m.home ? 'winner-row' : ''} ${isHomeBye ? 'bye-row' : ''}`}>
                                <span className="bracket-team-name">{homeName}</span>
                                {!isHomeBye && m.home && (
                                  <input
                                    type="text"
                                    maxLength="2"
                                    placeholder="-"
                                    value={m.homeScore}
                                    onChange={(e) => handleScoreChange(rIdx, mIdx, 'home', e.target.value)}
                                    className="bracket-score-input"
                                    disabled={hasBye}
                                  />
                                )}
                                {isHomeBye && <span className="bye-badge">DESCANSA</span>}
                              </div>

                              {/* Away Team Row */}
                              <div className={`bracket-team-row ${m.winner === m.away && m.away ? 'winner-row' : ''} ${isAwayBye ? 'bye-row' : ''}`}>
                                <span className="bracket-team-name">{awayName}</span>
                                {!isAwayBye && m.away && (
                                  <input
                                    type="text"
                                    maxLength="2"
                                    placeholder="-"
                                    value={m.awayScore}
                                    onChange={(e) => handleScoreChange(rIdx, mIdx, 'away', e.target.value)}
                                    className="bracket-score-input"
                                    disabled={hasBye}
                                  />
                                )}
                                {isAwayBye && <span className="bye-badge">DESCANSA</span>}
                              </div>

                              {/* Tie-breaker penalty selection */}
                              {isDraw && m.home && m.away && !hasBye && (
                                <div className="bracket-tiebreaker">
                                  <span className="tiebreaker-label">Empate. ¿Quién avanza?</span>
                                  <div className="tiebreaker-buttons">
                                    <button 
                                      onClick={() => handleChoosePenaltyWinner(rIdx, mIdx, m.home)}
                                      className={`tiebreaker-btn ${m.penaltyWinner === m.home ? 'active' : ''}`}
                                    >
                                      {m.home.replace(/🔴|⚪/g, '').trim()}
                                    </button>
                                    <button 
                                      onClick={() => handleChoosePenaltyWinner(rIdx, mIdx, m.away)}
                                      className={`tiebreaker-btn ${m.penaltyWinner === m.away ? 'active' : ''}`}
                                    >
                                      {m.away.replace(/🔴|⚪/g, '').trim()}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
