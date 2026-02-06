import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

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
}
