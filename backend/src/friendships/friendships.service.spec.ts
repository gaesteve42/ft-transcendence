import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { FriendshipsService } from "./friendships.service";

const USER_A = "user-a-id";
const USER_B = "user-b-id";
const USER_C = "user-c-id";

const makeProfile = (id: string, lastSeenAt: Date | null = null) => ({
	id,
	username: `user_${id}`,
	avatarUrl: null,
	lastSeenAt,
});
const makeOnlineProfile = (id: string) => makeProfile(id, new Date());

/**
 * Unit tests for FriendshipsService.
 * Covers friend request lifecycle (send, accept, remove), friends listing
 * with online status detection, and pending request retrieval.
 */
describe("FriendshipsService", () => {
	let service: FriendshipsService;
	let prisma: {
		user: { findUnique: jest.Mock };
		friendship: {
			findFirst: jest.Mock;
			findUnique: jest.Mock;
			findMany: jest.Mock;
			create: jest.Mock;
			update: jest.Mock;
			deleteMany: jest.Mock;
		};
	};

	beforeEach(() => {
		prisma = {
			user: { findUnique: jest.fn() },
			friendship: {
				findFirst: jest.fn(),
				findUnique: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				deleteMany: jest.fn(),
			},
		};
		service = new FriendshipsService(prisma as unknown as PrismaService);
	});

	// sendRequest — validates self-request prevention, target existence, duplicate detection, and happy path.
	describe("sendRequest", () => {
		// Self-request prevention: sending a friend request to yourself must fail.
		it("throws BadRequestException when sending a request to yourself", async () => {
			await expect(service.sendRequest(USER_A, USER_A)).rejects.toThrow(BadRequestException);
			expect(prisma.user.findUnique).not.toHaveBeenCalled();
		});

		// Target validation: the addressee must exist in the database.
		it("throws NotFoundException when the target user does not exist", async () => {
			prisma.user.findUnique.mockResolvedValue(null);

			await expect(service.sendRequest(USER_A, USER_B)).rejects.toThrow(NotFoundException);
			expect(prisma.friendship.findFirst).not.toHaveBeenCalled();
		});

		// Duplicate prevention: reject if a friendship row already exists (requester→addressee).
		it("throws BadRequestException when a friendship already exists (A→B direction)", async () => {
			prisma.user.findUnique.mockResolvedValue({ id: USER_B });
			prisma.friendship.findFirst.mockResolvedValue({ requesterId: USER_A, addresseeId: USER_B, status: "PENDING" });

			await expect(service.sendRequest(USER_A, USER_B)).rejects.toThrow(BadRequestException);
			expect(prisma.friendship.create).not.toHaveBeenCalled();
		});

		// Duplicate prevention: reject if a friendship row already exists (addressee→requester).
		it("throws BadRequestException when a friendship already exists (B→A direction)", async () => {
			prisma.user.findUnique.mockResolvedValue({ id: USER_B });
			prisma.friendship.findFirst.mockResolvedValue({ requesterId: USER_B, addresseeId: USER_A, status: "PENDING" });

			await expect(service.sendRequest(USER_A, USER_B)).rejects.toThrow(BadRequestException);
			expect(prisma.friendship.create).not.toHaveBeenCalled();
		});

		// Happy path: create an ACCEPTED friendship when no conflicts exist.
		it("creates a friendship (ACCEPTED) when all checks pass", async () => {
			prisma.user.findUnique.mockResolvedValue({ id: USER_B });
			prisma.friendship.findFirst.mockResolvedValue(null);
			prisma.friendship.create.mockResolvedValue({});

			await expect(service.sendRequest(USER_A, USER_B)).resolves.toBeUndefined();
			expect(prisma.friendship.create).toHaveBeenCalledWith({
				data: { requesterId: USER_A, addresseeId: USER_B, status: "ACCEPTED" },
			});
		});
	});

	// acceptRequest — validates pending request existence, idempotency guard, and status transition.
	describe("acceptRequest", () => {
		// Verify that accepting a non-existent request triggers NotFoundException.
		it("throws NotFoundException when no pending request exists from that user", async () => {
			prisma.friendship.findUnique.mockResolvedValue(null);

			await expect(service.acceptRequest(USER_B, USER_A)).rejects.toThrow(NotFoundException);
			expect(prisma.friendship.update).not.toHaveBeenCalled();
		});

		// Idempotency guard: re-accepting an already-accepted friendship must fail.
		it("throws BadRequestException when the friendship is already accepted", async () => {
			prisma.friendship.findUnique.mockResolvedValue({
				requesterId: USER_A,
				addresseeId: USER_B,
				status: "ACCEPTED",
			});

			await expect(service.acceptRequest(USER_B, USER_A)).rejects.toThrow(BadRequestException);
			expect(prisma.friendship.update).not.toHaveBeenCalled();
		});

		// Happy path: transition a PENDING friendship to ACCEPTED.
		it("updates the friendship to ACCEPTED", async () => {
			prisma.friendship.findUnique.mockResolvedValue({
				requesterId: USER_A,
				addresseeId: USER_B,
				status: "PENDING",
			});
			prisma.friendship.update.mockResolvedValue({});

			await expect(service.acceptRequest(USER_B, USER_A)).resolves.toBeUndefined();
			expect(prisma.friendship.update).toHaveBeenCalledWith({
				where: { requesterId_addresseeId: { requesterId: USER_A, addresseeId: USER_B } },
				data: { status: "ACCEPTED" },
			});
		});
	});

	// remove — validates bidirectional deletion and not-found handling.
	describe("remove", () => {
		// Verify that removing a non-existent friendship triggers NotFoundException.
		it("throws NotFoundException when no friendship exists in either direction", async () => {
			prisma.friendship.deleteMany.mockResolvedValue({ count: 0 });

			await expect(service.remove(USER_A, USER_B)).rejects.toThrow(NotFoundException);
		});

		// Verify bidirectional deletion: the OR query must match either direction.
		it("deletes the friendship regardless of direction", async () => {
			prisma.friendship.deleteMany.mockResolvedValue({ count: 1 });

			await expect(service.remove(USER_A, USER_B)).resolves.toBeUndefined();
			expect(prisma.friendship.deleteMany).toHaveBeenCalledWith({
				where: {
					OR: [
						{ requesterId: USER_A, addresseeId: USER_B },
						{ requesterId: USER_B, addresseeId: USER_A },
					],
				},
			});
		});
	});

	// listFriends — validates profile resolution, online/offline detection, and empty state.
	describe("listFriends", () => {
		// Empty state: a user with no friends should get an empty array.
		it("returns an empty array when the user has no accepted friendships", async () => {
			prisma.friendship.findMany.mockResolvedValue([]);

			await expect(service.listFriends(USER_A)).resolves.toEqual([]);
		});

		// Verify that the friend's profile (not the caller's) is returned when caller is the requester.
		it("returns the other user's profile when current user is the requester", async () => {
			prisma.friendship.findMany.mockResolvedValue([
				{ requester: makeProfile(USER_A), addressee: makeProfile(USER_B) },
			]);

			const result = await service.listFriends(USER_A);
			expect(result).toMatchObject([{ id: USER_B, isOnline: false }]);
		});

		// Verify that the friend's profile is returned when caller is the addressee.
		it("returns the other user's profile when current user is the addressee", async () => {
			prisma.friendship.findMany.mockResolvedValue([
				{ requester: makeProfile(USER_C), addressee: makeProfile(USER_A) },
			]);

			const result = await service.listFriends(USER_A);
			expect(result).toMatchObject([{ id: USER_C, isOnline: false }]);
		});

		// Online detection: a friend seen within the last 2 minutes should be marked online.
		it("marks a friend as online when lastSeenAt is recent", async () => {
			prisma.friendship.findMany.mockResolvedValue([
				{ requester: makeProfile(USER_A), addressee: makeOnlineProfile(USER_B) },
			]);

			const result = await service.listFriends(USER_A);
			expect(result).toMatchObject([{ id: USER_B, isOnline: true }]);
		});

		// Offline detection: a friend not seen for over 2 minutes should be marked offline.
		it("marks a friend as offline when lastSeenAt is older than 2 minutes", async () => {
			const oldDate = new Date(Date.now() - 3 * 60 * 1000);
			prisma.friendship.findMany.mockResolvedValue([
				{ requester: makeProfile(USER_A), addressee: makeProfile(USER_B, oldDate) },
			]);

			const result = await service.listFriends(USER_A);
			expect(result).toMatchObject([{ id: USER_B, isOnline: false }]);
		});
	});

	// listPendingReceived — validates empty state and correct payload shape.
	describe("listPendingReceived", () => {
		// Empty state: no pending requests should yield an empty array.
		it("returns an empty array when no pending requests", async () => {
			prisma.friendship.findMany.mockResolvedValue([]);

			await expect(service.listPendingReceived(USER_B)).resolves.toEqual([]);
		});

		// Verify that pending requests include the requester's profile and the creation timestamp.
		it("returns the requester profile and the request date", async () => {
			const since = new Date("2026-03-20T10:00:00.000Z");
			prisma.friendship.findMany.mockResolvedValue([
				{ createdAt: since, requester: makeProfile(USER_A) },
			]);

			const result = await service.listPendingReceived(USER_B);
			expect(result).toMatchObject([{ from: { id: USER_A }, since }]);
		});
	});
});
