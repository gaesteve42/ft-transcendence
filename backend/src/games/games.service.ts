import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ExternalGameSource } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { Game, UserLibraryGame } from "./types/game";
import { Prisma, Game as PrismaGame} from "@prisma/client";
import { IgdbService } from "src/igdb/igdb.service";
import { NotFoundError } from "rxjs";


@Injectable()
export class GameService {
	constructor(
		private readonly prisma : PrismaService,
		private readonly igdbService: IgdbService,
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
				return this.enrichCanonicalGameIfMissing(existing.id, {
					summary: input.summary,
					coverUrl: input.coverUrl,
					firstReleaseDate: input.firstReleaseDate
				});
			const canonical = await this.findByCanonicalSlug(input.canonicalSlug);
			if (canonical) {
				await this.linkExternalId(canonical.id, input.source, input.externalId, input.externalUrl);
				return this.enrichCanonicalGameIfMissing(canonical.id, {
					summary: input.summary,
					coverUrl: input.coverUrl,
					firstReleaseDate: input.firstReleaseDate,
				});
			}
			const created = await this.createCanonicalGame(input.canonicalSlug, input.name, input.summary, input.coverUrl, input.firstReleaseDate);
			await this.linkExternalId(created.id, input.source, input.externalId, input.externalUrl);
			return (created);
		}
		catch(error: unknown)
		{
			if (!this.isUniqueConstraintError(error))
				throw error ;
			const resolved = await this.findByExternalId(input.source, input.externalId);
			if (resolved){
				return this.enrichCanonicalGameIfMissing(resolved.id, {
						summary: input.summary,
						coverUrl: input.coverUrl,
						firstReleaseDate: input.firstReleaseDate,
					});
			}	
			const canonical = await this.findByCanonicalSlug(input.canonicalSlug);
			if (canonical) {
				await this.linkExternalId(canonical.id, input.source, input.externalId, input.externalUrl);
				return this.enrichCanonicalGameIfMissing(canonical.id, {
					summary: input.summary,
					coverUrl: input.coverUrl,
					firstReleaseDate: input.firstReleaseDate,
				});
			}
			else 
				throw error;
		}
	}

	async listOwnedGamesForUser(userId:string) : Promise<UserLibraryGame[]> {
		const cleanUserId = userId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is required");
		const ownedList = await this.prisma.userGame.findMany({
			where:{
				userId:cleanUserId,
				owned: true,
			},
			orderBy:{
				updatedAt:"desc",
			},
			include:{
				game:{
					include: {
						externalIds:true,
					},
				},
			},
		});
		return ownedList.map((item) => {
			const igdbMapping = item.game.externalIds.find(
			(externalId) => externalId.source === ExternalGameSource.IGDB,);
			return {
				gameId: item.gameId,
				igdbId: igdbMapping?.externalId ?? null,
				name: item.game.name,
				summary: item.game.summary,
				coverUrl: item.game.coverUrl,
				firstReleaseDate: item.game.firstReleaseDate,
				owned: true,
				playtimeMinutes: item.playtimeMinutes,
				lastSyncedAt: item.lastSyncedAt,
			}
		});
	}
	async addOwnedGameForUser(userId: string, igdbId: string) : Promise<{
		gameId: string; 
		igdbId: string;
		name: string;
		owned: true;
	}> {
		const cleanUserId = userId.trim();
		const cleanIgdbId = igdbId.trim();
		if (cleanIgdbId.length === 0) 
			throw new BadRequestException("IGDB Game ID is required");
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is required");
		const details = await this.igdbService.getGameDetails(cleanIgdbId);
		const game = await this.upsertFromExternal({
			source : ExternalGameSource.IGDB,
			externalId: cleanIgdbId,
			externalUrl: null,
			canonicalSlug: details.name,
			name: details.name,
			summary: details.summary,
			coverUrl: details.coverUrl,
			firstReleaseDate: details.firstReleaseDate
		})
		await this.prisma.userGame.upsert({
			where: {
				userId_gameId: {
					userId: cleanUserId,
					gameId: game.id,
				},
				},
				update:{
					owned:true,
				},
				create:{
					userId: cleanUserId,
					gameId: game.id,
					owned: true,
				},
		});
		return {
			gameId: game.id,
			igdbId: cleanIgdbId,
			name: game.name,
			owned: true,
		};
	}
	async findByCanonicalSlug(canonicalSlug: string) : Promise<Game | null> {
		const slug = this.normalizeSlug(canonicalSlug);
		const game= await this.prisma.game.findUnique({
			where: {canonicalSlug: slug},
		})
		if (!game)
			return null;
		return this.toDomain(game);
	}
	async enrichCanonicalGameIfMissing(
		gameId:string,
		input: {
			summary: string | null,
			coverUrl: string | null,
			firstReleaseDate: Date | null,
		},
	): Promise<Game> {
		const cleanGameId = gameId.trim();
		if (cleanGameId.length === 0)
			throw new BadRequestException("Game ID is required");
		const existing = await this.prisma.game.findUnique({where: {id: cleanGameId}});
		if (!existing)
			throw new NotFoundException("Game not found");
		const data : {
			summary?: string;
			coverUrl?: string;
			firstReleaseDate?: Date;
		}={}
		if (existing.summary === null && input.summary !== null)
			data.summary = input.summary;
		if (existing.coverUrl === null && input.coverUrl !== null)
			data.coverUrl = input.coverUrl;
		if (existing.firstReleaseDate === null && input.firstReleaseDate !== null)
			data.firstReleaseDate = input.firstReleaseDate;
		if (Object.keys(data).length === 0)
			return this.toDomain(existing);
		const updated = await this.prisma.game.update({
			where: {id: cleanGameId},
			data,
		});
		return this.toDomain(updated);
	}
	async removeOwnedGameForUser(userId: string, gameId: string): Promise<{
		gameId: string;
		removed: true;
	}> {
		const cleanUserId = userId.trim();
		const cleanGameId = gameId.trim();
		if (cleanUserId.length === 0)
			throw new BadRequestException("User ID is required");
		if (cleanGameId.length === 0)
			throw new BadRequestException("Game ID is required");
		const existing = await this.prisma.userGame.findUnique({
			where:{
				userId_gameId : {
					userId:cleanUserId,
					gameId:cleanGameId,
				},
			},
		});
		if (!existing)
			throw new NotFoundException("Game not found in user library");
		await this.prisma.userGame.delete({
			where:{
				userId_gameId : {
					userId:cleanUserId,
					gameId:cleanGameId,
				},
			},
		})
		return {gameId: cleanGameId, removed :true};
	}
}