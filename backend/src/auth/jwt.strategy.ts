import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "src/users/users.service";

type	JwtPayload = {
	sub: string;
};

// Use of "super" because we need to initialize the parent class before using the child class
// inheritence with extends
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt")
{
	constructor(
		private readonly config: ConfigService,
		private readonly users: UsersService,
	)
	{
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: config.get<string>("JWT_SECRET")!,
		});
	}
	async validate(payload: JwtPayload)
	{
		const user = await this.users.findById(payload.sub);
		if (!user)
			throw new UnauthorizedException("Invalid token");
		return {
			id: user.id,
			email: user.email,
			username: user.username,
			steamId: user.steamId,
			avatarUrl: user.avatarUrl,
		};
	}
}
