import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lobby } from "./types/lobby";
import { randomUUID } from "crypto";

@Injectable()
export class LobbiesService{
	private lobbies: Map<string, Lobby>;
	constructor()
	{
		this.lobbies = new Map<string, Lobby>();
	}
	createLobby(name: string, maxPlayers: number) : Lobby
	{
		if (name.length === 0)
     			throw new BadRequestException("Invalid name");
		if (maxPlayers < 1 || maxPlayers > 4)
			throw new BadRequestException("Invalid maxPlayers");
		const lobby: Lobby = 
		{
			id: randomUUID(),
			name: name,
			maxPlayers: maxPlayers,
			players: [],
		};
		this.lobbies.set(lobby.id, lobby);
    		return	(lobby);
	}
	getLobbyById(id: string) : Lobby{
		const lobby = this.lobbies.get(id);
		if (lobby === undefined)
			throw new NotFoundException("Lobby not found");
		return (lobby);
	}
	joinLobby(lobbyId: string, playerId: string) : Lobby
	{
		const lobby = this.getLobbyById(lobbyId);
		if (playerId.length === 0)
			throw new BadRequestException("Player ID is empty");
		if (lobby.players.includes(playerId))
			throw new BadRequestException("Player is already inside the lobby");
		if (lobby.players.length >= lobby.maxPlayers)
			throw new BadRequestException("Too many players in this lobby");
		lobby.players.push(playerId);
    		return (lobby);
	}
}
