import { Injectable } from "@nestjs/common";
import { getLobbyById as getLobbyByIdLogic } from "./lobbies.logic";

@Injectable()
export class LobbiesService{
	getLobbyById(id: string){
		return getLobbyByIdLogic(id);
	}
}