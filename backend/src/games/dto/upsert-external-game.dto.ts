import { ExternalGameSource } from "@prisma/client";
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class UpsertExternalGameDto
{
	@IsString()
	@IsNotEmpty()
	externalId: string;
	@IsString()
	@IsNotEmpty()
	name: string;
	@IsEnum(ExternalGameSource)
	@IsNotEmpty()
	source: ExternalGameSource;
	@IsOptional()
	@IsString()
	externalUrl: string | null;
	@IsNotEmpty()
	@IsString()
	canonicalSlug: string;
	@IsOptional()
	@IsString()
	summary: string | null;
	@IsOptional()
	@IsString()
	coverUrl: string | null;
	@IsOptional()
	@IsDateString()
	firstReleaseDate: string | null;
};
