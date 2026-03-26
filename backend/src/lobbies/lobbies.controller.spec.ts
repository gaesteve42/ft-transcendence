import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { LobbiesController } from "./lobbies.controller";
import { LobbiesService } from "./lobbies.service";
import { LobbyGateway } from "./lobby.gateway";
import { RecommendService } from "./recommend.service";

/**
 * Unit tests for LobbiesController.
 * Focuses on the /recommend endpoint: ownership gate, readiness gate,
 * and delegation to the recommendation service.
 */
describe("LobbiesController", () => {
	let controller: LobbiesController;
	let service: {
		getLobbyById: jest.Mock;
		getLobbyReadiness: jest.Mock;
	};
	let gateway: {
		broadcastLobbyUpdate: jest.Mock;
	};
	let recommend: {
		callRecommend: jest.Mock;
	};

	beforeEach(() => {
		service = {
			getLobbyById: jest.fn(),
			getLobbyReadiness: jest.fn(),
		};
		gateway = {
			broadcastLobbyUpdate: jest.fn(),
		};
		recommend = {
			callRecommend: jest.fn(),
		};

		controller = new LobbiesController(
			service as unknown as LobbiesService,
			gateway as unknown as LobbyGateway,
			recommend as unknown as RecommendService,
		);
	});

	// The endpoint must only reach the external recommender after passing lobby ownership and readiness checks.
	it("calls the recommendation service when the requester is the lobby leader and everyone is ready", async () => {
		service.getLobbyById.mockResolvedValue({
			id: "lobby-1",
			ownerId: "user-1",
		});
		service.getLobbyReadiness.mockResolvedValue({
			ready: true,
		});
		recommend.callRecommend.mockResolvedValue([
			{ game_id: "game-1", score: 0.91 },
		]);

		const result = await controller.getRecommendation("lobby-1", "user-1");

		// The endpoint must gate the external algo call behind the same lobby rules as the UI.
		expect(service.getLobbyById).toHaveBeenCalledWith("lobby-1");
		expect(service.getLobbyReadiness).toHaveBeenCalledWith("lobby-1");
		expect(recommend.callRecommend).toHaveBeenCalledWith("lobby-1");
		expect(result).toEqual([{ game_id: "game-1", score: 0.91 }]);
	});

	// Only the lobby leader is allowed to trigger a recommendation for the whole group.
	it("rejects when the requester is not the lobby leader", async () => {
		service.getLobbyById.mockResolvedValue({
			id: "lobby-1",
			ownerId: "owner-1",
		});

		await expect(controller.getRecommendation("lobby-1", "user-2")).rejects.toThrow(
			new ForbiddenException("User isnt the leader"),
		);
		expect(service.getLobbyReadiness).not.toHaveBeenCalled();
		expect(recommend.callRecommend).not.toHaveBeenCalled();
	});

	// The recommendation should only run once every player has submitted at least one tag.
	it("rejects when all players are not ready", async () => {
		service.getLobbyById.mockResolvedValue({
			id: "lobby-1",
			ownerId: "user-1",
		});
		service.getLobbyReadiness.mockResolvedValue({
			ready: false,
		});

		await expect(controller.getRecommendation("lobby-1", "user-1")).rejects.toThrow(
			new BadRequestException("All players must be ready"),
		);
		expect(recommend.callRecommend).not.toHaveBeenCalled();
	});
});
