# FUT Team Balancer

Un balanceador y gestor de equipos de fútbol premium diseñado para organizar partidos de forma inteligente. El proyecto está construido con Next.js y ofrece una pizarra táctica interactiva, un generador simplificado de listas de equipos formateadas para WhatsApp y un sistema de almacenamiento de preferencias de jugadores basado en grupos.

## 🚀 Objetivo del Proyecto

El objetivo principal es convertir esta aplicación en un **Bot de WhatsApp** automatizado. Esto permitirá a los usuarios comunicarse y gestionar sus partidos directamente desde un chat de WhatsApp sin necesidad de entrar a la web.

### 🤖 Comandos del Bot

El primer comando implementado para iniciar la comunicación con el bot de WhatsApp será:

```text
dime tu id de organizacion
```

Este comando servirá para vincular el chat o grupo de WhatsApp con el identificador de la organización/grupo de juego registrado en la plataforma (por ejemplo, el ID de grupo configurado en el panel lateral de la aplicación).

---

## 🛠️ Tecnologías

- **Framework**: Next.js (App Router)
- **Componentes**: React (Hooks, Estado local, Efectos dinámicos)
- **Estilos**: Vanilla CSS con variables CSS personalizadas
- **Almacenamiento**: Persistencia local (localStorage) por ID de grupo para guardar posiciones preferidas de jugadores

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

4. **Compilación de producción**:
   ```bash
   npm run build
   ```

---

## ⚽ Características

- **Pizarra Táctica interactiva**: Arrastra y suelta jugadores en el campo de fútbol según la formación táctica elegida.
- **Formaciones Dinámicas**: Soporta formaciones clásicas de 11 jugadores (`4-4-2`, `4-3-3`, `3-5-2`) y formaciones de 12 jugadores (`4-4-3`, `4-5-2`) habilitadas automáticamente cuando la plantilla es de 12.
- **Generador de Mensajes de WhatsApp**: Un botón para copiar la lista formateada y compartir directamente a WhatsApp con opciones de personalización simplificadas (incluir posiciones, incluir reservas, añadir notas de pie de mensaje).
