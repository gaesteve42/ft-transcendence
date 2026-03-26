import { IsNotEmpty, IsString } from "class-validator";

export class AddOwnedGameDto{
	@IsNotEmpty()
	@IsString()
	igdbId: string
}
