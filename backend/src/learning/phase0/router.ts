
import { IncomingMessage, ServerResponse } from "http";
import { sendJson } from "./response";
import { getLobbiesById, createLobby } from "./lobbies";
import { readJsonBody } from "./utils/http";

function handleGet(req: IncomingMessage, res: ServerResponse): boolean
{
	if (req.method !== "GET")
  		return false;
	if (req.url === "/api/health")
	{
		sendJson(res, 200, { ok: true });
		return true;
	}

	const id = extractLobbyId(req.url);
	if (id !== null)
	{
		const result = getLobbiesById(id);
		if (result.ok)
			sendJson(res, 200, result.lobby);
		else
			sendJson(res, 404, { error: result.error });
		return true;
	}

	return false;
}

function handlePost(req: IncomingMessage, res: ServerResponse): boolean
{
	if (req.method !== "POST")
  		return false;
	if (req.url !== "/api/lobbies")
		return false;
	readJsonBody(req)
		.then((body) => {
			if (typeof body !== "object" || body === null)
			{
				sendJson(res, 400, { error: "Invalid payload" });
				return;
			}

			const obj = body as Record<string, unknown>;
			const name = obj["name"];
			const maxPlayers = obj["maxPlayers"];

			if (typeof name !== "string" || typeof maxPlayers !== "number")
			{
				sendJson(res, 400, { error: "Invalid payload" });
				return;
			}

			const result = createLobby(name, maxPlayers);
			if (result.ok)
				sendJson(res, 201, result.lobby);
			else
				sendJson(res, 400, { error: result.error });
		})
		.catch(() => {
			sendJson(res, 400, { error: "Invalid JSON" });
		});

	return true;
}

export function router(req: IncomingMessage, res: ServerResponse): void
{
	if (req.method === "GET" && handleGet(req, res))
		return;
	if (req.method === "POST" && handlePost(req, res))
		return;
	sendJson(res, 404, { error: "Not found" });
}

export function extractLobbyId(url: string | undefined): string | null{

	const prefix = "/api/lobbies/";
	if (url === undefined)
		return null;
	else
	{
		if (url.startsWith(prefix) === false)
			return null;
		let id = url.slice(prefix.length);
		if (id.length === 0 )
			return null;
		return (id);
	}
}
