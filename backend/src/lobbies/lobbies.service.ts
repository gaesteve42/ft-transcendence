import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { getLobbyById as getLobbyByIdLogic, createLobby as createLobbyLogic} from "./lobbies.logic";

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
}