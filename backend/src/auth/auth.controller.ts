import { Body, Controller, HttpCode, Post, UseGuards, Get, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { SteamAuthService } from "./steam-auth.service";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from 'express';


@Controller("api/auth")
export class AuthController{
	constructor(private readonly auth : AuthService,
			private readonly steamAuth: SteamAuthService,
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
	me(@CurrentUser() user: {id: string, email: string, username: string}){
		return user;
	}
	@UseGuards(AuthGuard("steam"))
	@Get("steam")
	loginSteam():void {}
	@UseGuards(AuthGuard("steam"))
	@Get("steam/return")
	steamReturn(@Req() req: {user: {steamId: string; username: string; avatarUrl: string;}}){
		return this.steamAuth.loginWithSteam(
			req.user.steamId,
			req.user.username,
			req.user.avatarUrl,
		);
	}
}
