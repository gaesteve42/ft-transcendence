import { IgdbGameTag } from "./igdb-game-tag";

export type IgdbGameDetails = {
	igdbId: string;
	name: string;
	summary: string | null;
	coverUrl: string | null;
	firstReleaseDate: Date | null;
	genres: IgdbGameTag[];
	themes: IgdbGameTag[];
	keywords: IgdbGameTag[];
}