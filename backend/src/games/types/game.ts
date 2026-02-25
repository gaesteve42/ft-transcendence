
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