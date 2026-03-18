import { IgdbGameTag } from "./igdb-game-tag";

export type IgdbGameDetails = {
	igdbId: string;
	name: string;
	summary: string | null;
	coverUrl: string | null;
	firstReleaseDate: Date | null;
	supportsMultiplayerOrCoop: boolean;
	genres: IgdbGameTag[];
	themes: IgdbGameTag[];
	keywords: IgdbGameTag[];
	gameModeNames: string[];
}