import { IncomingMessage} from "http";

export function readJsonBody(req: IncomingMessage): Promise<unknown> 
{
	return new Promise((resolve, reject) =>
	{
		let body = "";
		req.on("data", (chunk) => 
		{
			body+=chunk.toString();
		});
		req.on("end", () =>
			{
				try 
				{
					const parsed = JSON.parse(body);
					resolve(parsed);
				} 
				catch 
				{ 
				reject(new Error("Invalid JSON"));
				}
			});
		req.on("error", () => 
		{
			reject(new Error("Request error"));
		});

	});
}

