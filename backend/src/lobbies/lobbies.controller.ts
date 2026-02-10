import { Controller, Get, Post, Param, Body, HttpCode, UseGuards, Req } from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { CreateLobbyDto } from "./dto/create-lobby.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { Request as ExpressRequest } from "express";
import { CurrentUser } from "src/auth/current-user.decorator";
import type { JwtUser } from "src/auth/jwt-user";

type RequestWithUser = ExpressRequest & { user: { id: string } };
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
	@UseGuards(JwtAuthGuard)
	@Post(":id/join")
	join(@Param("id") lobbyId: string, @CurrentUser("id") userId: string)
	{
		return this.service.joinLobby(lobbyId, userId);
	}
}