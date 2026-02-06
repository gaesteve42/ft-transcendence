import { IsEmail, IsNotEmpty, IsString, IsStrongPassword, MaxLength, MinLength } from "class-validator";

export class RegisterDto{
	@IsEmail()
	@IsNotEmpty()
	email: string;
	@IsString()
	@IsNotEmpty()
	@MinLength(3)
	@MaxLength(20)
	username: string;
	@IsString()
	@IsNotEmpty()
	@IsStrongPassword()
	password: string;
}