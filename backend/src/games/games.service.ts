import { BadRequestException, Injectable } from "@nestjs/common";
import { ExternalGameSource, GameExternalId} from "@prisma/client";
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
	private isUniqueConstraintError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
				return (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002");
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
	private normalizeSlug(input: string): string {
		const base = input.trim().toLowerCase();
		const slug = base
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-+/g, "-");
		if (slug.length === 0){
			throw new BadRequestException("Canonical slug is invalid after normalization");
		}
		return (slug);
	}
	async createCanonicalGame(canonicalSlug: string, name: string, summary: string | null, coverUrl: string | null, firstReleaseDate: Date | null) : Promise <Game> {
		let cleanSummary : string | null = null;
		let cleanUrl : string | null = null;
		const cleanCanonicalSlug = this.normalizeSlug(canonicalSlug);
		const cleanName = name.trim();
		if (summary !== null){
			cleanSummary = summary.trim();
			if (cleanSummary.length === 0)
				cleanSummary = null;
		}
		if (coverUrl !== null){
			cleanUrl = coverUrl.trim();
			if (cleanUrl.length === 0)
				cleanUrl = null;
		}
		if (cleanName.length === 0)
			throw new BadRequestException("Name can't be empty");
		try{
			const created = await this.prisma.game.create({
				data:{canonicalSlug: cleanCanonicalSlug, name: cleanName, summary: cleanSummary, coverUrl: cleanUrl, firstReleaseDate: firstReleaseDate}
			});
			return (this.toDomain(created));
		}
		catch(error: unknown){
			if (!this.isUniqueConstraintError(error))
				throw error;
			throw new BadRequestException("Canonical Game already exists");
		}
	}
	async linkExternalId(gameId: string, source: ExternalGameSource, externalId: string, externalUrl: string | null) : Promise <void> {
		let cleanExternalUrl : string |null = null;
		const cleanGameId = gameId.trim();
		const cleanExternalId = externalId.trim();

		if (cleanExternalId.length === 0 ||cleanGameId.length === 0 )
			throw new BadRequestException("Game Id and External Id can't be empty");
		if (externalUrl !== null)
		{
			cleanExternalUrl = externalUrl.trim();
			if (cleanExternalUrl.length === 0)
				cleanExternalUrl = null;
		}
		try {
			await this.prisma.gameExternalId.create({data: {gameId: cleanGameId, externalId: cleanExternalId, externalUrl: cleanExternalUrl, source: source}});
		}
		catch(error: unknown)
		{
			if (!this.isUniqueConstraintError(error))
				throw error;
			throw new BadRequestException("External Id is already linked.")
		}
	}
	/**
	 * Upserts a game from an external provider (Steam/IGDB).
	 *
	 * Concurrency note:
	 * two requests may try to create the same external mapping at the same time.
	 * If a unique conflict (P2002) happens, we re-read by (source, externalId)
	 * and return the existing game.
	 *
	 * @param input External game payload used to resolve or create the canonical game.
	 * @returns The canonical game.
	 */
	async upsertFromExternal(input:{source: ExternalGameSource, externalId: string, externalUrl: string | null, canonicalSlug: string, name: string, summary: string | null, coverUrl: string | null, firstReleaseDate: Date | null}): Promise <Game>{
		try{
			const existing= await this.findByExternalId(input.source, input.externalId);
			if (existing)
				return (existing);
			const created = await this.createCanonicalGame(input.canonicalSlug, input.name, input.summary, input.coverUrl, input.firstReleaseDate);
			await this.linkExternalId(created.id, input.source, input.externalId, input.externalUrl);
			return (created);
		}
		catch(error: unknown)
		{
			if (!this.isUniqueConstraintError(error))
				throw error ;
			const resolved = await this.findByExternalId(input.source, input.externalId);
			if (resolved)
				return (resolved);
			else 
				throw error;
		}
	}
}
