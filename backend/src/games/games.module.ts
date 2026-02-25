import { Module } from "@nestjs/common";
import { GameService } from "./games.service";

@Module({
	providers:[GameService],
	exports:[GameService],
})
export class GameModule{}