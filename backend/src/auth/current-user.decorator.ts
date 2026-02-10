import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Need to use @CurrentUser insted of Req.user everywhere for route
 */
export const CurrentUser = createParamDecorator(
	(data: string| undefined,  ctx: ExecutionContext) => {
		const req = ctx.switchToHttp().getRequest();
		const user = req.user;
		if (!data)
			return user;
		return user?.[data];
	},
);