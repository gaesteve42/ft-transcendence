import { Controller, Get, Param, Query, NotFoundException, UseGuards } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("api/users")
export class UsersController {
	constructor(private readonly users: UsersService) {}

	@Get("search")
	async search(@Query("q") query: string) {
		if (!query || query.trim().length === 0)
			return [];
		const users = await this.users.searchByUsername(query.trim());
		return users.map((u) => ({
			id: u.id,
			username: u.username,
			avatarUrl: u.avatarUrl,
		}));
	}

	@Get(":id")
	async getPublicProfile(@Param("id") id: string) {
		const user = await this.users.findById(id);
		if (!user)
			throw new NotFoundException("User not found");
		return {
			id: user.id,
			username: user.username,
			avatarUrl: user.avatarUrl,
			steamId: user.steamId,
		};
	}
}
