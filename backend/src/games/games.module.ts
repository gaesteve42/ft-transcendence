import { Module } from "@nestjs/common";
import { GameService } from "./games.service";
import { GameController } from "./games.controller";

@Module({
	providers:[GameService],
	controllers: [GameController],
	exports:[GameService],
})
export class GameModule{}	