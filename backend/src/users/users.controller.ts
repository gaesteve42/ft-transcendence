import { Body, Controller, Get, HttpCode, Patch, Post, Param, Query, NotFoundException, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { UpdateProfileDto } from "./dto/update-profile.dto";

// Où sauvegarder les avatars + comment nommer le fichier
const avatarStorage = diskStorage({
	destination: "./uploads/avatars",
	filename: (_req, _file, cb) => {
		cb(null, Date.now() + ".jpg");
	},
});

@UseGuards(JwtAuthGuard)
@Controller("api/users")
export class UsersController {
	constructor(private readonly users: UsersService) {}

	// POST /api/users/avatar — upload d'image (jpeg/png, max 5 MB)
	@Post("avatar")
	@UseInterceptors(FileInterceptor("avatar", { storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 } }))
	async uploadAvatar(@CurrentUser("id") userId: string, @UploadedFile() file: Express.Multer.File) {
		if (!file)
			throw new BadRequestException("No file provided");
		const avatarUrl = `/api/uploads/avatars/${file.filename}`;
		const user = await this.users.updateAvatar(userId, avatarUrl);
		return { avatarUrl: user.avatarUrl };
	}	
	// TODO - User deletion
	// @Delete("me")
	// @HttpCode(204)
	// async deleteMe(@CurrentUser("id") userId: string) {
	// 	await this.users.deleteMe(userId);
	// }

	@Patch("me")
	async updateMe(@CurrentUser("id") userId: string, @Body() body: UpdateProfileDto) {
		const updated = await this.users.updateUsername(userId, body.username);
		return { username: updated.username };
	}

	@Patch("me/ping")
	@HttpCode(204)
	async ping(@CurrentUser("id") userId: string) {
		await this.users.updateLastSeen(userId);
	}

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
