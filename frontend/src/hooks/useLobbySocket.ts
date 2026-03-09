import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export type LobbyPlayer = {
	id: string
	username: string
	avatarUrl: string | null
}

export type Lobby = {
	id: string
	name: string
	maxPlayers: number
	ownerId: string
	players: LobbyPlayer[]
}

export type ChatMessage = {
	username: string
	message: string
	timestamp: number
}

export function useLobbySocket(lobbyId: string | null) {
	const socketRef = useRef<Socket | null>(null)
	const [lobby, setLobby] = useState<Lobby | null>(null)
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [connected, setConnected] = useState(false)

	useEffect(() => {
		if (!lobbyId) return

		const socket = io({ path: '/socket.io' })
		socketRef.current = socket

		socket.on('connect', () => {
			setConnected(true)
			socket.emit('lobby:join', { lobbyId })
		})

		socket.on('lobby:state', (data: Lobby) => setLobby(data))
		socket.on('lobby:updated', (data: Lobby) => setLobby(data))
		socket.on('lobby:deleted', () => setLobby(null))
		socket.on('lobby:chat:message', (msg: ChatMessage) => {
			setMessages((prev) => [...prev, msg])
		})

		socket.on('disconnect', () => setConnected(false))

		return () => {
			socket.disconnect()
			socketRef.current = null
			setConnected(false)
		}
	}, [lobbyId])

	const sendChat = useCallback(
		(username: string, message: string) => {
			if (socketRef.current && lobbyId) {
				socketRef.current.emit('lobby:chat', { lobbyId, username, message })
			}
		},
		[lobbyId],
	)

	return { lobby, messages, connected, sendChat }
}
