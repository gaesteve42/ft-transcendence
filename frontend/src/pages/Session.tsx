import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../components/context/AuthContext'
import { useLobbySocket } from '../hooks/useLobbySocket'

const AVAILABLE_TAGS = [
	'Action', 'Adventure', 'RPG', 'Strategy', 'FPS',
	'Simulation', 'Puzzle', 'Platformer', 'Survival', 'Horror',
	'Racing', 'Sports', 'Fighting', 'Sandbox', 'MMO', 'Roguelike', 'Indie',
]

const BUDGETS = [
	{ id: 'free', label: 'Free to play' },
	{ id: 'under20', label: 'Under 20€' },
	{ id: 'under40', label: 'Under 40€' },
	{ id: 'any', label: 'Any price' },
] as const

const PLAYER_COLORS = [
	'text-blue-400',
	'text-red-400',
	'text-green-400',
	'text-orange-500',
]

function Session() {
	const { user } = useAuth()
	const { lobbyId: urlLobbyId } = useParams()
	const navigate = useNavigate()
	const [lobbyId, setLobbyId] = useState<string | null>(urlLobbyId || null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [copied, setCopied] = useState(false)
	const { lobby, messages, sendChat } = useLobbySocket(lobbyId)
	const [chatInput, setChatInput] = useState('')
	const chatEndRef = useRef<HTMLDivElement>(null)
	const [prefsOpen, setPrefsOpen] = useState(true)
	const [selectedTags, setSelectedTags] = useState<string[]>([])
	const [budget, setBudget] = useState<string | null>(null)
	const playerColorMap = useMemo(() => new Map(
		(lobby?.players ?? []).map((p, i) => [p.username, PLAYER_COLORS[i % PLAYER_COLORS.length]])
	), [lobby?.players])
	const isHost = lobby?.ownerId === user?.id
	const getToken = () => localStorage.getItem('accessToken') || ''

	useEffect(() => {
		if (urlLobbyId) { setLoading(false); return }
		const init = async () => {
			try {
				const meRes = await fetch('/api/lobbies/me', {
					headers: { Authorization: `Bearer ${getToken()}` },
				})
				if (meRes.ok) {
					const meData = await meRes.json()
					if (meData?.id) {
						setLobbyId(meData.id)
						navigate(`/session/${meData.id}`, { replace: true })
						setLoading(false)
						return
					}
				}
				const res = await fetch('/api/lobbies', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
					body: JSON.stringify({ name: `${user?.username}'s session`, maxPlayers: 4 }),
				})
				const data = await res.json()
				if (res.ok) {
					setLobbyId(data.id)
					navigate(`/session/${data.id}`, { replace: true })
				} else {
					setError(data.message || 'Failed to create lobby')
				}
			} catch { setError('Network error') }
			setLoading(false)
		}
		init()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps
	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])
	const leaveLobby = async () => {
		if (!lobbyId) return
		try {
			await fetch(`/api/lobbies/${lobbyId}/leave`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${getToken()}` },
			})
		} catch { /* ignore */ }
		setLobbyId(null)
		navigate('/dashboard')
	}
	const copyCode = () => {
		if (!lobby) return
		navigator.clipboard.writeText(lobby.id)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}
	const handleSendChat = () => {
		if (!chatInput.trim() || !user) return
		sendChat(user.username, chatInput.trim())
		setChatInput('')
	}
	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 3 ? [...prev, tag] : prev
		)
	}
	const handlePrefsDone = () => {
		setPrefsOpen(false)
	}
	if (loading) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
			</div>
		)
	}
	if (!lobbyId) {
		return (
			<div className="max-w-md mx-auto px-6 py-32 text-center">
				<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
					{error ? (
						<>
							<h1 className="text-3xl font-bold mb-3">Oops</h1>
							<div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6 text-red-400 text-sm">{error}</div>
							<button
								onClick={() => navigate('/dashboard')}
								className="px-6 py-2.5 rounded-lg text-sm font-medium border border-dark-600 text-text-muted hover:text-text-purple transition-colors cursor-pointer"
							>
								Back to dashboard
							</button>
						</>
					) : (
						<div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
					)}
				</motion.div>
			</div>
		)
	}
	if (!lobby) {
		return (
			<div className="max-w-6xl mx-auto px-6 py-12">
				<div className="animate-pulse space-y-6">
					<div className="h-8 w-64 bg-dark-700 rounded-lg mx-auto" />
					<div className="flex gap-5">
						<div className="w-72 bg-dark-800 border border-dark-600 rounded-2xl p-5 space-y-4">
							<div className="h-5 w-32 bg-dark-700 rounded-lg" />
							{[...Array(2)].map((_, i) => <div key={i} className="h-14 bg-dark-700 rounded-xl" />)}
						</div>
						<div className="flex-1 bg-dark-800 border border-dark-600 rounded-2xl h-80" />
						<div className="w-80 bg-dark-800 border border-dark-600 rounded-2xl h-96" />
					</div>
				</div>
			</div>
		)
	}
	return (
		<div className="px-10 py-8 min-h-[calc(100vh-180px)] flex flex-col">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -16 }}
				animate={{ opacity: 1, y: 0 }}
				className="mb-6"
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-28">
						<h1 className="text-3xl font-bold">{lobby.name}</h1>
						<div className="flex items-center gap-3">
							<button
								onClick={copyCode}
								className={`px-4 py-2 rounded-lg font-mono tracking-wider text-base font-medium transition-all cursor-pointer border ${copied
									? 'bg-green-500/10 border-green-500/30 text-green-400'
									: 'bg-dark-700 border-dark-500 text-white hover:border-dark-400 hover:text-text-purple hover:shadow-[0_0_16px_rgba(255,255,255,0.08)]'
									}`}
							>
								{copied ? '✓ Copied!' : lobby.id.slice(0, 8)}
							</button>
							<span className="text-sm text-text-muted">Copy the code and share it with your friends to join!</span>
						</div>
					</div>
					<button
						onClick={leaveLobby}
						className="px-5 py-2.5 rounded-lg text-sm font-medium border border-dark-600 text-text-muted hover:text-red-400 hover:border-red-500/30 transition-all cursor-pointer"
					>
						Leave session
					</button>
				</div>
			</motion.div>
			{/* 3-column layout */}
			<div className="flex gap-6 flex-1 items-stretch">
				{/* left column */}
				<motion.div
					initial={{ opacity: 0, x: -16 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.05 }}
					className="w-80 shrink-0 flex flex-col"
				>
					<div className="bg-dark-800 border border-dark-600 rounded-2xl p-5 flex-1 flex flex-col">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-4">
							Players · {lobby.players.length}/{lobby.maxPlayers}
						</p>
						<div className="space-y-3 flex-1">
							<AnimatePresence mode="popLayout">
								{lobby.players.map((p, i) => {
									const color = PLAYER_COLORS[i % PLAYER_COLORS.length]
									return (
										<motion.div
											key={p.id}
											layout
											initial={{ opacity: 0, x: -12 }}
											animate={{ opacity: 1, x: 0 }}
											exit={{ opacity: 0, x: -12 }}
											transition={{ type: 'spring', stiffness: 400, damping: 25 }}
											className={`rounded-xl px-4 py-3.5 flex items-center gap-3 transition-colors ${p.id === user?.id
												? 'bg-violet-500/10 border border-violet-500/30'
												: 'bg-dark-700/50 border border-dark-600'
												}`}
										>
											{p.avatarUrl ? (
												<img src={p.avatarUrl} alt={p.username} className="w-10 h-10 rounded-full border border-dark-500 shrink-0" />
											) : (
												<div className={`w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
													{p.username.charAt(0).toUpperCase()}
												</div>
											)}
											<div className="min-w-0 flex-1">
												<p className={`text-sm font-medium truncate ${color}`}>
													{p.username}
													{p.id === user?.id && <span className="text-text-muted ml-1.5 text-[11px]">(you)</span>}
												</p>
												{p.id === lobby.ownerId && (
													<p className="text-[11px] text-text-muted font-medium">Host</p>
												)}
											</div>
										</motion.div>
									)
								})}
							</AnimatePresence>
							{/* Empty slots */}
							{Array.from({ length: lobby.maxPlayers - lobby.players.length }).map((_, i) => (
								<div
									key={`empty-${i}`}
									className="rounded-xl px-4 py-3.5 flex items-center gap-3 border border-dashed border-dark-600"
								>
									<div className="w-10 h-10 rounded-full bg-dark-700/30 border border-dark-600 shrink-0" />
									<p className="text-sm text-text-muted/40">Waiting...</p>
								</div>
							))}
						</div>
						{/* Collapsed prefs summary */}
						<AnimatePresence>
							{!prefsOpen && selectedTags.length > 0 && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="overflow-hidden"
								>
									<div className="border-t border-dark-600 mt-4 pt-4">
										<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Your preferences</p>
										<div className="flex flex-wrap gap-1.5 mb-2">
											{selectedTags.map((tag) => (
												<span key={tag} className="px-2 py-0.5 rounded-md text-[11px] bg-violet-500/15 text-violet-300 border border-violet-500/25">
													{tag}
												</span>
											))}
											{budget && (
												<span className="px-2 py-0.5 rounded-md text-[11px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
													{BUDGETS.find((b) => b.id === budget)?.label}
												</span>
											)}
										</div>
										<button
											onClick={() => setPrefsOpen(true)}
											className="text-[11px] text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer"
										>
											Edit preferences
										</button>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</div>
				</motion.div>
				{/* Preferences or ready state */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="flex-1 min-w-0 flex flex-col"
				>
					<AnimatePresence mode="wait">
						{prefsOpen ? (
							<motion.div
								key="prefs"
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								transition={{ duration: 0.25 }}
								className="bg-dark-800 border border-dark-600 rounded-2xl p-8 flex-1 flex flex-col"
							>
								<div className="flex items-start justify-between mb-6">
									<div>
										<h2 className="text-xl font-bold">Your preferences</h2>
										<p className="text-text-muted text-sm mt-1">Select the genres that you enjoy</p>
									</div>
									<div className="flex items-center gap-2 shrink-0 ml-4">
										<span className="text-xs text-text-muted bg-dark-700 px-3 py-1.5 rounded-lg">
											{selectedTags.length}/3 genres
										</span>
										<span className={`text-xs px-3 py-1.5 rounded-lg ${budget ? 'bg-cyan-500/15 text-cyan-300' : 'bg-dark-700 text-text-muted'}`}>
											{budget ? BUDGETS.find((b) => b.id === budget)?.label : 'No budget'}
										</span>
									</div>
								</div>
								{/* Genres */}
								<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
									Game genres <span className="text-red-400">*</span>
								</p>
								<div className="flex flex-wrap gap-2.5">
									{AVAILABLE_TAGS.map((tag) => {
										const selected = selectedTags.includes(tag)
										return (
											<button
												key={tag}
												onClick={() => toggleTag(tag)}
												className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer h-fit ${selected
													? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-[0_0_12px_rgba(146,57,228,0.15)]'
													: 'bg-dark-700 text-text-muted border border-dark-500 hover:border-dark-400 hover:text-text-white'
													}`}
											>
												{tag}
											</button>
										)
									})}
								</div>
								{/* Budget */}
								<div className="mt-7">
									<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
										Budget
									</p>
									<div className="flex gap-2.5">
										{BUDGETS.map((b) => (
											<button
												key={b.id}
												onClick={() => setBudget(b.id)}
												className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border ${budget === b.id
													? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
													: 'bg-dark-700 text-text-muted border-dark-500 hover:border-dark-400 hover:text-text-white'
													}`}
											>
												{b.label}
											</button>
										))}
									</div>
								</div>
								<div className="flex justify-end mt-auto pt-5 border-t border-dark-600">
									<button
										onClick={handlePrefsDone}
										disabled={selectedTags.length === 0}
										className={`px-10 py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer ${selectedTags.length > 0
											? 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_20px_rgba(146,57,228,0.3)] hover:shadow-[0_0_30px_rgba(146,57,228,0.5)]'
											: 'bg-dark-700 text-text-muted cursor-not-allowed'
											}`}
									>
										Confirm preferences
									</button>
								</div>
							</motion.div>
						) : (
							<motion.div
								key="ready"
								initial={{ opacity: 0, scale: 0.98 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								transition={{ duration: 0.25 }}
								className="bg-dark-800 border border-dark-600 rounded-2xl p-8 flex-1 flex flex-col items-center justify-center"
							>
								<div className="text-center">
									<div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-500/30 flex items-center justify-center mx-auto mb-5">
										<span className="text-3xl">&#9889;</span>
									</div>
									<h2 className="text-xl font-bold mb-2">Ready to go</h2>
									<p className="text-text-muted text-sm mb-8 max-w-sm">
										{isHost
											? 'Waiting for all players to set their preferences before launching.'
											: 'Waiting for the host to launch the algorithm.'}
									</p>
									{isHost && (
										<button
											disabled
											className="px-12 py-3.5 rounded-xl font-semibold text-sm bg-dark-700 border border-dark-600 text-text-muted cursor-not-allowed"
										>
											Launch algorithm
										</button>
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
				{/* Chat */}
				<motion.div
					initial={{ opacity: 0, x: 16 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.15 }}
					className="w-96 shrink-0 flex flex-col"
				>
					<div className="bg-dark-800 border border-dark-600 rounded-2xl p-5 flex flex-col flex-1">
						<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-4">
							Chat
						</p>
						{/* Messages */}
						<div className="flex-1 overflow-y-auto mb-4 pr-1">
							{messages.length === 0 ? (
								<div className="flex flex-col items-center justify-center h-full text-center">
									<p className="text-text-muted/50 text-sm">No messages yet.</p>
									<p className="text-text-muted/30 text-xs mt-1">Say hi to your team!</p>
								</div>
							) : (
								messages.map((msg, i) => (
									<div key={`${msg.username}-${i}`} className="text-sm px-3 py-1 rounded-lg hover:bg-dark-700/50 transition-colors">
										<span className={`font-semibold ${playerColorMap.get(msg.username) ?? 'text-text-white'}`}>{msg.username}</span>
										<span className="text-text-muted mx-1.5 text-xs">·</span>
										<span className="text-text-white">{msg.message}</span>
									</div>
								))
							)}
							<div ref={chatEndRef} />
						</div>
						{/* Input */}
						<div className="flex gap-2">
							<input
								value={chatInput}
								onChange={(e) => setChatInput(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
								placeholder="Type a message..."
								className="flex-1 bg-dark-700 border border-dark-500 rounded-lg px-4 py-2.5 text-sm text-text-purple placeholder-text-muted/50 focus:outline-none focus:border-violet-500/50 transition-colors"
								maxLength={500}
							/>
							<button
								onClick={handleSendChat}
								disabled={!chatInput.trim()}
								className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${chatInput.trim()
									? 'bg-violet-600 hover:bg-violet-700 text-white'
									: 'bg-dark-700 text-text-muted cursor-not-allowed'
									}`}
							>
								Send
							</button>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}

export default Session
