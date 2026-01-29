import { ServerResponse } from "http";

export function sendJson(
	res : ServerResponse,
	statusCode : number,
	payload: unknown
): void {
	res.statusCode = statusCode;
	res.setHeader("Content-Type", "application/json");
	res.end(JSON.stringify(payload));
};
