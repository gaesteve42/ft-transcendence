import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lobby } from "./types/lobby";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma, Lobby as PrismaLobby} from "@prisma/client";
import { arrayNotEmpty } from "class-validator";
import { SetLobbyTagsDto } from "./dto/set-lobby-tags.dto";

type LobbyWithMembers = {
	id: string;
	name: string;
	maxPlayers: number;
	ownerId: string;
	members: Array<{ userId: string }>;
};
@Injectable()
export class LobbiesService{
	constructor(private readonly audit: AuditLoggerService,
			private readonly prisma: PrismaService,
	){}
		private  toDomain(lobby: LobbyWithMembers): Lobby{
			return {
					id: lobby.id,
					name : lobby.name,
					maxPlayers: lobby.maxPlayers,
					ownerId: lobby.ownerId,
					players: lobby.members.map((member)=> member.userId),	
		};
	}
	private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
				return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
	}
	private isSerializationFailure(error: unknown): error is Prisma.PrismaClientKnownRequestError {
		return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034");
	}
	/**
	 * 
	 * @param operation Transaction with a limited number of tries.
	 * @param tx Life of tx is only between the start and end of operation. The goal is to copy this.prisma but
	 * in a safe way to prevent concurrantial problems.
	 * @returns 
	 */
	private async runSerializable<T>(
		operation: (tx: Prisma.TransactionClient) => Promise<T>,
	): Promise<T> {
		const maxRetries = 3;
		for (let attempt = 1; attempt <= maxRetries; attempt++){
			try{
				return (await this.prisma.$transaction(
					async (tx) => operation(tx),
					{isolationLevel: Prisma.TransactionIsolationLevel.Serializable},
				));
			} catch (error: unknown){
				if (!this.isSerializationFailure(error) || attempt === maxRetries){
					throw error;
				}
			}
		}
		throw new Error("Unreachable");
	}
	private async getLobbyRaw(id: string): Promise<LobbyWithMembers | null> {
		return (this.prisma.lobby.findUnique)({
			where: { id },
			select: {
				id: true,
				name: true,
				maxPlayers: true,
				ownerId: true,
				members: {
					select: { userId: true },
					orderBy: { joinedAt: "asc" },
				},
			},
		});
	}
	/**
	 * 
	 * @param name 
	 * @param maxPlayers 
	 * @param userId Need to be connected to create a lobby + auto join 
	 * @returns 
	 */
	async createLobby(name: string, maxPlayers: number, userId: string) : Promise<Lobby>
	{
		const cleanName = name.trim();
		if (cleanName.length === 0)
     			throw new BadRequestException("Invalid name");
		if (!Number.isInteger(maxPlayers) || maxPlayers  < 2 || maxPlayers > 4)
			throw new BadRequestException("Invalid maxPlayers");
		if (!userId || userId.length === 0)
			throw new BadRequestException("Invalid user");
		return this.runSerializable(async (tx) => {
			const lobby = await tx.lobby.create({
				data: {
					name: cleanName,
					maxPlayers: maxPlayers,
					ownerId: userId,
				},
			});
			await tx.lobbyMember.create({
				data:{
					lobbyId: lobby.id,
					userId: userId,
				},
			});
			this.audit.lobbyCreated(lobby.id, userId);
			const lobbyRaw = await this.findLobbyRawOrThrow(tx, lobby.id);
			return this.toDomain(lobbyRaw);
		}) 
	}
	async getLobbyById(id: string): Promise<Lobby> {
		const lobby = await this.getLobbyRaw(id);
		if (!lobby) 
			throw new NotFoundException("Lobby not found");
		return (this.toDomain(lobby));
	}
	private assertJoinAllowed(lobby: Lobby, playerId: string): void{
		if (!playerId || playerId.length === 0)
			throw new BadRequestException("Player ID is empty");
		if (lobby.players.includes(playerId))
			throw new BadRequestException("Player is already inside the lobby");
		if (lobby.players.length >= lobby.maxPlayers)
			throw new BadRequestException("Too many players in this lobby");
	}
	private async createMembershipOrThrow(
		tx: Prisma.TransactionClient,
		lobbyId: string,
		playerId: string,
	): Promise<void>{
		try{
			await tx.lobbyMember.create({
				data:{
					lobbyId: lobbyId,
					userId: playerId,
				},
			});
		}catch (error: unknown){
			if (!this.isUniqueConstraintError(error))
				throw error;
			throw new BadRequestException("Player is already inside a lobby");
		}
	}
	private async findLobbyRawOrThrow(
		tx: Prisma.TransactionClient,
		lobbyId: string,
	): Promise<LobbyWithMembers>{
		const lobbyRaw = await tx.lobby.findUnique({
			where: {id: lobbyId},
			select: {
				id: true,
				name: true,
				maxPlayers: true,
				ownerId: true,
				members:{
					select: {userId: true},
					orderBy: {joinedAt: "asc"},
				},
			},
		});
		if (!lobbyRaw)
			throw new NotFoundException("Lobby not found");
		return (lobbyRaw);
	}
	async joinLobby(lobbyId: string, playerId: string) : Promise <Lobby>{
		return this.runSerializable(async (tx) => {
			const lobbyRaw = await this.findLobbyRawOrThrow(tx, lobbyId);
			const lobby = this.toDomain(lobbyRaw);
			this.assertJoinAllowed(lobby, playerId);
			await this.createMembershipOrThrow(tx, lobbyId, playerId);
			this.audit.lobbyJoin(lobbyId, playerId);
			const updatedRaw = await this.findLobbyRawOrThrow(tx, lobbyId);
			return this.toDomain(updatedRaw);
		});
	}
	async listLobbies(): Promise<Lobby[]> {
		const lobbies = await this.prisma.lobby.findMany({
			select: {
				id: true,
				name: true,
				maxPlayers: true,
				ownerId: true,
				members: {
					select: { userId: true },
					orderBy: { joinedAt: "asc" },
				},
			},
			orderBy: { createdAt: "desc" },
		});
		return (lobbies.map((lobby) => this.toDomain(lobby)));
	}
	private assertLeaveAllowed(lobby: Lobby, userId: string): void{
		if (!userId || userId.length === 0)
			throw new BadRequestException("User invalid");
		if (!lobby.players.includes(userId))
			throw new BadRequestException("Player is not inside the lobby");
	}
	private async removeMembershipOrThrow(
		tx:Prisma.TransactionClient,
		lobbyId: string,
		userId: string,
	): Promise<void>{
		await tx.lobbyMember.delete({
			where: {
				lobbyId_userId:{
					lobbyId: lobbyId,
					userId: userId,
				},
			},
		});
	}
	private async handleOwnerTransferOrLobbyDelete(
		tx: Prisma.TransactionClient,
		lobby: Lobby,
		lobbyId: string,
		leavingUserId: string,
	): Promise <void>{
		const remainingMembers = await tx.lobbyMember.findMany({
			where: {lobbyId: lobbyId},
			select: {userId: true},
			orderBy: {joinedAt: "asc"},
		});
		if (remainingMembers.length === 0){
			await tx.lobby.delete({
				where:{id: lobbyId},
			});
			return ;
		}
		if (lobby.ownerId === leavingUserId){
			await tx.lobby.update({
				where: {id: lobbyId},
				data: {ownerId: remainingMembers[0].userId},
			});
		}
	}
	async leaveLobby(lobbyId: string, userId: string) : Promise <Lobby>
	{
		return this.runSerializable(async (tx) => {
			const lobbyRaw = await this.findLobbyRawOrThrow(tx, lobbyId);
			const lobby = this.toDomain(lobbyRaw);

			this.assertLeaveAllowed(lobby, userId);
			await this.removeMembershipOrThrow(tx, lobbyId, userId);
			await this.handleOwnerTransferOrLobbyDelete(tx, lobby, lobbyId, userId);
			const updatedRaw = await tx.lobby.findUnique({
				where: {id: lobbyId},
				select:{
					id: true,
					name: true,
					maxPlayers: true,
					ownerId: true,
					members: {
						select: {userId: true},
						orderBy:{ joinedAt:"asc"},
					},
				},
			});
			if (!updatedRaw)
				return {
			...lobby,
			players:[],
		};
		return this.toDomain(updatedRaw);
		});
	}
	async setPlayerTags(lobbyId: string, userId: string, tagIds: string[]): Promise<{lobbyId: string; userId: string; tagIds: string[]}> {
		if (!tagIds || tagIds.length === 0)
			throw new BadRequestException("Tags not found");
		return this.runSerializable(async (tx) => {
			const lobby = await tx.lobby.findUnique(
				{where: {id: lobbyId},
				select: {id: true}});
			if (!lobby)
				throw new NotFoundException("Lobby not found");
			const membership = await tx.lobbyMember.findUnique({
				where: {lobbyId_userId: {lobbyId, userId}},
				select: {userId: true},
			});
			if (!membership)
				throw new BadRequestException("Player is not inside the lobby");
			const existingTags = await tx.tag.findMany({
				where: {id: {in : tagIds}},
				select: {id:true},
			});
			if (existingTags.length !== tagIds.length)
				throw new BadRequestException("One or more tags are invalid");
			await tx.lobbyTagPreference.deleteMany({
				where: { lobbyId, userId },
				});
			await tx.lobbyTagPreference.createMany({
				data: tagIds.map((tagId) => ({
					lobbyId,
					userId,
					tagId,
					})),
			});
			return { lobbyId, userId, tagIds };
		})
	}
	async getLobbyReadiness(lobbyId: string): Promise<{lobbyId: string; totalPlayers: number; playersWithTags: number; ready: boolean; missingUserIds: string[]}> {
		const lobby = await this.getLobbyById(lobbyId);
		const totalPlayers = lobby.players.length;

		const tagRows = await this.prisma.lobbyTagPreference.findMany({
			where: {lobbyId: lobbyId},
			select: {userId: true},
		});
		const usersWithTags = new Set(tagRows.map((row) => row.userId));
		const missingUserIds = lobby.players.filter((id) => !usersWithTags.has(id));
		return {
			lobbyId: lobbyId,
			totalPlayers,
			playersWithTags: totalPlayers - missingUserIds.length,
			ready : missingUserIds.length === 0 && totalPlayers > 0,
			missingUserIds,
		};
	}
}
