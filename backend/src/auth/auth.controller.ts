import { Body, Controller, HttpCode, Post, UseGuards, Get, Req, Res, InternalServerErrorException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { SteamExchangeDto } from "./dto/steam-exchange.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { SteamAuthService } from "./steam-auth.service";
import { AuthGuard } from "@nestjs/passport";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";


@Controller("api/auth")
export class AuthController{
	constructor(private readonly auth : AuthService,
			private readonly steamAuth: SteamAuthService,
			private readonly config : ConfigService,
	){}
	@HttpCode(201)
	@Post("register")
	register(@Body()body : RegisterDto){
		return this.auth.register(body);
	}
	@HttpCode(200)
	@Post("login")
	login(@Body() body : LoginDto){
		return this.auth.login(body);
	}
	@UseGuards(JwtAuthGuard)
	@Get("me")
	me(@CurrentUser() user: {id: string, email: string, username: string, steamId: string | null, avatarUrl: string | null}){
		return user;
	}
	@UseGuards(AuthGuard("steam"))
	@Get("steam")
	loginSteam():void{}
	@UseGuards(AuthGuard("steam"))
	@Get("steam/return")
	async steamReturn(@Req() req: {user: {steamId: string; username: string; avatarUrl: string;}}, @Res() res: Response){
		const result = await this.steamAuth.loginWithSteam(req.user.steamId, req.user.username, req.user.avatarUrl);
		const code = this.steamAuth.createCode(result.userId);
		const frontendUrl = this.config.get<string>("FRONTEND_URL");
		if (!frontendUrl ||frontendUrl?.trim().length === 0)
			throw new InternalServerErrorException("Frontend url isnt valid");
		res.redirect(302, `${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`);
	};
	@HttpCode(200)
	@Post("steam/exchange")
	exchangeCode(@Body() body: SteamExchangeDto){
		return this.steamAuth.exchangeCode(body.code);
	}
}
