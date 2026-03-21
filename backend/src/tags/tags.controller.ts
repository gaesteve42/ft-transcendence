import { Controller, Get } from "@nestjs/common";
import { Public } from "src/auth/public.decorator";
import { TagsService } from "./tags.service";

@Controller("api/tags")
export class TagsController {
	constructor(private readonly tagsService: TagsService) {}

	@Public()
	@Get()
	async getAllTags() {
		return this.tagsService.getAllTags();
	}
}
