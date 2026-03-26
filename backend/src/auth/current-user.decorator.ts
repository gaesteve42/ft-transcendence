import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtUser } from "./jwt-user";

/**
 * Need to use @CurrentUser insted of Req.user everywhere for route
 * Use of field and keyof to add the possibility to just do
 * CurrentUser() and return the entire object or we can just do
 * CurrentUser("id") or CurrentUser("username") or CurrentUser("nickname")
 */
export const CurrentUser = createParamDecorator(
	(field: keyof JwtUser | undefined,  ctx: ExecutionContext) => {
		const req = ctx.switchToHttp().getRequest();
		const user = req.user as JwtUser | undefined;
		if (!user)
			return undefined;
		if (!field)
			return user;
		return user[field];
	},
);