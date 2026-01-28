import { IncomingMessage, ServerResponse } from "http";
import { sendJson } from "./response";
import { stringify } from "querystring";
import { router} from "./router";
import { Lobby, LobbyResult } from "./types/lobbies";
import { fail } from "assert";

// ici createLobby, getLobbyById

function isEmpty(str: string): boolean {
	if (str.length === 0){
		return true;
	}
	else
		return false;
}

const lobbies = new Map<string, Lobby>();
export function createLobby(name: string, maxPlayers: number): LobbyResult{
	const lobby: Lobby = {
		id : "id",
		name : name,
		maxPlayers : maxPlayers,
		players : []
	};
	if (isEmpty(name))
		return {ok:false, error:"Invalid name"};
	else if (maxPlayers <= 0)
		return  {ok: false, error:"Invalid maxPlayers" };	
	const id = Math.random();
	lobby.id = id.toString();
	lobbies.set(lobby.id, lobby);
	return {ok:true,lobby};
}


export function getLobbiesById(id: string): LobbyResult
{
	const lobby = lobbies.get(id);
	if (lobby === undefined)
		return {ok:false, error: "Lobby not found"};
	else
		return {ok:true, lobby};
}