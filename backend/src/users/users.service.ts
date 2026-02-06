import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "./types/users";
import { randomUUID } from "crypto";

@Injectable()
export class UsersService{
	private userById:  Map<string, User>;
	private userIdByEmail: Map<string, string>;
	private userIdByUsername: Map<string,string>;
	constructor()
	{
		this.userById = new Map <string, User>();
		this.userIdByEmail = new Map<string,string>();
		this.userIdByUsername = new Map<string, string>();
	}
	create(email:string, username: string, passwordHash: string): User{
		if (this.userIdByEmail.has(email))
			throw new BadRequestException("Email already used");
		if (this.userIdByUsername.has(username))
			throw new BadRequestException("Username already used");
		const user : User = {
			id : randomUUID(),
			email: email,
			username : username,
			passwordHash: passwordHash,
		};
		this.userById.set(user.id, user);
		this.userIdByEmail.set(user.email, user.id);
		this.userIdByUsername.set(user.username, user.id);
		return (user);
	}
	findByUsername(username: string): User | undefined{
		const userName = this.userIdByUsername.get(username);
		if (userName === undefined)
			return (undefined);
		return (this.userById.get(userName));
	}
	findById(id: string): User | undefined{
		return (this.userById.get(id));
	}
	findByEmail(email: string): User | undefined{

		const userId = this.userIdByEmail.get(email);
		if (userId === undefined)
			return (undefined);
		return (this.userById.get(userId));
	}
}
