import { Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { FriendshipsService } from "./friendships.service";
import { CurrentUser } from "src/auth/current-user.decorator";

@Controller("api/friendships")
export class FriendshipsController {
	constructor(private readonly service: FriendshipsService) {}

	@Get()
	listFriends(@CurrentUser("id") userId: string) {
		return this.service.listFriends(userId);
	}

	@Get("pending")
	listPending(@CurrentUser("id") userId: string) {
		return this.service.listPendingReceived(userId);
	}

	@Get(":userId/status")
	getStatus(@CurrentUser("id") currentUserId: string, @Param("userId") otherUserId: string) {
		return this.service.getStatus(currentUserId, otherUserId);
	}

	@Post(":userId")
	@HttpCode(201)
	sendRequest(@CurrentUser("id") requesterId: string, @Param("userId") addresseeId: string) {
		return this.service.sendRequest(requesterId, addresseeId);
	}

	@Post(":userId/accept")
	@HttpCode(200)
	acceptRequest(@CurrentUser("id") currentUserId: string, @Param("userId") requesterId: string) {
		return this.service.acceptRequest(currentUserId, requesterId);
	}

	@Delete(":userId")
	@HttpCode(200)
	remove(@CurrentUser("id") currentUserId: string, @Param("userId") otherUserId: string) {
		return this.service.remove(currentUserId, otherUserId);
	}
}
