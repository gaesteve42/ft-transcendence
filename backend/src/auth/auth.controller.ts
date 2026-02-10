import { Body, Controller, HttpCode, Post, Request, UseGuards, Get } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";


@Controller("api/auth")
export class AuthController{
	constructor(private readonly auth : AuthService){}
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
	me(@Request()req){
		return req.user;
	}
}
