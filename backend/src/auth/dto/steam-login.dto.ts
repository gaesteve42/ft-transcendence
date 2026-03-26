import {IsNotEmpty, IsString } from "class-validator";

export class SteamLoginDto{
	@IsString()
	@IsNotEmpty()
	steamId: string;
	@IsString()
	@IsNotEmpty()
	username: string;
	@IsString()
	@IsNotEmpty()
	avatarUrl: string;
}
