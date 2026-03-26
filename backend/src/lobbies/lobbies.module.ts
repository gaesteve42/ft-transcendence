import { Module } from "@nestjs/common";
import { LobbiesController } from "./lobbies.controller";
import { LobbiesService } from "./lobbies.service";
import { LobbyGateway } from "./lobby.gateway";
import { LoggingModule } from "src/common/logging/logging.module";
import { RecommendService } from "./recommend.service";

@Module({
	imports:[LoggingModule],
	controllers: [LobbiesController],
	providers: [LobbiesService, LobbyGateway, RecommendService],
})
export class LobbiesModule{}
