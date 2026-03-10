import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { Min, Max} from "class-validator";

export class SearchCatalogQueryDto{
	@IsNotEmpty()
	@IsString()
	query: string;
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(25)
	limit?: number;
}