import { Controller, Get, Post, Param, Body} from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { CreateLobbyDto } from "./dto/create-lobby.dto";



@Controller("api/lobbies")
export class LobbiesController{
	constructor(private readonly service : LobbiesService){}
	@Get("ping")
	ping(){
		return {ok: true};
	}
	@Get(":id")
	id(@Param("id") id : string) {
		return this.service.getLobbyById(id);
	}
	@Post()
	create(@Body() body : CreateLobbyDto)
	{
		return this.service.createLobby(body.name, body.maxPlayers);
	}
	
} 