import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UsersService } from "src/users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";


@Injectable()
export class AuthService{
	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService){}
	async register(dto: RegisterDto): Promise<{accessToken: string }>{
		const idCheck = this.users.findByEmail(dto.email);
		const usernameCheck = this.users.findByUsername(dto.username);
		if(idCheck)
			throw new BadRequestException("Email already used");
		if (usernameCheck)
			throw new BadRequestException("Username already used");
		const passwordHash = await bcrypt.hash(dto.password, 10);
		const user = this.users.create(dto.email, dto.username, passwordHash);
		const token = this.jwt.sign({ sub : user.id});
		return {accessToken: token};
	}
	async login(dto: LoginDto): Promise<{ accessToken: string }> {
	const user = this.users.findByEmail(dto.email);
	console.log("[login] email:", dto.email, "userFound:", !!user);
	if (!user)
		throw new UnauthorizedException("Invalid credentials");

	const ok = await bcrypt.compare(dto.password, user.passwordHash);
	console.log("[login] passwordMatch:", ok);
	if (!ok)
		throw new UnauthorizedException("Invalid credentials");

	return { accessToken: this.jwt.sign({ sub: user.id }) };
	}
	/**
	 * 
	 * @param dto 
	 * @returns 
	 
	async login(dto: LoginDto): Promise<{accessToken: string}>{
		const user = this.users.findByEmail(dto.email);
		if (user === undefined)
			throw new UnauthorizedException("Invalid credentials");
		const checkPassword = await bcrypt.compare(dto.password, user.passwordHash);
		if (checkPassword === false)
			throw new UnauthorizedException("Invalid credentials");
		return {accessToken: this.jwt.sign({ sub : user.id})};
	}
	*/
}

 