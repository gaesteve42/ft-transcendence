import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lobby } from "./types/lobby";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma, Lobby as PrismaLobby} from "@prisma/client";

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
		const lobby = await this.prisma.lobby.create({
			data: {
				name: cleanName,
				maxPlayers: maxPlayers,
				ownerId: userId,
			},
		});
		await this.prisma.lobbyMember.create({
			data:{
				lobbyId: lobby.id,
				userId: userId,
			}
		});
		this.audit.lobbyCreated(lobby.id, userId);
		return (this.getLobbyById(lobby.id));
	}
	async getLobbyById(id: string): Promise<Lobby> {
		const lobby = await this.getLobbyRaw(id);
		if (!lobby) 
			throw new NotFoundException("Lobby not found");
		return (this.toDomain(lobby));
	}

	async joinLobby(lobbyId: string, playerId: string) : Promise <Lobby>
	{
		if (!playerId || playerId.length === 0)
			throw new BadRequestException("Player ID is empty");
		const lobby = await this.getLobbyById(lobbyId);
		if (lobby.players.includes(playerId))
			throw new BadRequestException("Player is already inside the lobby");
		if (lobby.players.length >= lobby.maxPlayers)
			throw new BadRequestException("Too many players in this lobby");
		try{
			await this.prisma.lobbyMember.create({
   			data: {
				lobbyId,
				userId: playerId,
				},
			});
		}
		catch (error:unknown) {
			if (!this.isUniqueConstraintError(error)){
				throw error;
			}
			throw new BadRequestException("Player is already inside a lobby");	
		}
		this.audit.lobbyJoin(lobbyId, playerId);
    		return (this.getLobbyById(lobbyId));
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
	async leaveLobby(lobbyId: string, userId: string) : Promise <Lobby>
	{
		if (!userId || userId.length === 0)
			throw new BadRequestException("User invalid");
		const lobby = await this.getLobbyById(lobbyId);
		if (!lobby.players.includes(userId))
			throw new BadRequestException("Player is not inside the lobby");
		await this.prisma.lobbyMember.delete({
			where: {
				lobbyId_userId: { lobbyId, userId },
				},
			});
		const remainingMembers = await this.prisma.lobbyMember.findMany({
			where: {lobbyId},
			select: {userId: true},
			orderBy: { joinedAt: "asc"},
		});
		if (remainingMembers.length === 0){
			await this.prisma.lobby.delete({
				where: {id: lobbyId},
			});
			return {
			...lobby,
			players: [],
			};
		}
		if (lobby.ownerId === userId){
			await this.prisma.lobby.update({
				where: {id: lobbyId},
				data: {ownerId: remainingMembers[0].userId},
			});
		}
		return (this.getLobbyById(lobbyId));
	}
}
