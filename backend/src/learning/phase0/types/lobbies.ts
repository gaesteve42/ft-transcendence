export type Lobby = {
  id: string;
  name: string;
  maxPlayers: number;
  players: string[];
};

export type LobbyResult =
  | { ok: true; lobby: Lobby }
  | { ok: false; error: string };