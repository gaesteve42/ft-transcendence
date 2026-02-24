import { Module } from "@nestjs/common";
import { LobbiesController } from "./lobbies.controller";
import { LobbiesService } from "./lobbies.service";
import { LoggingModule } from "src/common/logging/logging.module";

@Module({
	imports:[LoggingModule],
	controllers: [LobbiesController],
	providers: [LobbiesService],
})
export class LobbiesModule{}
