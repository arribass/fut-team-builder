'use client';

import { useState } from 'react';
import { parsePlayers, balanceTeams, parseHeader } from '@/lib/balancer';

const PITCH_FORMATIONS = {
  '4-4-2': [
    { id: 'por', position: 'POR', side: null, x: 5, y: 50 },
    { id: 'def-izd', position: 'DEF', side: 'IZD', x: 20, y: 15 },
    { id: 'def-c1', position: 'DEF', side: null, x: 18, y: 38 },
    { id: 'def-c2', position: 'DEF', side: null, x: 18, y: 62 },
    { id: 'def-dcha', position: 'DEF', side: 'DCHA', x: 20, y: 85 },
    { id: 'med-izd', position: 'MED', side: 'IZD', x: 38, y: 15 },
    { id: 'med-c1', position: 'MED', side: null, x: 36, y: 38 },
    { id: 'med-c2', position: 'MED', side: null, x: 36, y: 62 },
    { id: 'med-dcha', position: 'MED', side: 'DCHA', x: 38, y: 85 },
    { id: 'atq-1', position: 'ATQ', side: null, x: 46, y: 40 },
    { id: 'atq-2', position: 'ATQ', side: null, x: 46, y: 60 },
  ],
  '4-3-3': [
    { id: 'por', position: 'POR', side: null, x: 5, y: 50 },
    { id: 'def-izd', position: 'DEF', side: 'IZD', x: 20, y: 15 },
    { id: 'def-c1', position: 'DEF', side: null, x: 18, y: 38 },
    { id: 'def-c2', position: 'DEF', side: null, x: 18, y: 62 },
    { id: 'def-dcha', position: 'DEF', side: 'DCHA', x: 20, y: 85 },
    { id: 'med-izd', position: 'MED', side: 'IZD', x: 35, y: 25 },
    { id: 'med-c', position: 'MED', side: null, x: 32, y: 50 },
    { id: 'med-dcha', position: 'MED', side: 'DCHA', x: 35, y: 75 },
    { id: 'atq-izd', position: 'ATQ', side: 'IZD', x: 48, y: 20 },
    { id: 'atq-c', position: 'ATQ', side: null, x: 48, y: 50 },
    { id: 'atq-dcha', position: 'ATQ', side: 'DCHA', x: 48, y: 80 },
  ],
  '3-5-2': [
    { id: 'por', position: 'POR', side: null, x: 5, y: 50 },
    { id: 'def-izd', position: 'DEF', side: 'IZD', x: 18, y: 20 },
    { id: 'def-c', position: 'DEF', side: null, x: 15, y: 50 },
    { id: 'def-dcha', position: 'DEF', side: 'DCHA', x: 18, y: 80 },
    { id: 'med-izd', position: 'MED', side: 'IZD', x: 35, y: 15 },
    { id: 'med-ci', position: 'MED', side: null, x: 32, y: 35 },
    { id: 'med-c', position: 'MED', side: null, x: 30, y: 50 },
    { id: 'med-cd', position: 'MED', side: null, x: 32, y: 65 },
    { id: 'med-dcha', position: 'MED', side: 'DCHA', x: 35, y: 85 },
    { id: 'atq-1', position: 'ATQ', side: null, x: 46, y: 40 },
    { id: 'atq-2', position: 'ATQ', side: null, x: 46, y: 60 },
  ],
};

