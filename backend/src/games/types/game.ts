
export type Game = {
	id: string;
	canonicalSlug: string;
	name: string;
	summary: string | null;
	coverUrl: string | null;
	firstReleaseDate: Date | null ;
	createdAt: Date;
	updatedAt: Date;       
};

export type UserLibraryGame = {
	gameId: string;
	igdbId: string | null;
	name: string;
	summary: string | null;
	coverUrl: string | null;
	firstReleaseDate: Date | null ;
	owned: true;
	playtimeMinutes: number | null;
	lastSyncedAt: Date | null;
};
