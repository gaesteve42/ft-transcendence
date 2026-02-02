import { Lobby, LobbyResult } from "./types/lobby";
import { isEmpty } from "../common/utils/strings";

const lobbies = new Map<string, Lobby>();
export function createLobby(name: string, maxPlayers: number): LobbyResult
{
	const lobby: Lobby = 
	{
		id : "id",
		name : name,
		maxPlayers : maxPlayers,
		players : []
	};
	if (isEmpty(name))
		return {ok:false, error:"Invalid name"};
	else if (maxPlayers < 1 || maxPlayers > 4)
		return  {ok: false, error:"Invalid maxPlayers" };	
	const id = Math.random();
	lobby.id = id.toString();
	lobbies.set(lobby.id, lobby);
	return {ok:true,lobby};
}

export function getLobbyById(id: string): LobbyResult
{
	const lobby = lobbies.get(id);
	if (lobby === undefined)
		return {ok:false, error: "Lobby not found"};
	else
		return {ok:true, lobby};
}

export function joinLobby(lobbyId: string, playerId: string): LobbyResult
{
	const result = getLobbyById(lobbyId);
	if (!result.ok) 
		return {ok:false, error: result.error};
	const lobby = result.lobby;
	if (lobby.players.length >= lobby.maxPlayers)
		return {ok:false, error: "Too many players in this lobby"};
	if (playerId.length === 0)
		return {ok:false, error: "Player ID is empty"};
	if (lobby.players.includes(playerId))
		return {ok:false, error: "Player is already inside the lobby"};
	lobby.players.push(playerId);
	return {ok: true, lobby};
}
