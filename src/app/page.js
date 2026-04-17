'use client';

import { useState } from 'react';
import { parsePlayers, balanceTeams, parseHeader } from '@/lib/balancer';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [teams, setTeams] = useState(null);
  const [matchHeader, setMatchHeader] = useState('');

  const handleGenerate = () => {
    const players = parsePlayers(inputText);
    const header = parseHeader(inputText);
    setMatchHeader(header);
    
    if (players.length > 0) {
      const result = balanceTeams(players);
      setTeams(result);
    }
  };

  const copyToClipboard = () => {
    if (!teams) return;

    let text = `⚽ *Fut Team Balancer*\n`;
    if (matchHeader) text += `📅 ${matchHeader}\n`;
    text += `\n`;
    
    text += `🔴 *EQUIPO ROJO*\n`;
    teams.team1.forEach(p => text += `• ${p}\n`);
    
    text += `\n⚪ *EQUIPO BLANCO*\n`;
    teams.team2.forEach(p => text += `• ${p}\n`);

    if (teams.reserves.length > 0) {
      text += `\n⏳ *RESERVAS*\n`;
      teams.reserves.forEach(p => text += `• ${p}\n`);
    }

    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  return (
    <main>
      <h1 className="title">Fútbol Team Balancer</h1>

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
            <button className="btn" onClick={handleGenerate}>
              Generar Equipos
            </button>
          </div>
        </div>

        {/* Right Panel: Output */}
        <div className="right-panel">
          <div className="card">
            <h2 className="team-title">Equipos Generados</h2>
            
            {teams ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {matchHeader && (
                  <div className="match-header-display">
                    📅 {matchHeader}
                  </div>
                )}
                
                <div className="teams-grid">
                  <div className="team-column">
                    <h3 className="team-title team-red">🔴 Equipo Rojo</h3>
                    <ul className="player-list">
                      {teams.team1.map((name, i) => (
                        <li key={i} className="player-item" style={{ animationDelay: `${i * 0.05}s` }}>
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="team-column">
                    <h3 className="team-title team-white">⚪ Equipo Blanco</h3>
                    <ul className="player-list">
                      {teams.team2.map((name, i) => (
                        <li key={i} className="player-item" style={{ animationDelay: `${(i + teams.team1.length) * 0.05}s` }}>
                          {name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {teams.reserves.length > 0 && (
                  <div className="team-column" style={{ marginTop: '1rem' }}>
                    <h3 className="team-title" style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>⏳ Reservas</h3>
                    <ul className="player-list" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '8px' }}>
                      {teams.reserves.map((name, i) => (
                        <li key={i} className="player-badge">{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button className="btn btn-secondary" style={{ marginTop: 'auto' }} onClick={copyToClipboard}>
                  Copiar para WhatsApp 📱
                </button>
              </div>
            ) : (
              <div className="placeholder-text">
                Pega una lista a la izquierda y pulsa "Generar Equipos" para ver el resultado.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

