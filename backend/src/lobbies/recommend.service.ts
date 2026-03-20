import { Injectable } from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";
import { Recommended } from "./types/recommend";
import { InternalServerErrorException, NotFoundException } from "@nestjs/common";

@Injectable()
export class RecommendService {
	constructor(
		private readonly lobbyService : LobbiesService,
	){}
	async callRecommend(lobbyId: string): Promise<Recommended[]> {
		const call = `http://recommendation:8001/recommend/${lobbyId}`; 
		const response = await fetch(call, {
			method: "GET",
		});
		if (!response.ok)
			throw new InternalServerErrorException("Failed to fetch algo");
		const data = await response.json();
		if (data === null || typeof data !== "object")
			throw new InternalServerErrorException("Algo recommendation isnt an object");
		if (!("recommendations" in data))
			throw new NotFoundException("No recommendation natched");
		if (!(Array.isArray(data.recommendations)))
			throw new NotFoundException("Wrong format for recommendations");
		return data.recommendations;
	}
}