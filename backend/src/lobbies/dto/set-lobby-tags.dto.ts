import {IsNotEmpty, IsString, IsArray, ArrayMinSize, ArrayMaxSize, ArrayUnique } from "class-validator"
export class SetLobbyTagsDto{
	@IsArray()
	@ArrayMinSize(1)
	@ArrayMaxSize(5)
	@ArrayUnique()
	@IsString({each: true})
	@IsNotEmpty({each: true})
	tagIds: string[]
}
