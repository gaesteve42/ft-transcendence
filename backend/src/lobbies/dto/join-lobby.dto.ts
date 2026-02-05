import { IsString, IsNotEmpty } from "class-validator";
export class JoinLobbyDto{
	@IsString()
	@IsNotEmpty()
	playerId: string;	
}
