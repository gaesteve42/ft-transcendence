
import { IncomingMessage, ServerResponse } from "http";
import { sendJson } from "./response";
import { getLobbiesById } from "./lobbies";
import { LobbyResult } from "./types/lobbies";


export function router(req:IncomingMessage, res:ServerResponse): void
{
	

	if (req.method === "GET" && req.url === "/api/health"){
		sendJson(res, 200, { ok :true});
		return;
	}
	else if (req.method === "POST" && req.url === "/api/lobbies")
	{
		sendJson(res, 201, {ok: true});
		return ;
	}
	else if (req.method === "GET")
	{
		const id = extractLobbyId(req.url);
		if (id !== null)
		{
			const result = getLobbiesById(id);
			if (result.ok)
			{
				sendJson(res, 200, result.lobby);
				return;
			}
			else
			{
				sendJson(res, 404, { error: result.error });
				return;
			}
			return ;
		}
	}
	sendJson(res, 404, {error: "Not found"});
}



/*change le 3eme else if 
// si le lobbies id est trouver ->200 sinon -> 404

export function checkId(req: IncomingMessage): string | null
{
	let str = req.url;
	if (str === undefined)
		return null;
	if (str.startsWith("/lobbies/"))
	{
		let id = str.split("/lobbies/", str?.length);
		return true;
	}
	if (str.)
	return false;	
}
*/

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
