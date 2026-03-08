export type LobbyPlayer = {
  id: string;
  username: string;
  avatarUrl: string | null;
};

export type Lobby = {
  id: string;
  name: string;
  maxPlayers: number;
  players: LobbyPlayer[];
  ownerId: string;
};
