import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
//import { AuthController} from "./auth.controller";
import { UsersModule } from "src/users/users.module";
import { JwtModule } from "@nestjs/jwt";

JwtModule.register({ secret: ".env-exemple", signOptions: { expiresIn: "15m" } })

@Module({
	imports: [JwtModule.register({ secret: ".env-exemple", signOptions: { expiresIn: "15m" } }), UsersModule],
	//controllers:[AuthController],
	providers:[AuthService],
})
export class AuthModule{}