
export function extractLobbyId(url: string | undefined): string | null
{

	const prefix = "/api/lobbies/";
	if (url === undefined)
		return null;
	else
	{
		if (url.startsWith(prefix) === false)
			return null;
		let id = url.slice(prefix.length).split("?")[0];
		if (id.length === 0 )
			return null;
		return (id);
	}
}
