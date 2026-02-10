import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { UsersService } from "src/users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { AuditLoggerService } from "src/common/logging/audit-logger.service";


@Injectable()
export class AuthService{
	constructor(
		private readonly users: UsersService,
		private readonly jwt: JwtService,
		private readonly audit:  AuditLoggerService,
	){}
	async register(dto: RegisterDto): Promise<{accessToken: string }>{
		this.audit.log("auth.register.attempt", {email: dto.email});

		const idCheck = this.users.findByEmail(dto.email);
		if (idCheck)
		{
			this.audit.warn("auth.register.fail", { email: dto.email, reason: "email_taken" });
			throw new BadRequestException("Email already used");
		}
		const usernameCheck = this.users.findByUsername(dto.username);
		if (usernameCheck)
		{
			this.audit.warn("auth.register.fail", { email: dto.email, reason: "username_taken" });
			throw new BadRequestException("Username already used");
		}
		const passwordHash = await bcrypt.hash(dto.password, 10);
		const user = this.users.create(dto.email, dto.username, passwordHash);
		this.audit.log("auth.register.success", { userId: user.id, email: user.email });
		const token = this.jwt.sign({ sub : user.id});
		return {accessToken: token};
	}
	async login(dto: LoginDto): Promise<{ accessToken: string }> {
		this.audit.log("auth.login.attempt", { email: dto.email });
	const user = this.users.findByEmail(dto.email);
	if (!user){
		this.audit.warn("auth.login.fail", { email: dto.email, reason: "not_found" });
		throw new UnauthorizedException("Invalid credentials");
	}
	const checkPassword = await bcrypt.compare(dto.password, user.passwordHash);
	if (!checkPassword){
		this.audit.warn("auth.login.fail", { email: dto.email, reason: "bad_password" });
		throw new UnauthorizedException("Invalid credentials");
	}
	this.audit.log("auth.login.success", { userId: user.id, email: user.email });
	return { accessToken: this.jwt.sign({ sub: user.id }) };
	}
}

 