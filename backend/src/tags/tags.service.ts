import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class TagsService {
	constructor(private readonly prisma: PrismaService) {}

	async getAllTags(): Promise<{ id: string; slug: string; label: string }[]> {
		return this.prisma.tag.findMany({
			select: { id: true, slug: true, label: true },
			orderBy: { label: "asc" },
		});
	}
}
