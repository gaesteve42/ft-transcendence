import { Body, Controller, Post } from "@nestjs/common";
import { GameService } from "./games.service";
import { UpsertExternalGameDto } from "./dto/upsert-external-game.dto";


	@Controller("api/games")
	export class GameController {
		constructor(private readonly gameService: GameService){}
		@Post("upsert-external")
		upsert (@Body() body : UpsertExternalGameDto){
			const input = {externalId: body.externalId, name: body.name, source: body.source,
				externalUrl: body.externalUrl, canonicalSlug: body.canonicalSlug,
				summary: body.summary, coverUrl: body.coverUrl, firstReleaseDate: body.firstReleaseDate ? new Date(body.firstReleaseDate) : null
			};	
			return this.gameService.upsertFromExternal(input);
		}

	}