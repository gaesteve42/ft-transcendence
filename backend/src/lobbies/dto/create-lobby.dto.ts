import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";
import { createLobby } from "../lobbies.logic";

export class CreateLobbyDto
{
	@IsString()
	@IsNotEmpty()
	name: string;
	@IsInt()
	@Min(1)
	@Max(4)
	maxPlayers: number;
}