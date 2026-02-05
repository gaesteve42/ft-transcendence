import { Controller, Get, Post, Param, Body, HttpCode} from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { CreateLobbyDto } from "./dto/create-lobby.dto";
import { JoinLobbyDto } from "./dto/join-lobby.dto";



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
	@Get()
	list()
	{
		return this.service.listLobbies();
	}
	@Post()
	create(@Body() body : CreateLobbyDto)
	{
		return this.service.createLobby(body.name, body.maxPlayers);
	}
	@HttpCode(200)
	@Post(":id/join")
	join(@Param("id") id : string, @Body() body : JoinLobbyDto)
	{
		return this.service.joinLobby(id, body.playerId);
	}
}