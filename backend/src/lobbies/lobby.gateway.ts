import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	ConnectedSocket,
	MessageBody,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { LobbiesService } from "./lobbies.service";

@WebSocketGateway({ cors: { origin: "*" } })
export class LobbyGateway implements OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	// Track which socket is in which lobby
	private socketLobby = new Map<string, string>();

	constructor(private readonly lobbiesService: LobbiesService) {}

	// Client joins a lobby room after creating or joining via REST
	@SubscribeMessage("lobby:join")
	async handleJoin(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { lobbyId: string },
	) {
		const { lobbyId } = data;
		client.join(lobbyId);
		this.socketLobby.set(client.id, lobbyId);

		// Send current lobby state to the joining client
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			client.emit("lobby:state", lobby);
			// Notify others in the room
			client.to(lobbyId).emit("lobby:updated", lobby);
		} catch {
			client.emit("lobby:error", { message: "Lobby not found" });
		}
	}

	// Client sends a chat message
	@SubscribeMessage("lobby:chat")
	handleChat(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { lobbyId: string; username: string; message: string },
	) {
		const { lobbyId, username, message } = data;
		if (!message || message.trim().length === 0) return;

		const chatMessage = {
			username,
			message: message.trim().slice(0, 500),
			timestamp: Date.now(),
		};
		this.server.to(lobbyId).emit("lobby:chat:message", chatMessage);
	}

	// Broadcast lobby update (called from outside the gateway, e.g. after REST actions)
	async broadcastLobbyUpdate(lobbyId: string) {
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			this.server.to(lobbyId).emit("lobby:updated", lobby);
		} catch {
			// Lobby was deleted (last player left)
			this.server.to(lobbyId).emit("lobby:deleted", { lobbyId });
		}
	}

	// Clean up when a socket disconnects
	handleDisconnect(client: Socket) {
		const lobbyId = this.socketLobby.get(client.id);
		if (lobbyId) {
			client.leave(lobbyId);
			this.socketLobby.delete(client.id);
		}
	}
}