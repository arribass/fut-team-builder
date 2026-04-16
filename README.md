# fut-team-builder

1. Input (lista pegada)

Pegas esto:

1. Aranda
2. Patxi
3. Ramón
...
R1. Pablo V
2. Normalización

Parseas nombres + reservas + orden.

3. Motor de equipos

Aquí está lo importante.

⚙️ Problema real: no tienes skill data

Sin niveles, solo hay 3 opciones:

Opción A (MVP rápido)

👉 random + balance por “posiciones” en el array

barajas lista
alternas equipos 1 y 2
evitas que los 3-4 últimos siempre juntos

✔ rápido
❌ no siempre justo

Opción B (la buena 👌)

Añadir “rating oculto” por jugador

Supabase tabla:

players
- id
- name
- rating (1-10)

Luego haces balance tipo greedy:

Algoritmo simple (muy efectivo)
Ordenas jugadores por rating DESC
Vas asignando uno a cada equipo alternando el equipo con menos suma total

Ejemplo:

teams = [A, B]

for player in sortedPlayers:
  team = teamWithLowerTotalRating()
  assign(player, team)

✔ bastante justo
✔ fácil de explicar
✔ no genera discusiones fuertes

Opción C (pro nivel 😎)

Simular swaps:

haces random inicial
calculas diferencia de suma
intercambias jugadores entre equipos hasta minimizar diferencia

Esto ya es tipo “optimización ligera”.

🧱 Arquitectura Next.js + Supabase
Frontend
textarea → pegar lista
botón “generar equipos”
slider opcional de rating por jugador
Backend (Next API route o server action)
Flow:
parseInput(text)
getPlayers (o crear si no existen)
assignRatings (manual o default 5)
generateTeams()
return result
🧩 Parsing de tu input
function parsePlayers(text: string) {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^\d+\.\s*/, ""))
    .map(line => line.replace(/^R\d+\.\s*/, ""))
}
⚖️ Algoritmo recomendado (equilibrado y simple)

Este es el que yo usaría en tu caso:

function generateTeams(players) {
  const sorted = [...players].sort((a, b) => b.rating - a.rating)

  const teams = [
    { name: "Rojo", players: [], total: 0 },
    { name: "Blanco", players: [], total: 0 }
  ]

  for (const p of sorted) {
    const team = teams[0].total <= teams[1].total ? teams[0] : teams[1]
    team.players.push(p)
    team.total += p.rating
  }

  return teams
}
🧠 Mejora MUY importante (esto cambia todo)

Añade:

👍 “peso emocional”
portero fijo
amigos que no quieren separarse
gente que siempre se pica

Tabla extra:

constraints
- player_id
- type (together / separate / goalie)
- target_player_id

Esto hace que el sistema deje de ser “robot injusto”.

💥 UX que haría que esto triunfe
botón: “generar equipos”
botón: “regenerar sin cambiar mucho”
toggle: “modo competitivo / casual”

mostrar diferencia de fuerza:

Rojo: 42.5
Blanco: 41.8
🚀 Si quieres ir a versión PRO

Te puedo ayudar a añadir:

sistema tipo Elo por partido
historial de equipos
rachas (evitar que alguien pierda siempre)
auto-equilibrado según asistencia
“capitanes rotativos”

Si quieres, en el siguiente paso te puedo montar:

👉 
estructura completa de proyecto Next.js + Supabase
👉 
esquema SQL
👉 
API route lista para copiar
👉 
UI tipo “app de equipos de fútbol”

Solo dime 👍
