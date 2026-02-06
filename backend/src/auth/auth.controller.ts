import { Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("api/auth")
export class AuthController{
	constructor(private readonly service : AuthService){}
	@Post("register")
	register(){
	}
	@Post("login")
	login(){

	}
		

}