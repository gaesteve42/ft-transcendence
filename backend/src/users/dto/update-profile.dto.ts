import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateProfileDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(30)
	username: string;
}
