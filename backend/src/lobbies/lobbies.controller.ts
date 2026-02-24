import { Controller, Get, Post, Param, Body, HttpCode, UseGuards, Put} from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { CreateLobbyDto } from "./dto/create-lobby.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { SetLobbyTagsDto } from "./dto/set-lobby-tags.dto";

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
	@UseGuards(JwtAuthGuard)
	@Post()
	create(@Body() body : CreateLobbyDto, @CurrentUser("id") userId: string)
	{
		return this.service.createLobby(body.name, body.maxPlayers, userId);
	}
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@Post(":id/join")
	join(@Param("id") lobbyId: string, @CurrentUser("id") userId: string)
	{
		return this.service.joinLobby(lobbyId, userId);
	}
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@Post(":id/leave")
	leave(@Param("id") lobbyId: string, 
	@CurrentUser("id") userId: string)
	{
		return this.service.leaveLobby(lobbyId, userId);
	}
	@UseGuards(JwtAuthGuard)
	@Put(":id/tags")
	setTags(
		@Param("id") lobbyId: string,
		@CurrentUser("id") userId: string,
		@Body() body: SetLobbyTagsDto,
	){
		return this.service.setPlayerTags(lobbyId, userId, body.tagIds);
	}
	@UseGuards(JwtAuthGuard)
	@Get(":id/readiness")
	readiness(
		@Param("id") lobbyId: string,
	){
		return this.service.getLobbyReadiness(lobbyId);
	}
}