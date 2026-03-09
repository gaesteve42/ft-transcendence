import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { User } from "src/users/types/users";
import { randomUUID } from "node:crypto";

@Injectable()	
export class SteamAuthService{
	private readonly codes = new Map<string, { userId: string; expiresAt: number }>();

	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService,
		private readonly audit: AuditLoggerService,
	){}
	async loginWithSteam(steamId: string, username: string, avatarUrl: string) : Promise<{userId: string}>{
		this.audit.log("auth.steam.login.attempt", { steamId });
		try{
			const existing = await this.users.findBySteamId(steamId);
			let user : User;
			if (existing){
				this.audit.log("auth.steam.login.existing_user", { steamId, userId: existing.id });
				user = await this.users.updateSteamProfile(existing.id, avatarUrl, new Date());
			}
			else{
				user = await this.users.createSteamUser({steamId, username, avatarUrl});
				this.audit.log("auth.steam.login.created_user", { steamId, userId: user.id });
			}
			this.audit.log("auth.steam.login.success", { steamId, userId: user.id });
			return {userId: user.id};
		}
		catch(error:unknown){
			this.audit.warn("auth.steam.login.fail", {steamId, reason: "unexpected_error",});
				throw error;
		}
	}
	consumeCode(code: string) : string{
		const cleanCode = code.trim();
		if (cleanCode.length === 0)
			throw new BadRequestException("Error code is empty");
		const entry = this.codes.get(cleanCode);
		if (!entry)
			throw new UnauthorizedException("Code isnt valid");
		if (Date.now() > entry.expiresAt)
		{
			this.codes.delete(cleanCode);
			throw new UnauthorizedException("code expired");
		}
		this.codes.delete(cleanCode);
		return entry.userId;
	}
	createCode(userId: string): string{
		const cleanUserId = userId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("Error user id is empty");
		const code = randomUUID();
		const expiresAt = Date.now() + 60_000;
		this.codes.set(code,{userId: cleanUserId, expiresAt});
		return code;
	}
	exchangeCode(code: string): {accessToken: string}{
		const userId = this.consumeCode(code);
		const accessToken = this.jwt.sign({sub: userId});
		return {accessToken};
	}
}
