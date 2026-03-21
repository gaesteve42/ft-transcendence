import { Injectable, BadRequestException, NotFoundException} from "@nestjs/common";
import { User } from "./types/users";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma, User as PrismaUser, AuthProvider } from "@prisma/client";


@Injectable()
export class UsersService{
	constructor(
		private readonly prisma: PrismaService,
	){}
		private toDomain(user: PrismaUser): User{
			return{
				 	id: user.id,
					steamId: user.steamId,
					avatarUrl: user.avatarUrl,
					email: user.email,
					username: user.username,
					passwordHash: user.passwordHash,
					steamLinkedAt : user.steamLinkedAt,
					lastSteamUpdated: user.lastSteamUpdated,
					lastSeenAt: user.lastSeenAt,
					authProvider: user.authProvider,
			};
	}
		private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  			return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
	}
		private isNotFoundError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  			return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025");
	}
	async createLocalUser(email:string, username: string, passwordHash: string): Promise<User>{
		try {
			const created = await this.prisma.user.create({
				data: {email, username, passwordHash},
		});
		return (this.toDomain(created));
		} catch (error: unknown)
		{
			if (!this.isUniqueConstraintError(error))
				throw error;
			let target = "";
			if(Array.isArray(error.meta?.target))
			{
				target = error.meta.target.map((value) => String(value)).join(",");
			}
			if (target.includes("email"))
				throw new BadRequestException("Email already used");
    			if (target.includes("username"))
				throw new BadRequestException("Username already used");
    			throw new BadRequestException("User already exists"); 
		}
	}
	async searchByUsername(query: string, limit = 10): Promise<User[]>{
		const users = await this.prisma.user.findMany({
			where: { username: { contains: query, mode: "insensitive" } },
			take: limit,
			orderBy: { username: "asc" },
		});
		return users.map((u) => this.toDomain(u));
	}
	async findByUsername(username: string): Promise<User | undefined>{
		const user = await this.prisma.user.findUnique({where: {username}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
	async findById(id: string): Promise<User | undefined>{
		const user = await this.prisma.user.findUnique({where: {id}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
	async findByEmail(email: string): Promise<User | undefined>{ 

		const user = await this.prisma.user.findUnique({where: {email}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
	async findBySteamId(steamId: string): Promise <User | undefined> {
		const user =  await this.prisma.user.findUnique({
			where : {steamId}
		});
		if (!user)
			return undefined;
		return (this.toDomain(user));
	}
	async createSteamUser(input:{steamId: string, username: string, avatarUrl: string | null}): Promise<User> {
		try {
			const created = await this.prisma.user.create({
				data: {steamId: input.steamId, username: input.username, avatarUrl: input.avatarUrl, authProvider: AuthProvider.STEAM, steamLinkedAt : new Date()},
			})
			return (this.toDomain(created))
		}
		catch(error: unknown){
			if (!this.isUniqueConstraintError(error))
				throw error;
			let target = "";
			if(Array.isArray(error.meta?.target))
			{
				target = error.meta.target.map((value) => String(value)).join(",");
			}
			if (target.includes("steamId"))
				throw new BadRequestException("Steam account already linked");
    			if (target.includes("username"))
				throw new BadRequestException("Username already used");
			throw new BadRequestException("User already exists");
		}
	}
	async updateSteamProfile(userId: string, avatarUrl: string, lastSteamUpdated: Date): Promise <User>{
		try{
			const updated = await this.prisma.user.update({
			where: {id: userId},
			data:{avatarUrl: avatarUrl, lastSteamUpdated: lastSteamUpdated}
			})
			return (this.toDomain(updated));
	
		}
		catch(error:unknown)
		{
			if (this.isNotFoundError(error))
				throw new NotFoundException("User not found");
			throw error;
		}
	}
	async updatePassword(userId: string, passwordHash: string): Promise<User> {
		try {
			const updated = await this.prisma.user.update({
				where: { id: userId },
				data: { passwordHash },
			});
			return this.toDomain(updated);
		} catch (error: unknown) {
			if (this.isNotFoundError(error))
				throw new NotFoundException("User not found");
			throw error;
		}
	}
	async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
		try {
			const updated = await this.prisma.user.update({
				where: { id: userId },
				data: { avatarUrl },
			});
			return this.toDomain(updated);
		} catch (error: unknown) {
			if (this.isNotFoundError(error))
				throw new NotFoundException("User not found");
			throw error;
		}
	}
	async updateLastSeen(userId: string): Promise<void> {
		await this.prisma.user.update({
			where: { id: userId },
			data: { lastSeenAt: new Date() },
		});
	}
	async linkSteamToLocalUser(userId: string, steamId: string, avatarUrl: string): Promise<User>{
		const existingUser= await this.findById(userId);
		const now = new Date();
		if (!existingUser)
			throw new NotFoundException("User not found");
		const existingSteamUser = await this.findBySteamId(steamId);
		// Re-linking the same Steam identity should stay idempotent and only refresh Steam metadata.
		if (existingSteamUser && existingSteamUser.id === existingUser.id)
			return this.updateSteamProfile(userId, avatarUrl, now);
		if (existingSteamUser && existingSteamUser.id !== existingUser.id)
			throw new BadRequestException("Steam account already linked to another user");
		if (existingUser.steamId && existingUser.steamId !== steamId)
			throw new BadRequestException("User already linked to another Steam account");
		// First link attaches the Steam identity to the already authenticated local account.
		const updated = await this.prisma.user.update({
			where: {id: userId},
			data:{
				steamId,
				avatarUrl,
				steamLinkedAt: now,
				lastSteamUpdated: now,
			}
		})
		return this.toDomain(updated);
	}
}
