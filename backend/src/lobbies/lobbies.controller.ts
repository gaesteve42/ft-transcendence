import { Controller, Get, Param} from "@nestjs/common";
import { LobbiesService } from "./lobbies.service";



@Controller("api/lobbies")
export class LobbiesController{
	constructor(private readonly service : LobbiesService){}
	@Get("ping")
	ping(){
		return {ok: true};
	}
	@Get(":id")
	id(@Param("id") id : string) {
		return this.service.getLobbyById(id);
	}
} 