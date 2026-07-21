# FUT Team Balancer

Un balanceador y gestor de equipos de fútbol premium diseñado para organizar partidos de forma inteligente. El proyecto está construido con Next.js y ofrece una pizarra táctica interactiva, un generador simplificado de listas de equipos formateadas para WhatsApp, selección de colores de equipaciones personalizadas y un sistema de almacenamiento de preferencias de jugadores basado en grupos.

---

## 🚀 Objetivo del Proyecto & Bot de WhatsApp

El objetivo principal es convertir esta aplicación en un **Bot de WhatsApp** automatizado. Esto permite a los usuarios comunicarse y gestionar sus partidos directamente desde un chat de grupo o conversación privada de WhatsApp sin necesidad de entrar a la web.

### 🤖 Comandos & Webhook del Bot

El bot responde automáticamente a través de la API en `/api/whatsapp` y soporta los siguientes comandos:

1. **Consulta de ID de Organización**:
   ```text
   dime tu id de organizacion
   ```
   *Respuesta*: Muestra el identificador de la organización/grupo de juego registrado en la plataforma.

2. **Equilibrado Automático de Plantilla**:
   Envía cualquier lista de jugadores copiada de WhatsApp (con contadores tipo `1. `, reservas `R1. `, fecha/hora en la cabecera):
   ```text
   Miércoles 18:30 - Campo F11
   1. Aranda
   2. Patxi
   3. Ramon
   ...
   R1. Pablo V
   ```
   *Respuesta*: Devuelve los equipos divididos equitativamente en formato listo para WhatsApp (ej. `⚪ EQUIPO BLANCO` vs `🔴 EQUIPO ROJO`).

---

## 🛠️ Bot de WhatsApp: Cómo Probarlo y Desplegarlo

### 1. Script de Prueba CLI (Local)
Puedes probar la respuesta del bot directamente desde la terminal ejecutando:
```bash
node scripts/test-whatsapp-bot.js
```

### 2. Endpoint API de Next.js (Webhook)
El proyecto incluye la ruta HTTP **`/api/whatsapp`**:
- **`GET /api/whatsapp`**: Soporta verificación de Webhook de Meta Cloud API (`hub.challenge` y `hub.verify_token`).
- **`POST /api/whatsapp`**: Recibe mensajes JSON.
  ```json
  POST /api/whatsapp
  Content-Type: application/json

  {
    "message": "Miércoles 18:00\n1. Aranda\n2. Patxi\n3. Ramon\n4. Sergio",
    "teamSize": 11,
    "team1Color": "white",
    "team2Color": "red"
  }
  ```

### 3. Opciones de Integración para Producción
- **WhatsApp Cloud API (Meta Oficial)**: Configura la URL del Webhook a `https://tu-dominio.vercel.app/api/whatsapp`.
- **Twilio / Green-API**: Configura el webhook entrante apuntando a la misma API route `/api/whatsapp`.
- **whatsapp-web.js / Baileys**: Un script Node.js ligero que vincula un número escaneando un QR y reenvía los mensajes a `balanceTeams()`.

---

## 🛠️ Tecnologías

- **Framework**: Next.js (App Router)
- **Componentes**: React (Hooks, Estado local, Efectos dinámicos)
- **Estilos**: Vanilla CSS con variables CSS personalizadas y glassmorphism
- **Almacenamiento**: Persistencia local (localStorage) por ID de grupo para guardar posiciones preferidas de jugadores y colores de equipaciones

---

## 💻 Desarrollo Local

Para poner en marcha el proyecto en tu máquina local, sigue estos pasos:

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

3. **Ver en el navegador**:
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación web interactiva.

4. **Probar Bot de WhatsApp en la Terminal**:
   ```bash
   node scripts/test-whatsapp-bot.js
   ```

5. **Compilación de producción**:
   ```bash
   npm run build
   ```

---

## ⚽ Características

- **Pizarra Táctica interactiva**: Arrastra y suelta jugadores en el campo de fútbol según la formación táctica elegida.
- **Formaciones Dinámicas**: Soporta formaciones clásicas de 11 jugadores (`4-4-2`, `4-3-3`, `3-5-2`) y formaciones de 12 jugadores (`4-4-3`, `4-5-2`) habilitadas automáticamente cuando la plantilla es de 12.
- **Selección de Colores de Equipaciones**: Elige entre 10 paletas de colores (Blanco ⚪ vs Rojo 🔴 por defecto, Azul 🔵, Verde 🟢, Amarillo 🟡, Negro 🖤, Naranja 🟠, Morado 🟣, Celeste 🩵, Rosa 🩷) con botón para intercambiar colores al instante.
- **Generador de Mensajes de WhatsApp**: Un botón para copiar la lista formateada y compartir directamente a WhatsApp con opciones de personalización simplificadas (incluir posiciones, incluir reservas, añadir notas de pie de mensaje).

