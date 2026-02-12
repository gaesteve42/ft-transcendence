import { Injectable, BadRequestException} from "@nestjs/common";
import { User } from "./types/users";
import { PrismaService } from "src/prisma/prisma.service";
import {Prisma, User as PrismaUser} from "@prisma/client";

@Injectable()
export class UsersService{
	constructor(
		private readonly prisma: PrismaService,
	){}
		private toDomain(user: PrismaUser): User{
			return{
				 	id: user.id,
					email: user.email,
					username: user.username,
					passwordHash: user.passwordHash,
			};	
	}
		private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  			return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
	}
	async create(email:string, username: string, passwordHash: string): Promise<User>{
		try {
			const created = await this.prisma.user.create({
				data: {email, username,  passwordHash},
		});
		return (this.toDomain(created));
		} catch (error: unknown)
		{
			if (!this.isUniqueConstraintError(error))
				throw error;
			let target = "";
			if(Array.isArray(error.meta?.target))
			{
				target = error.meta.target.map((value) => String(value)).join(",");
			}
			if (target.includes("email"))
				throw new BadRequestException("Email already used");
    			if (target.includes("username"))
				throw new BadRequestException("Username already used");
    			throw new BadRequestException("User already exists"); 
		}
	}
	async findByUsername(username: string): Promise<User | undefined>{
		const user = await this.prisma.user.findUnique({where: {username}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
	async findById(id: string): Promise<User | undefined>{
		const user = await this.prisma.user.findUnique({where: {id}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
	async findByEmail(email: string): Promise<User | undefined>{ 

		const user = await this.prisma.user.findUnique({where: {email}})
		if (!user)
			return (undefined);
		return (this.toDomain(user));
	}
}
