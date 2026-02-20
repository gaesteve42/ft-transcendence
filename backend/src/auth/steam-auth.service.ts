import { Injectable } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import { JwtService } from "@nestjs/jwt";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";
import { User } from "src/users/types/users";

@Injectable()	
export class SteamAuthService{
	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService,
		private readonly audit: AuditLoggerService,
	){}
	async loginWithSteam(steamId: string, username: string, avatarUrl: string) : Promise<{accessToken: string}>{
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
			const token = this.jwt.sign({sub: user.id});
			this.audit.log("auth.steam.login.success", { steamId, userId: user.id });
			return {accessToken: token};
		}
		catch(error:unknown){
			this.audit.warn("auth.steam.login.fail", {steamId, reason: "unexpected_error",});
				throw error;
		}
	}
}
