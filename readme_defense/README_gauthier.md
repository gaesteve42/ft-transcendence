# GameFinder — Frontend

## Description

Frontend of GameFinder, a web app that helps friends discover games they can enjoy together. Users create sessions, share their game libraries (via Steam import or manual search through IGDB), and a recommendation algorithm suggests games the whole group will like.

All frontend pages and components were developed by **gaesteve** (Product Owner).

### Key Features

- User registration and login (email/password + Steam OAuth)
- Real-time lobby system with WebSocket (chat, player join/leave, readiness)
- Game library management with Steam import and IGDB search
- Friend system with send/accept/decline requests and online status
- Algorithm results display with animated reveal
- User search with debounced input
- Profile viewing and editing (avatar, username, password)

## Technical Stack

### Frontend

| Technology | Why |
|------------|-----|
| **React** | Industry-standard framework with component-based architecture, making it easy to split the UI into reusable, independent pieces. |
| **TypeScript** | Catches type errors at compile time instead of runtime, which helped during development since none of us had prior frontend experience. |
| **Tailwind CSS** | Utility-first approach keeps styles close to the markup, avoids CSS file bloat, and speeds up prototyping. Wide community and good docs. |
| **Vite** | Near-instant hot reload compared to Webpack. Built-in TypeScript and React support with minimal configuration. |
| **Socket.io** | Real-time communication for lobby features (chat, player join/leave). Handles reconnection and fallback automatically. |
| **Motion** (framer-motion) | Smooth page transitions and UI animations with a declarative API that fits React's component model. |

### Configuration

The frontend has no `.env` file — all API calls go through the Nginx reverse proxy:

- `/api/*` → backend (NestJS)
- `/socket.io/*` → backend WebSocket gateway
- Everything else → frontend static files

In production (Docker), the frontend is built as static files and served by Nginx on `https://localhost`.

## Project Structure

```
src/
├── components/
│   ├── context/       # AuthContext — authentication state management
│   ├── layout/        # Header — navbar with search, friends panel, user menu
│   └── ui/            # Button, Input, Logo — reusable UI components
├── hooks/             # useLobbySocket — WebSocket lifecycle hook
├── pages/             # All page components (10 pages)
├── App.tsx            # Route definitions (React Router)
└── main.tsx           # Entry point
```

## Features List

| Feature | Description | Team Member(s) |
|---------|-------------|----------------|
| Home page | Landing page with animated presentation and call-to-action | gaesteve |
| Register / Login | Email + password authentication with form validation and password strength indicator | gaesteve |
| Dashboard | Overview tab, game history, personal library with Steam import, return-to-session banner | gaesteve |
| Session / Lobby | Create or join a session, real-time player list, in-lobby chat, tag preferences, readiness system, algorithm launch | gaesteve |
| Library | Search games (IGDB), add/remove from personal library, Steam sync | gaesteve |
| Profile | View/edit own profile (avatar, username, password), view other users' profiles, friend actions | gaesteve |
| Friend system | Send/accept/decline friend requests, friends list with online status, notification badge | gaesteve |
| Steam Callback | OAuth callback handler for Steam library import | gaesteve |
| Navbar | User search with debounce, friends panel with pending requests, user dropdown menu | gaesteve |
| Auth system | AuthContext (React Context), protected routes, JWT token management, lobby cleanup on logout | gaesteve |
| Legal pages | Privacy Policy and Terms of Service | gaesteve |

## Modules

| Module | Type | Points | Team Member(s) | Justification |
|--------|------|--------|----------------|---------------|
| Frontend framework (React) | Major | 2 | gaesteve | SPA built with React + TypeScript + Vite, using hooks, Context API, and React Router for a full component-based architecture |
| Standard user management | Minor | 1 | gaesteve | Registration, login, profile editing (avatar, username, password), user search, viewing other profiles |
| User interaction (friends) | Minor | 1 | gaesteve | Friend request system (send/accept/decline), friends list with online/offline status, pending requests with notifications |

**Total points:** 4

## Individual Contributions

### gaesteve

- Designed and built all 10 frontend pages (Home, Login, Register, Dashboard, Session, Library, Profile, SteamCallback, PrivacyPolicy, TermsOfService).
- Implemented the AuthContext for global authentication state, protected routes, and token management.
- Built the `useLobbySocket` custom hook for WebSocket lifecycle management (connect, disconnect, event listeners, reconnection).
- Implemented real-time lobby features: chat, player list updates, readiness system, tag preference selection, algorithm launch with animated reveal.
- Built the friend request system UI: send/accept/decline on profiles, friends panel in navbar with online status and pending request notifications.
- Implemented user search with debounced API calls in the navbar.
- Integrated Steam OAuth flow (login + library link) on the frontend side.
- Implemented avatar upload, username editing, and password change on the profile page.

## Resources

### Documentation & References

- [React official documentation](https://react.dev)
- [TypeScript official documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS documentation](https://tailwindcss.com/docs)
- [HTML & CSS fundamentals](https://developer.mozilla.org) (MDN Web Docs)
- [Socket.io client documentation](https://socket.io/docs/v4/client-api/)
- [Motion (framer-motion) documentation](https://motion.dev/)
- YouTube — React tutorials, TypeScript complete tutorial
- Obsidian — used as a study companion in order to store every concept and notions of my technologies in order to reuse them easily in the future.

### AI Usage

AI (Claude) was used throughout frontend development as a learning companion:

- **Learning**: Understanding React concepts and Tailwind CSS (hooks, context, routing, component lifecycle) since this was a first experience with frontend frameworks.
- **Debugging**: Diagnosing issues with WebSocket connections, state management bugs, and CSS layout problems.
- **Assisted implementation**: Getting help on specific parts that were blocking progress, such as the WebSocket hook, search debounce logic, and friend request system.
- **Code review**: Reviewing code for best practices and potential issues before pushing.
