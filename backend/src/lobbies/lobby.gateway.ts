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
	private socketLobby = new Map<string, string>();
	private chatHistory = new Map<string, { username: string; message: string; timestamp: number }[]>();
	constructor(private readonly lobbiesService: LobbiesService) {}
	@SubscribeMessage("lobby:join")
	async handleJoin(
		@ConnectedSocket() client: Socket,
		@MessageBody() data: { lobbyId: string },
	) {
		const { lobbyId } = data;
		client.join(lobbyId);
		this.socketLobby.set(client.id, lobbyId);
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			const readiness = await this.lobbiesService.getLobbyReadiness(lobbyId);
			const lobbyWithReadiness = { ...lobby, readiness };
			client.emit("lobby:state", lobbyWithReadiness);
			const history = this.chatHistory.get(lobbyId) ?? [];
			if (history.length > 0) {
				client.emit("lobby:chat:history", history);
			}
			client.to(lobbyId).emit("lobby:updated", lobbyWithReadiness);
		} catch {
			client.emit("lobby:error", { message: "Lobby not found" });
		}
	}
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
	async broadcastLobbyUpdate(lobbyId: string) {
		try {
			const lobby = await this.lobbiesService.getLobbyById(lobbyId);
			const readiness = await this.lobbiesService.getLobbyReadiness(lobbyId);
			this.server.to(lobbyId).emit("lobby:updated", { ...lobby, readiness });
		} catch {
			this.chatHistory.delete(lobbyId);
			this.server.to(lobbyId).emit("lobby:deleted", { lobbyId });
		}
	}
	broadcastRecommendations(lobbyId: string, recommendations: unknown[]) {
		this.server.to(lobbyId).emit("lobby:recommendations", recommendations);
	}
	handleDisconnect(client: Socket) {
		const lobbyId = this.socketLobby.get(client.id);
		if (lobbyId) {
			client.leave(lobbyId);
			this.socketLobby.delete(client.id);
		}
	}
}
