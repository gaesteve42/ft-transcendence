import { ExternalGameSource } from "@prisma/client";
import { IsEmpty, IsString } from "class-validator";

export class upsertFromExternal 
{
	@IsString()
	@IsEmpty()
	externalId: string;
	@IsString()
	@IsEmpty()
	name: string;
	source: ExternalGameSource;
	externalUrl: string | null;
	canonicalSlug: string;
	summary: string | null;
	coverUrl: string | null;
	firstReleaseDate: Date | null;
};
