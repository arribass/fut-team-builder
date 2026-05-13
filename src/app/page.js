'use client';

import { useState } from 'react';
import { parsePlayers, balanceTeams, parseHeader } from '@/lib/balancer';

const getPlayerStyle = (teamNum, p, allPlayersInTeam) => {
  if (!p.position) {
    const reserves = allPlayersInTeam.filter(op => !op.position);
    const index = reserves.findIndex(op => op.name === p.name);
    const x = teamNum === 1 ? (10 + index * 6) : (90 - index * 6);
    return { left: `${x}%`, top: `94%` };
  }

  let x = teamNum === 1 ? 25 : 75;
  let y = 50;

  if (p.position === 'POR') x = teamNum === 1 ? 5 : 95;
  else if (p.position === 'DEF') x = teamNum === 1 ? 20 : 80;
  else if (p.position === 'MED') x = teamNum === 1 ? 40 : 60;
  else if (p.position === 'ATQ') x = teamNum === 1 ? 48 : 52;

  if (p.side === 'IZD') y = 15;
  else if (p.side === 'DCHA') y = 85;
  else y = 50;

  const similarPlayers = allPlayersInTeam.filter(
    op => op.position === p.position && op.side === p.side
  );
  if (similarPlayers.length > 1) {
    const simIndex = similarPlayers.findIndex(op => op.name === p.name);
    const offset = (simIndex - (similarPlayers.length - 1) / 2) * 20;
    y += offset;
  }

  y = Math.max(5, Math.min(95, y));
  return { left: `${x}%`, top: `${y}%` };
};

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [teams, setTeams] = useState(null);
  const [matchHeader, setMatchHeader] = useState('');
  const [teamSize, setTeamSize] = useState(11);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTeam, setDragOverTeam] = useState(null);
  const [savedFeedback, setSavedFeedback] = useState({});

  const loadPreferences = () => {
    try {
      const data = localStorage.getItem('fut-builder-players');
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  const handleSavePlayer = (p) => {
    try {
      const prefs = loadPreferences();
      prefs[p.name] = { position: p.position, side: p.side };
      localStorage.setItem('fut-builder-players', JSON.stringify(prefs));
      
      setSavedFeedback(prev => ({ ...prev, [p.name]: true }));
      setTimeout(() => {
        setSavedFeedback(prev => ({ ...prev, [p.name]: false }));
      }, 1500);
    } catch (e) {
      console.error('Error saving preference', e);
    }
  };

  const handleSaveAllPlayers = () => {
    if (!teams) return;
    try {
      const prefs = loadPreferences();
      const allPlayers = [...teams.team1, ...teams.team2, ...teams.reserves];
      allPlayers.forEach(p => {
        if (p.position || p.side) {
          prefs[p.name] = { position: p.position, side: p.side };
        }
      });
      localStorage.setItem('fut-builder-players', JSON.stringify(prefs));
      
      setSavedFeedback(prev => ({ ...prev, all: true }));
      setTimeout(() => {
        setSavedFeedback(prev => ({ ...prev, all: false }));
      }, 1500);
    } catch (e) {
      console.error('Error saving all preferences', e);
    }
  };

  const handleDragStart = (e, team, index) => {
    setDraggedItem({ team, index });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', team + index);
  };

  const handleDragOver = (e, team) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTeam !== team) {
      setDragOverTeam(team);
    }
  };

  const handleDragLeave = () => {
    setDragOverTeam(null);
  };

  const handleDrop = (e, targetTeam) => {
    e.preventDefault();
    setDragOverTeam(null);
    if (!draggedItem) return;

    const { team: sourceTeam, index: sourceIndex } = draggedItem;
    if (sourceTeam === targetTeam) {
      setDraggedItem(null);
      return;
    }

    setTeams(prevTeams => {
      const newTeams = {
        team1: [...prevTeams.team1],
        team2: [...prevTeams.team2],
        reserves: [...prevTeams.reserves]
      };
      
      const [movedPlayer] = newTeams[sourceTeam].splice(sourceIndex, 1);
      newTeams[targetTeam].push(movedPlayer);
      
      return newTeams;
    });
    setDraggedItem(null);
  };

  const handleGenerate = () => {
    const players = parsePlayers(inputText);
    const header = parseHeader(inputText);
    setMatchHeader(header);
    
    if (players.length > 0) {
      const prefs = loadPreferences();
      const playersWithPrefs = players.map(p => {
        if (prefs[p.name]) {
          return { ...p, position: prefs[p.name].position, side: prefs[p.name].side };
        }
        return p;
      });
      const result = balanceTeams(playersWithPrefs);
      setTeams(result);
    }
  };

  const handleRebalance = () => {
    if (!teams) return;
    const allPlayers = [...teams.team1, ...teams.team2, ...teams.reserves];
    const result = balanceTeams(allPlayers);
    setTeams(result);
  };

  const handleUpdatePlayer = (teamName, index, field, value) => {
    setTeams(prev => {
      const newTeams = { ...prev };
      newTeams[teamName] = [...prev[teamName]];
      // Toggle off if same value is clicked
      const currentValue = newTeams[teamName][index][field];
      newTeams[teamName][index] = { 
        ...newTeams[teamName][index], 
        [field]: currentValue === value ? null : value 
      };
      return newTeams;
    });
  };

  const handleRandomFormation = () => {
    if (!teams) return;

    const formations = [
      [ // 4-4-2
        { position: 'POR', side: null },
        { position: 'DEF', side: 'IZD' },
        { position: 'DEF', side: 'DCHA' },
        { position: 'DEF', side: null },
        { position: 'DEF', side: null },
        { position: 'MED', side: 'IZD' },
        { position: 'MED', side: 'DCHA' },
        { position: 'MED', side: null },
        { position: 'MED', side: null },
        { position: 'ATQ', side: null },
        { position: 'ATQ', side: null },
      ],
      [ // 4-3-3
        { position: 'POR', side: null },
        { position: 'DEF', side: 'IZD' },
        { position: 'DEF', side: 'DCHA' },
        { position: 'DEF', side: null },
        { position: 'DEF', side: null },
        { position: 'MED', side: null },
        { position: 'MED', side: null },
        { position: 'MED', side: null },
        { position: 'ATQ', side: 'IZD' },
        { position: 'ATQ', side: 'DCHA' },
        { position: 'ATQ', side: null },
      ]
    ];

    const applyFormation = (teamArray) => {
      const formation = formations[Math.floor(Math.random() * formations.length)];
      const shuffled = [...teamArray].sort(() => Math.random() - 0.5);
      
      return shuffled.map((p, i) => {
        if (i < formation.length) {
          return { ...p, position: formation[i].position, side: formation[i].side };
        }
        return { ...p, position: null, side: null };
      });
    };

    setTeams(prev => ({
      ...prev,
      team1: applyFormation(prev.team1),
      team2: applyFormation(prev.team2),
    }));
  };

  const copyToClipboard = () => {
    if (!teams) return;

    let text = `⚽ *Fut Team Balancer*\n`;
    if (matchHeader) text += `📅 ${matchHeader}\n`;
    text += `\n`;
    
    text += `🔴 *EQUIPO ROJO*\n`;
    teams.team1.forEach(p => {
      let info = [];
      if (p.position) info.push(p.position);
      if (p.side) info.push(p.side);
      const suffix = info.length > 0 ? ` [${info.join(' ')}]` : '';
      text += `• ${p.name}${suffix}\n`;
    });
    
    text += `\n⚪ *EQUIPO BLANCO*\n`;
    teams.team2.forEach(p => {
      let info = [];
      if (p.position) info.push(p.position);
      if (p.side) info.push(p.side);
      const suffix = info.length > 0 ? ` [${info.join(' ')}]` : '';
      text += `• ${p.name}${suffix}\n`;
    });

    if (teams.reserves.length > 0) {
      text += `\n⏳ *RESERVAS*\n`;
      teams.reserves.forEach(p => {
        let info = [];
        if (p.position) info.push(p.position);
        if (p.side) info.push(p.side);
        const suffix = info.length > 0 ? ` [${info.join(' ')}]` : '';
        text += `• ${p.name}${suffix}\n`;
      });
    }

    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  const handleReset = () => {
    setInputText('');
    setTeams(null);
    setMatchHeader('');
  };

  const handleExample = () => {

    const exampleList = `Miércoles 18:30 - Campo F11

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
    setInputText(exampleList);
  };

  return (
    <main>
      <header className="main-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-emoji">⚽</span>
            <span className="logo-text">FUT<span className="logo-highlight">BUILDER</span></span>
          </div>
          
          {teams && (
            <div className="header-center-info">
              {matchHeader && <div className="header-match-date">📅 {matchHeader}</div>}
              <div className="header-player-count">
                👥 {teams.team1.length + teams.team2.length + teams.reserves.length} Jugadores
              </div>
            </div>
          )}

          <nav className="header-actions">
            {teams && (
              <>
                <button className="header-btn" onClick={handleRandomFormation}>
                  🎲 Formación Aleatoria
                </button>
                <button className="header-btn" onClick={handleRebalance}>
                  ⚖️ Re-equilibrar
                </button>
                <button 
                  className="header-btn" 
                  style={{ borderColor: savedFeedback.all ? 'var(--accent-green)' : '', color: savedFeedback.all ? 'var(--accent-green)' : '' }}
                  onClick={handleSaveAllPlayers}
                >
                  {savedFeedback.all ? '✓' : '💾'} Guardar
                </button>
                <button className="header-btn" onClick={copyToClipboard}>
                  📱 Copiar
                </button>
              </>
            )}
            <button className="header-btn" onClick={handleReset}>
              <span className="btn-icon">🗑️</span> Limpiar
            </button>
          </nav>
        </div>
      </header>

      <div className="container">

        {/* Left Panel: Input */}
        <div className="left-panel">
          <div className="card">
            <h2 className="team-title">Lista de Jugadores</h2>
            <div className="textarea-container">
              <textarea
                placeholder="Pega la lista aquí...
Ejemplo:
Miércoles 18:00
1. Aranda
2. Patxi
..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>
            
            <div className="team-size-config">
              <label htmlFor="teamSize">Jugadores por equipo:</label>
              <input 
                type="number" 
                id="teamSize" 
                value={teamSize} 
                onChange={(e) => setTeamSize(Number(e.target.value))}
                min="1"
                max="20"
                className="team-size-input"
              />
            </div>

            <div className="button-group">
              <button className="btn" onClick={handleGenerate}>
                Generar Equipos
              </button>
              <button className="btn btn-outline" onClick={handleExample}>
                Cargar Ejemplo 📝
              </button>
            </div>
          </div>
        </div>


        {/* Right Panel: Output */}
        <div className="right-panel">
          <div className="card">
            <h2 className="team-title">Equipos Generados</h2>
            
            {teams ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                
                <div className="teams-grid">
                  <div 
                    className={`team-column ${dragOverTeam === 'team1' ? 'drag-over' : ''} ${teams.team1.length >= teamSize ? 'team-complete' : 'team-incomplete'}`}
                    onDragOver={(e) => handleDragOver(e, 'team1')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'team1')}
                  >
                    <div className="team-header-row">
                      <h3 className="team-title team-red">🔴 Equipo Rojo</h3>
                      <span className={`team-status ${teams.team1.length < teamSize ? 'status-incomplete' : 'status-complete'}`}>
                        {teams.team1.length} / {teamSize}
                      </span>
                    </div>
                    <ul className="player-list">
                      {teams.team1.map((p, i) => (
                        <li 
                          key={`team1-${i}-${p.name}`} 
                          className="player-item" 
                          style={{ animationDelay: `${i * 0.05}s` }}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, 'team1', i)}
                        >
                          <div className="player-name">{p.name}</div>
                          <div className="player-toggles">
                            <div className="toggle-group">
                              {['DEF', 'MED', 'ATQ'].map(pos => (
                                <button 
                                  key={pos} 
                                  className={`pos-badge ${p.position === pos ? 'active' : ''}`}
                                  onClick={() => handleUpdatePlayer('team1', i, 'position', pos)}
                                >{pos}</button>
                              ))}
                            </div>
                            <div className="toggle-group">
                              {['IZD', 'DCHA'].map(side => (
                                <button 
                                  key={side} 
                                  className={`side-badge ${p.side === side ? 'active' : ''}`}
                                  onClick={() => handleUpdatePlayer('team1', i, 'side', side)}
                                >{side}</button>
                              ))}
                            </div>
                            <button 
                              className={`save-badge ${savedFeedback[p.name] ? 'saved' : ''}`}
                              onClick={() => handleSavePlayer(p)}
                              title="Guardar preferencias"
                            >
                              {savedFeedback[p.name] ? '✓' : '💾'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div 
                    className={`team-column ${dragOverTeam === 'team2' ? 'drag-over' : ''} ${teams.team2.length >= teamSize ? 'team-complete' : 'team-incomplete'}`}
                    onDragOver={(e) => handleDragOver(e, 'team2')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'team2')}
                  >
                    <div className="team-header-row">
                      <h3 className="team-title team-white">⚪ Equipo Blanco</h3>
                      <span className={`team-status ${teams.team2.length < teamSize ? 'status-incomplete' : 'status-complete'}`}>
                        {teams.team2.length} / {teamSize}
                      </span>
                    </div>
                    <ul className="player-list">
                      {teams.team2.map((p, i) => (
                        <li 
                          key={`team2-${i}-${p.name}`} 
                          className="player-item" 
                          style={{ animationDelay: `${(i + teams.team1.length) * 0.05}s` }}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, 'team2', i)}
                        >
                          <div className="player-name">{p.name}</div>
                          <div className="player-toggles">
                            <div className="toggle-group">
                              {['DEF', 'MED', 'ATQ'].map(pos => (
                                <button 
                                  key={pos} 
                                  className={`pos-badge ${p.position === pos ? 'active' : ''}`}
                                  onClick={() => handleUpdatePlayer('team2', i, 'position', pos)}
                                >{pos}</button>
                              ))}
                            </div>
                            <div className="toggle-group">
                              {['IZD', 'DCHA'].map(side => (
                                <button 
                                  key={side} 
                                  className={`side-badge ${p.side === side ? 'active' : ''}`}
                                  onClick={() => handleUpdatePlayer('team2', i, 'side', side)}
                                >{side}</button>
                              ))}
                            </div>
                            <button 
                              className={`save-badge ${savedFeedback[p.name] ? 'saved' : ''}`}
                              onClick={() => handleSavePlayer(p)}
                              title="Guardar preferencias"
                            >
                              {savedFeedback[p.name] ? '✓' : '💾'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {teams.reserves.length > 0 && (
                  <div 
                    className={`team-column ${dragOverTeam === 'reserves' ? 'drag-over' : ''}`} 
                    style={{ marginTop: '1rem' }}
                    onDragOver={(e) => handleDragOver(e, 'reserves')}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'reserves')}
                  >
                    <h3 className="team-title" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>⏳ Reservas</h3>
                    <ul className="player-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '8px' }}>
                      {teams.reserves.map((p, i) => (
                        <li 
                          key={`reserves-${i}-${p.name}`} 
                          className="player-badge"
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, 'reserves', i)}
                        >
                          {p.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="placeholder-text">
                Pega una lista a la izquierda y pulsa "Generar Equipos" para ver el resultado.
              </div>
            )}
          </div>
        </div>
      </div>

      {teams && (
        <div className="pitch-section">
          <h2 className="team-title" style={{ justifyContent: 'center', marginBottom: '1.5rem', width: '100%' }}>Pizarra Táctica 📋</h2>
          <div className="pitch-container">
            <div className="pitch-lines">
              <div className="pitch-half-line"></div>
              <div className="pitch-center-circle"></div>
              <div className="pitch-penalty-left"></div>
              <div className="pitch-penalty-right"></div>
            </div>
            
            {teams.team1.map((p) => {
              const style = getPlayerStyle(1, p, teams.team1);
              return (
                <div key={`pitch-t1-${p.name}`} className="pitch-player team-red-player" style={style}>
                  <div className="player-dot"></div>
                  <span className="pitch-player-name">{p.name}</span>
                </div>
              );
            })}
            
            {teams.team2.map((p) => {
              const style = getPlayerStyle(2, p, teams.team2);
              return (
                <div key={`pitch-t2-${p.name}`} className="pitch-player team-white-player" style={style}>
                  <div className="player-dot"></div>
                  <span className="pitch-player-name">{p.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

