import {IsNotEmpty, IsString } from "class-validator";

export class SteamExchangeDto{
	@IsString()
	@IsNotEmpty()
	code: string;
}
