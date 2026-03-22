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

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL } })
export class LobbyGateway implements OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	// Track which socket is in which lobby
	private socketLobby = new Map<string, string>();
	// In-memory chat history per lobby (capped at 100 messages)
	private chatHistory = new Map<string, { username: string; message: string; timestamp: number }[]>();

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

		// Send current lobby state + chat history to the joining client
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			const readiness = await this.lobbiesService.getLobbyReadiness(lobbyId);
			const lobbyWithReadiness = { ...lobby, readiness };
			client.emit("lobby:state", lobbyWithReadiness);
			const history = this.chatHistory.get(lobbyId) ?? [];
			if (history.length > 0) {
				client.emit("lobby:chat:history", history);
			}
			// Notify others in the room
			client.to(lobbyId).emit("lobby:updated", lobbyWithReadiness);
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
		// Store in history (cap at 100)
		if (!this.chatHistory.has(lobbyId)) {
			this.chatHistory.set(lobbyId, []);
		}
		const history = this.chatHistory.get(lobbyId)!;
		history.push(chatMessage);
		if (history.length > 100) {
			history.shift();
		}
		this.server.to(lobbyId).emit("lobby:chat:message", chatMessage);
	}

	// Broadcast lobby update (called from outside the gateway, e.g. after REST actions)
	async broadcastLobbyUpdate(lobbyId: string) {
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			const readiness = await this.lobbiesService.getLobbyReadiness(lobbyId);
			this.server.to(lobbyId).emit("lobby:updated", { ...lobby, readiness });
		} catch {
			// Lobby was deleted (last player left) — clean up chat history
			this.chatHistory.delete(lobbyId);
			this.server.to(lobbyId).emit("lobby:deleted", { lobbyId });
		}
	}

	// Broadcast recommendations to all players in the lobby
	broadcastRecommendations(lobbyId: string, recommendations: unknown[]) {
		this.server.to(lobbyId).emit("lobby:recommendations", recommendations);
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