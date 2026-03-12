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
import { Public } from "./public.decorator";


@Controller("api/auth")
export class AuthController{
	constructor(private readonly auth : AuthService,
			private readonly steamAuth: SteamAuthService,
			private readonly config : ConfigService,
	){}
	@HttpCode(201)
	@Public()
	@Post("register")
	register(@Body()body : RegisterDto){
		return this.auth.register(body);
	}
	@HttpCode(200)
	@Public()
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
	@Public()
	@Get("steam")
	loginSteam():void{}
	@UseGuards(AuthGuard("steam"))
	@Public()
	@Get("steam/return")
	async steamReturn(@Req() req: {user: { steamId: string; username: string; avatarUrl: string };
	cookies?: Record<string, string>;},
	@Res() res: Response){
		const intentId = req.cookies?.steam_link_intent;
		let result: {userId: string};
		// Si le cookie d'intention existe, on rattache le compte Steam au compte local déjà authentifié.
		if (intentId){
			const userId = this.steamAuth.consumeLinkIntent(intentId);
			result = await this.steamAuth.linkSteamAccount(userId, req.user.steamId, req.user.avatarUrl);
		}
		else {
			result = await this.steamAuth.loginWithSteam(req.user.steamId, req.user.username, req.user.avatarUrl);
		}
		const code = this.steamAuth.createCode(result.userId);
		const frontendUrl = this.config.get<string>("FRONTEND_URL");
		if (!frontendUrl ||frontendUrl?.trim().length === 0)
			throw new InternalServerErrorException("Frontend URL is invalid");	
		res.clearCookie("steam_link_intent", {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
		});
		res.redirect(302, `${frontendUrl}/auth/callback?code=${encodeURIComponent(code)}`);
	}	
	@HttpCode(200)
	@Public()
	@Post("steam/exchange")
	exchangeCode(@Body() body: SteamExchangeDto){
		return this.steamAuth.exchangeCode(body.code);
	}
	@UseGuards(JwtAuthGuard)
	@Post("steam/link/start")
	startSteamLink(@CurrentUser("id") userId: string, @Res({ passthrough: true }) res: Response){
		// Ce cookie court-circuité au callback évite de faire confiance au client pour fournir le userId à lier.
		const intentId = this.steamAuth.createLinkIntent(userId);
		res.cookie("steam_link_intent", intentId, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			path: "/",
			maxAge: 60_000,
		});
		return { redirectUrl : "/api/auth/steam"}
	}
}