const getPlayerStyle = (teamNum, p, formationName, allPlayersInTeam) => {
  if (!p.position) {
    const reserves = allPlayersInTeam.filter(op => !op.position);
    const index = reserves.findIndex(op => op.name === p.name);
    const x = teamNum === 1 ? (10 + index * 6) : (90 - index * 6);
    return { left: `${x}%`, top: `94%` };
  }

  const formation = PITCH_FORMATIONS[formationName] || PITCH_FORMATIONS['4-4-2'];
  let slot = null;

  if (p.slotId) {
    slot = formation.find(s => s.id === p.slotId);
    if (slot && (slot.position !== p.position || slot.side !== p.side)) {
      slot = null;
    }
  }

  if (!slot) {
    const matchingSlots = formation.filter(s => s.position === p.position && s.side === p.side);
    if (matchingSlots.length > 0) {
      const matchingPlayers = allPlayersInTeam.filter(op => op.position === p.position && op.side === p.side);
      const myIndex = matchingPlayers.findIndex(op => op.name === p.name);
      slot = matchingSlots[myIndex % matchingSlots.length];
    }
  }

  if (slot) {
    const x = teamNum === 1 ? slot.x : 100 - slot.x;
    return { left: `${x}%`, top: `${slot.y}%` };
  }

  let fallbackX = teamNum === 1 ? 25 : 75;
  if (p.position === 'POR') fallbackX = teamNum === 1 ? 5 : 95;
  else if (p.position === 'DEF') fallbackX = teamNum === 1 ? 20 : 80;
  else if (p.position === 'MED') fallbackX = teamNum === 1 ? 40 : 60;
  else if (p.position === 'ATQ') fallbackX = teamNum === 1 ? 48 : 52;

  let y = 50;
  if (p.side === 'IZD') y = 15;
  else if (p.side === 'DCHA') y = 85;

  return { left: `${fallbackX}%`, top: `${y}%` };
};

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [teams, setTeams] = useState(null);
  const [matchHeader, setMatchHeader] = useState('');
  const [teamSize, setTeamSize] = useState(11);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTeam, setDragOverTeam] = useState(null);
  const [pitchDraggedItem, setPitchDraggedItem] = useState(null);
  const [orgId, setOrgId] = useState('default');
  const [savedFeedback, setSavedFeedback] = useState({});
  const [team1Formation, setTeam1Formation] = useState('4-4-2');
  const [team2Formation, setTeam2Formation] = useState('4-4-2');

  const loadPreferences = () => {
    try {
      const data = localStorage.getItem(`fut-builder-players-${orgId || 'default'}`);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  };

  const handleSavePlayer = (p) => {
    try {
      const prefs = loadPreferences();
      prefs[p.name] = { position: p.position, side: p.side };
      localStorage.setItem(`fut-builder-players-${orgId || 'default'}`, JSON.stringify(prefs));
      
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
      localStorage.setItem(`fut-builder-players-${orgId || 'default'}`, JSON.stringify(prefs));
      
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
      // Remove custom coordinates when moving between lists
      movedPlayer.customX = undefined;
      movedPlayer.customY = undefined;
      
      newTeams[targetTeam].push(movedPlayer);
      
      return newTeams;
    });
    setDraggedItem(null);
  };

  const handlePitchDragStart = (e, team, index) => {
    setPitchDraggedItem({ team, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePitchDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSlotDrop = (e, targetTeam, slot) => {
    e.preventDefault();
    e.stopPropagation();
    if (!pitchDraggedItem) return;
    
    const { team: sourceTeam, index: sourceIndex } = pitchDraggedItem;
    
    setTeams(prev => {
      const newTeams = { team1: [...prev.team1], team2: [...prev.team2], reserves: [...prev.reserves] };
      const movedPlayer = { ...newTeams[sourceTeam][sourceIndex] };
      
      const existingOccupantIndex = newTeams[targetTeam].findIndex(p => p.slotId === slot.id || (
        p.position === slot.position && p.side === slot.side && !p.slotId
      ));
      
      if (existingOccupantIndex !== -1 && (sourceTeam !== targetTeam || existingOccupantIndex !== sourceIndex)) {
        const occupant = { ...newTeams[targetTeam][existingOccupantIndex] };
        occupant.position = movedPlayer.position;
        occupant.side = movedPlayer.side;
        occupant.slotId = movedPlayer.slotId;
        newTeams[targetTeam][existingOccupantIndex] = occupant;
      }
      
      movedPlayer.position = slot.position;
      movedPlayer.side = slot.side;
      movedPlayer.slotId = slot.id;
      
      newTeams[sourceTeam].splice(sourceIndex, 1);
      newTeams[targetTeam].push(movedPlayer);
      
      return newTeams;
    });
    setPitchDraggedItem(null);
  };

  const handlePitchDrop = (e) => {
    e.preventDefault();
    if (!pitchDraggedItem) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    if (y > 90) { // Bench area
      setTeams(prev => {
        const newTeams = { team1: [...prev.team1], team2: [...prev.team2], reserves: [...prev.reserves] };
        const { team: sourceTeam, index: sourceIndex } = pitchDraggedItem;
        const [movedPlayer] = newTeams[sourceTeam].splice(sourceIndex, 1);
        movedPlayer.position = null;
        movedPlayer.side = null;
        movedPlayer.slotId = undefined;
        newTeams[sourceTeam].push(movedPlayer);
        return newTeams;
      });
    }
    setPitchDraggedItem(null);
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
        [field]: currentValue === value ? null : value,
        customX: undefined,
        customY: undefined,
        slotId: undefined
      };
      return newTeams;
    });
  };

  const handleRandomFormation = () => {
    if (!teams) return;

    const available = Object.keys(PITCH_FORMATIONS);

    const applyFormation = (teamArray, formName) => {
      const formation = PITCH_FORMATIONS[formName];
      const shuffled = [...teamArray].sort(() => Math.random() - 0.5);
      
      return shuffled.map((p, i) => {
        if (i < formation.length) {
          return { ...p, position: formation[i].position, side: formation[i].side, slotId: formation[i].id };
        }
        return { ...p, position: null, side: null, slotId: undefined };
      });
    };

    const f1 = available[Math.floor(Math.random() * available.length)];
    const f2 = available[Math.floor(Math.random() * available.length)];
    setTeam1Formation(f1);
    setTeam2Formation(f2);

    setTeams(prev => ({
      ...prev,
      team1: applyFormation(prev.team1, f1),
      team2: applyFormation(prev.team2, f2),
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

            <div className="team-size-config" style={{ marginTop: '0.5rem' }}>
              <label htmlFor="orgId">ID de Grupo/Org:</label>
              <input 
                type="text" 
                id="orgId" 
                value={orgId} 
                onChange={(e) => setOrgId(e.target.value)}
                className="team-size-input"
                style={{ width: '120px', textAlign: 'left' }}
                placeholder="Ej: Lunes F11"
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
          <div className="pitch-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="formation-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: '#ef4444' }}>Formación Rojo: </label>
              <select value={team1Formation} onChange={e => setTeam1Formation(e.target.value)} className="team-size-input" style={{ width: 'auto' }}>
                {Object.keys(PITCH_FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <h2 className="team-title" style={{ margin: 0 }}>Pizarra Táctica 📋</h2>
            <div className="formation-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: 600, color: '#f3f4f6' }}>Formación Blanco: </label>
              <select value={team2Formation} onChange={e => setTeam2Formation(e.target.value)} className="team-size-input" style={{ width: 'auto' }}>
                {Object.keys(PITCH_FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div 
            className="pitch-container"
            onDragOver={handlePitchDragOver}
            onDrop={handlePitchDrop}
          >
            <div className="pitch-lines">
              <div className="pitch-half-line"></div>
              <div className="pitch-center-circle"></div>
              <div className="pitch-penalty-left"></div>
              <div className="pitch-penalty-right"></div>
            </div>

            {/* Slots for Team 1 */}
            {PITCH_FORMATIONS[team1Formation].map(slot => (
              <div 
                key={`slot-t1-${slot.id}`}
                className="pitch-slot"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onDragOver={handlePitchDragOver}
                onDrop={(e) => handleSlotDrop(e, 'team1', slot)}
              />
            ))}
            
            {/* Slots for Team 2 */}
            {PITCH_FORMATIONS[team2Formation].map(slot => (
              <div 
                key={`slot-t2-${slot.id}`}
                className="pitch-slot"
                style={{ left: `${100 - slot.x}%`, top: `${slot.y}%` }}
                onDragOver={handlePitchDragOver}
                onDrop={(e) => handleSlotDrop(e, 'team2', slot)}
              />
            ))}
            
            {teams.team1.map((p, i) => {
              const style = getPlayerStyle(1, p, team1Formation, teams.team1);
              return (
                <div 
                  key={`pitch-t1-${p.name}`} 
                  className="pitch-player team-red-player" 
                  style={style}
                  draggable="true"
                  onDragStart={(e) => handlePitchDragStart(e, 'team1', i)}
                >
                  <div className="player-dot"></div>
                  <span className="pitch-player-name">{p.name}</span>
                </div>
              );
            })}
            
            {teams.team2.map((p, i) => {
              const style = getPlayerStyle(2, p, team2Formation, teams.team2);
              return (
                <div 
                  key={`pitch-t2-${p.name}`} 
                  className="pitch-player team-white-player" 
                  style={style}
                  draggable="true"
                  onDragStart={(e) => handlePitchDragStart(e, 'team2', i)}
                >
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

