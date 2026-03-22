import { Controller, Get, Post, Param, Body, HttpCode, UseGuards, Put, Delete, ForbiddenException, BadRequestException} from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { LobbyGateway } from "./lobby.gateway";
import { RecommendService } from "./recommend.service";
import { CreateLobbyDto } from "./dto/create-lobby.dto";
import { JwtAuthGuard } from "src/auth/jwt-auth.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { SetLobbyTagsDto } from "./dto/set-lobby-tags.dto";

@Controller("api/lobbies")
export class LobbiesController{
	constructor(
		private readonly service : LobbiesService,
		private readonly gateway: LobbyGateway,
		private readonly recommend: RecommendService,
	){}
	@Get("ping")
	ping(){
		return {ok: true};
	}
	@UseGuards(JwtAuthGuard)
	@Get("me")
	me(@CurrentUser("id") userId: string) {
		return this.service.getMyLobby(userId);
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
	async join(@Param("id") lobbyId: string, @CurrentUser("id") userId: string)
	{
		const lobby = await this.service.joinLobby(lobbyId, userId);
		this.gateway.broadcastLobbyUpdate(lobbyId);
		return lobby;
	}
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@Post(":id/leave")
	async leave(@Param("id") lobbyId: string,
	@CurrentUser("id") userId: string)
	{
		const lobby = await this.service.leaveLobby(lobbyId, userId);
		this.gateway.broadcastLobbyUpdate(lobbyId);
		return lobby;
	}
	@UseGuards(JwtAuthGuard)
	@Put(":id/tags")
	async setTags(
		@Param("id") lobbyId: string,
		@CurrentUser("id") userId: string,
		@Body() body: SetLobbyTagsDto,
	){
		const result = await this.service.setPlayerTags(lobbyId, userId, body.tagIds);
		this.gateway.broadcastLobbyUpdate(lobbyId);
		return result;
	}
	@UseGuards(JwtAuthGuard)
	@Get(":id/tags/me")
	async getMyTags(
		@Param("id") lobbyId: string,
		@CurrentUser("id") userId: string,
	){
		return this.service.getPlayerTags(lobbyId, userId);
	}
	@UseGuards(JwtAuthGuard)
	@Delete(":id/tags")
	@HttpCode(204)
	async clearTags(
		@Param("id") lobbyId: string,
		@CurrentUser("id") userId: string,
	){
		await this.service.clearPlayerTags(lobbyId, userId);
		this.gateway.broadcastLobbyUpdate(lobbyId);
	}
	@UseGuards(JwtAuthGuard)
	@Get(":id/readiness")
	readiness(
		@Param("id") lobbyId: string,
	){
		return this.service.getLobbyReadiness(lobbyId);
	}
	@UseGuards(JwtAuthGuard)
	@Post(":id/recommend")
	async getRecommendation(
		@Param("id") lobbyId: string,
		@CurrentUser("id") userId: string,
	){
		const lobby = await this.service.getLobbyById(lobbyId);
		if (lobby.ownerId !== userId)
			throw new ForbiddenException("User isnt the leader");
		const lobbyState = await this.service.getLobbyReadiness(lobbyId);
		if (lobbyState.ready === false)
			throw new BadRequestException("All players must be ready");
		const results = await this.recommend.callRecommend(lobbyId);
		this.gateway.broadcastRecommendations(lobbyId, results);
		return results;
	}

}