import { Module } from "@nestjs/common";
import { LobbiesController } from "./lobbies.controller";
import { LobbiesService } from "./lobbies.service";
import { LobbyGateway } from "./lobby.gateway";
import { LoggingModule } from "src/common/logging/logging.module";

@Module({
	imports:[LoggingModule],
	controllers: [LobbiesController],
	providers: [LobbiesService, LobbyGateway],
})
export class LobbiesModule{}
