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
	/**
	 * 
	 * @param name 
	 * @param maxPlayers 
	 * @param userId Need to be connected to create a lobby + auto join 
	 * @returns 
	 */
	createLobby(name: string, maxPlayers: number, userId: string) : Lobby
	{
		const cleanName = name.trim();
		if (cleanName.length === 0)
     			throw new BadRequestException("Invalid name");
		if (!Number.isInteger(maxPlayers) || maxPlayers  < 2 || maxPlayers > 4)
			throw new BadRequestException("Invalid maxPlayers");
		if (!userId || userId.length === 0)
			throw new BadRequestException("Invalid user");
		const lobby: Lobby = 
		{
			id: randomUUID(),
			name: cleanName,
			maxPlayers: maxPlayers,
			players: [userId],
			ownerId: userId,
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
	listLobbies() : Lobby[]
	{
		return Array.from(this.lobbies.values());
	}
}
