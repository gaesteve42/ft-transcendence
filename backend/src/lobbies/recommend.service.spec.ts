import { InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { RecommendService } from "./recommend.service";

type MockResponse = {
	ok: boolean;
	json: jest.Mock<Promise<unknown>, []>;
};

/**
 * Unit tests for RecommendService.
 * Validates the HTTP proxy to the external recommendation engine:
 * transport errors, payload shape validation, and happy-path forwarding.
 */
describe("RecommendService", () => {
	let service: RecommendService;
	let lobbyService: jest.Mocked<LobbiesService>;
	let fetchMock: jest.Mock;

	const makeResponse = (ok: boolean, body: unknown): MockResponse => ({
		ok,
		json: jest.fn().mockResolvedValue(body),
	});

	beforeEach(() => {
		lobbyService = {} as jest.Mocked<LobbiesService>;
		service = new RecommendService(lobbyService);

		fetchMock = jest.fn();
		global.fetch = fetchMock as unknown as typeof fetch;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	// Happy path: the service is only a proxy to the external recommender and must return its array as-is.
	it("returns recommendations when the algo responds with the expected shape", async () => {
		const recommendations = [
			{
				game_id: "game-1",
				score: 0.91,
			},
		];
		fetchMock.mockResolvedValueOnce(makeResponse(true, {
			recommendations,
		}));

		const result = await service.callRecommend("lobby-1");

		expect(fetchMock).toHaveBeenCalledWith(
			"http://recommendation:8001/recommend/lobby-1",
			{ method: "GET" },
		);
		expect(result).toEqual(recommendations);
	});

	// Upstream transport failure: the HTTP request itself failed, so the backend must surface a 500-style error.
	it("throws when the algo HTTP response is not ok", async () => {
		fetchMock.mockResolvedValueOnce(makeResponse(false, {}));

		await expect(service.callRecommend("lobby-1")).rejects.toThrow(
			new InternalServerErrorException("Failed to fetch algo"),
		);
	});

	// Defensive parsing: a null payload means the external service contract is broken.
	it("throws when the algo payload is not an object", async () => {
		fetchMock.mockResolvedValueOnce(makeResponse(true, null));

		await expect(service.callRecommend("lobby-1")).rejects.toThrow(
			new InternalServerErrorException("Algo recommendation isnt an object"),
		);
	});

	// The controller expects a top-level `recommendations` property, so missing it must fail clearly.
	it("throws when the recommendations property is missing", async () => {
		fetchMock.mockResolvedValueOnce(makeResponse(true, { result: [] }));

		await expect(service.callRecommend("lobby-1")).rejects.toThrow(
			new NotFoundException("No recommendation natched"),
		);
	});

	// The backend only accepts an array of recommendations from the algo service.
	it("throws when recommendations is not an array", async () => {
		fetchMock.mockResolvedValueOnce(makeResponse(true, { recommendations: {} }));

		await expect(service.callRecommend("lobby-1")).rejects.toThrow(
			new NotFoundException("Wrong format for recommendations"),
		);
	});
});
