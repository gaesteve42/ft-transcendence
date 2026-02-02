import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getLobbyById as getLobbyByIdLogic, createLobby as createLobbyLogic, joinLobby as joinLobbyLogic} from "./lobbies.logic";

@Injectable()
export class LobbiesService{
	getLobbyById(id: string){
		const result = getLobbyByIdLogic(id);
		if (!result.ok){
			throw new NotFoundException(result.error);
		}
		return result.lobby;
	}
	createLobby(name: string, maxPlayers: number){
		const result = createLobbyLogic(name, maxPlayers);
		if (!result.ok){
			throw new BadRequestException(result.error);
		}
		return result.lobby;
	}
	joinLobby(lobbyId: string, playerId: string)
	{
		const result = joinLobbyLogic(lobbyId, playerId);
		if (!result.ok){
			if (result.error === "Lobby not found")
				throw new NotFoundException(result.error);
			throw new BadRequestException(result.error);
		}
		return result.lobby;
	}
}
