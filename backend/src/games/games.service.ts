import { Injectable } from "@nestjs/common";
import { ExternalGameSource} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Game } from "./types/game";
import { Prisma, Game as PrismaGame} from "@prisma/client";


@Injectable()
export class GameService {
	constructor(
		private readonly prisma : PrismaService,
	){}
	private toDomain(game: PrismaGame): Game{
		return {
			id: game.id,
			canonicalSlug: game.canonicalSlug,
			name: game.name,
			summary: game.summary,
			coverUrl: game.coverUrl,
			firstReleaseDate: game.firstReleaseDate,
			createdAt: game.createdAt,
			updatedAt: game.updatedAt,
		}
	}
	async findByExternalId(source: ExternalGameSource, externalId: string): Promise<Game | null> {
		const mapping= await this.prisma.gameExternalId.findUnique({
			where: {source_externalId: {source, externalId}},
			select: {game: true},
		});
		if (!mapping)
			return null;
		return (this.toDomain(mapping.game))
	}		
}