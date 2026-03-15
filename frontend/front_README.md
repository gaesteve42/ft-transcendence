# GameFinder — Frontend

## Description

Frontend of GameFinder, a web app that helps friends discover games they can enjoy together. Users create sessions, share their game libraries (via Steam import or manual search through IGDB), and a recommendation algorithm suggests games the whole group will like.

All frontend pages and components were developed by **gaesteve** (Product Owner).

## Technical choices

| Technology | Why |
|------------|-----|
| **React** | Industry-standard framework with a large ecosystem. I wanted to learn a tool used in real-world production environments. React's component-based architecture made it easy to split the UI into reusable, independent pieces. |
| **TypeScript** | Catches type errors at compile time instead of runtime, which helped a lot during development since i had 0 prior frontend experience. |
| **Tailwind CSS** | Recommended by peers. Utility-first approach keeps styles close to the markup, avoids CSS file bloat, and speeds up prototyping significantly. |
| **Vite** | Recommended by peers. Near-instant hot reload during development compared to alternatives like Webpack. Built-in TypeScript and React support out of the box. |
| **Socket.io** | Needed real-time communication for lobby/session features (chat, player join/leave). Socket.io handles reconnection and fallback automatically. |
| **Motion** (framer-motion) | Smooth page transitions and UI animations with a declarative API that fits well with React's component model. |

## Features

| Feature | Description |
|---------|-------------|
| Home page | Landing page with project presentation and call-to-action |
| Register / Login | Email + password authentication with form validation |
| Dashboard | Overview tab, game history, personal library with Steam import |
| Session / Lobby | Create or join a session, real-time player list via WebSocket, in-lobby chat |
| Library | Search games (IGDB), add/remove from personal library, Steam sync |
| Profile | View/edit user profile, avatar, username |
| Steam Callback | OAuth callback handler for Steam library import |
| Privacy Policy / Terms of Service | Legal pages accessible from footer |
| Navbar | Search bar with debounce, user dropdown, responsive layout |
| Auth system | AuthContext (React Context), protected routes, token management |
| Return to session banner | Persistent banner on Dashboard when user has an active lobby |

## Project structure

'''
src/
├── components/
│   ├── context/       # AuthContext — authentication state management
│   └── ui/            # Button, Input, Logo — reusable UI components
├── hooks/             # useLobbySocket — WebSocket lifecycle hook
├── pages/             # All page components (10 pages)
├── App.tsx            # Route definitions (React Router)
└── main.tsx           # Entry point
'''

## Configuration

The frontend has no `.env` file — all API calls go through the Nginx reverse proxy, so no environment variables are needed. The proxy routes:

- `/api/*` → backend (NestJS)
- `/socket.io/*` → backend WebSocket gateway
- Everything else → frontend static files

For local development outside Docker:

```bash
npm install
npm run dev
```

In production (Docker), the frontend is built as static files and served by Nginx on `https://localhost`.

## AI usage

AI tools (Claude) were used throughout frontend development as a learning companion. Specifically:

- **Learning**: understanding React concepts (hooks, context, routing, component lifecycle) since this was a first experience with frontend frameworks.
- **Debugging**: diagnosing issues with WebSocket connections, state management bugs, and CSS layout problems.
- **Assisted implementation**: getting help on specific parts that were blocking progress, such as the WebSocket hook and search debounce logic.
