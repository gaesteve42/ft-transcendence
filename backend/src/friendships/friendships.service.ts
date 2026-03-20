import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { Prisma, FriendshipStatus } from "@prisma/client";
import { FriendProfile, PendingRequest } from "./types/friendship";

const friendUserSelect = { id: true, username: true, avatarUrl: true } as const;

@Injectable()
export class FriendshipsService {
	constructor(private readonly prisma: PrismaService) {}

	private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
		return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
	}

	private toProfile(user: { id: string; username: string; avatarUrl: string | null }): FriendProfile {
		return { id: user.id, username: user.username, avatarUrl: user.avatarUrl };
	}

	async sendRequest(requesterId: string, addresseeId: string): Promise<void> {
		if (requesterId === addresseeId)
			throw new BadRequestException("Cannot send a friend request to yourself");

		const target = await this.prisma.user.findUnique({ where: { id: addresseeId }, select: { id: true } });
		if (!target)
			throw new NotFoundException("User not found");

		// Check if a friendship already exists in either direction
		const existing = await this.prisma.friendship.findFirst({
			where: {
				OR: [
					{ requesterId, addresseeId },
					{ requesterId: addresseeId, addresseeId: requesterId },
				],
			},
		});
		if (existing)
			throw new BadRequestException("A friendship or pending request already exists with this user");

		try {
			await this.prisma.friendship.create({ data: { requesterId, addresseeId } });
		} catch (error: unknown) {
			if (this.isUniqueConstraintError(error))
				throw new BadRequestException("Friend request already sent");
			throw error;
		}
	}

	async acceptRequest(currentUserId: string, requesterId: string): Promise<void> {
		const friendship = await this.prisma.friendship.findUnique({
			where: { requesterId_addresseeId: { requesterId, addresseeId: currentUserId } },
		});
		if (!friendship)
			throw new NotFoundException("No pending friend request from this user");
		if (friendship.status === FriendshipStatus.ACCEPTED)
			throw new BadRequestException("Already friends");

		await this.prisma.friendship.update({
			where: { requesterId_addresseeId: { requesterId, addresseeId: currentUserId } },
			data: { status: "ACCEPTED" },
		});
	}

	async remove(currentUserId: string, otherUserId: string): Promise<void> {
		const result = await this.prisma.friendship.deleteMany({
			where: {
				OR: [
					{ requesterId: currentUserId, addresseeId: otherUserId },
					{ requesterId: otherUserId, addresseeId: currentUserId },
				],
			},
		});
		if (result.count === 0)
			throw new NotFoundException("No friendship found with this user");
	}

	async listFriends(userId: string): Promise<FriendProfile[]> {
		const friendships = await this.prisma.friendship.findMany({
			where: {
				status: FriendshipStatus.ACCEPTED,
				OR: [{ requesterId: userId }, { addresseeId: userId }],
			},
			select: {
				requester: { select: friendUserSelect },
				addressee: { select: friendUserSelect },
			},
		});

		return friendships.map((f) =>
			this.toProfile(f.requester.id === userId ? f.addressee : f.requester),
		);
	}

	async listPendingReceived(userId: string): Promise<PendingRequest[]> {
		const requests = await this.prisma.friendship.findMany({
			where: { addresseeId: userId, status: FriendshipStatus.PENDING },
			select: {
				createdAt: true,
				requester: { select: friendUserSelect },
			},
			orderBy: { createdAt: "asc" },
		});

		return requests.map((r) => ({
			from: this.toProfile(r.requester),
			since: r.createdAt,
		}));
	}
}
