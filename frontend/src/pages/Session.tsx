import { useState, useRef, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'motion/react'
import { useAuth } from '../components/context/AuthContext'
import Logo from '../components/ui/Logo'
import { useLobbySocket } from '../hooks/useLobbySocket'

type Tag = { id: string; slug: string; label: string }

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
	const { lobby, messages, sendChat, recommendations } = useLobbySocket(lobbyId)
	const [chatInput, setChatInput] = useState('')
	const chatEndRef = useRef<HTMLDivElement>(null)
	const [prefsOpen, setPrefsOpen] = useState(true)
	const [availableTags, setAvailableTags] = useState<Tag[]>([])
	const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
	const [launching, setLaunching] = useState(false)
	const [launchError, setLaunchError] = useState('')
	const [showAllResults, setShowAllResults] = useState(false)
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
	useEffect(() => {
		fetch('/api/tags', { headers: { Authorization: `Bearer ${getToken()}` } })
			.then((res) => res.ok ? res.json() : [])
			.then((data) => setAvailableTags(data))
			.catch(() => { })
	}, [])
	// Load saved tags from backend on mount / when lobbyId changes
	useEffect(() => {
		if (!lobbyId) return
		fetch(`/api/lobbies/${lobbyId}/tags/me`, { headers: { Authorization: `Bearer ${getToken()}` } })
			.then((res) => res.ok ? res.json() : [])
			.then((tagIds: string[]) => {
				if (tagIds.length > 0) {
					setSelectedTagIds(tagIds)
					setPrefsOpen(false)
				}
			})
			.catch(() => { })
	}, [lobbyId])
	const openEditPrefs = async () => {
		setPrefsOpen(true)
		if (!lobbyId) return
		try {
			await fetch(`/api/lobbies/${lobbyId}/tags`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${getToken()}` },
			})
		} catch { /* ignore */ }
	}
	const toggleTag = (tagId: string) => {
		setSelectedTagIds((prev) =>
			prev.includes(tagId) ? prev.filter((t) => t !== tagId) : prev.length < 5 ? [...prev, tagId] : prev
		)
	}
	const handlePrefsDone = async () => {
		if (!lobbyId || selectedTagIds.length === 0) return
		try {
			await fetch(`/api/lobbies/${lobbyId}/tags`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
				body: JSON.stringify({ tagIds: selectedTagIds }),
			})
		} catch { }
		setPrefsOpen(false)
	}
	const launchAlgorithm = async () => {
		if (!lobbyId) return
		setLaunching(true)
		setLaunchError('')
		try {
			const res = await fetch(`/api/lobbies/${lobbyId}/recommend`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${getToken()}` },
			})
			if (!res.ok) {
				const errData = await res.json()
				setLaunchError(errData.message || 'Failed to get recommendations')
			}
		} catch {
			setLaunchError('Network error')
		}
		setLaunching(false)
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
							{!prefsOpen && selectedTagIds.length > 0 && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: 'auto' }}
									exit={{ opacity: 0, height: 0 }}
									className="overflow-hidden"
								>
									<div className="border-t border-dark-600 mt-4 pt-4">
										<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">Your preferences</p>
										<div className="flex flex-wrap gap-1.5 mb-2">
											{selectedTagIds.map((tagId) => {
												const tag = availableTags.find((t) => t.id === tagId)
												return (
													<span key={tagId} className="px-2 py-0.5 rounded-md text-[11px] bg-violet-500/15 text-violet-300 border border-violet-500/25">
														{tag?.label ?? tagId}
													</span>
												)
											})}
										</div>
										<button
											onClick={openEditPrefs}
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
											{selectedTagIds.length}/5 genres
										</span>
									</div>
								</div>
								{/* Genres */}
								<p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-3">
									Game genres <span className="text-red-400">*</span>
								</p>
								<div className="flex flex-wrap gap-2.5">
									{availableTags.map((tag) => {
										const selected = selectedTagIds.includes(tag.id)
										return (
											<button
												key={tag.id}
												onClick={() => toggleTag(tag.id)}
												className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer h-fit ${selected
													? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-[0_0_12px_rgba(146,57,228,0.15)]'
													: 'bg-dark-700 text-text-muted border border-dark-500 hover:border-dark-400 hover:text-text-white'
													}`}
											>
												{tag.label}
											</button>
										)
									})}
								</div>
								<div className="flex justify-end mt-auto pt-5 border-t border-dark-600">
									<button
										onClick={handlePrefsDone}
										disabled={selectedTagIds.length === 0}
										className={`px-10 py-3 rounded-lg font-semibold text-sm transition-all cursor-pointer ${selectedTagIds.length > 0
											? 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_20px_rgba(146,57,228,0.3)] hover:shadow-[0_0_30px_rgba(146,57,228,0.5)]'
											: 'bg-dark-700 text-text-muted cursor-not-allowed'
											}`}
									>
										Confirm preferences
									</button>
								</div>
							</motion.div>
						) : recommendations.length > 0 ? (
							<motion.div
								key="results"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0, scale: 0.98 }}
								transition={{ duration: 0.4 }}
								className="bg-dark-800 border border-dark-600 rounded-2xl p-6 flex-1 flex flex-col overflow-y-auto"
							>
								<div className="text-center mb-5">
									<p className="text-xs font-semibold uppercase tracking-wider text-violet-400 mb-1">Algorithm results</p>
									<h2 className="text-xl font-bold">Games for your group</h2>
								</div>
								{/* Podium — top 3 */}
								<div className="grid grid-cols-3 gap-3 mb-5">
									{recommendations.slice(0, 3).map((rec, i) => (
										<motion.div
											key={rec.gameId}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
											className={`relative rounded-xl overflow-hidden border group ${i === 0
												? 'border-violet-500/40'
												: 'border-dark-600 hover:border-violet-500/30'
												} transition-colors`}
											style={i === 0 ? { boxShadow: '0 0 20px rgba(146,57,228,0.2)' } : undefined}
										>
											{rec.coverUrl ? (
												<img
													src={rec.coverUrl.replace('t_cover_big', 't_cover_big_2x')}
													alt={rec.name}
													className="w-full aspect-2/3 object-cover group-hover:scale-105 transition-transform duration-300"
												/>
											) : (
												<div className="w-full aspect-2/3 bg-dark-700 flex items-center justify-center text-2xl text-text-muted">?</div>
											)}
											<div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/30 to-transparent" />
											<div className="absolute top-2 left-2">
												<span className={`px-2 py-0.5 rounded-md text-xs font-bold ${i === 0
													? 'bg-violet-500/90 text-white'
													: 'bg-dark-700/80 text-text-white border border-dark-500'
													}`}>
													#{i + 1}
												</span>
											</div>
											<div className="absolute top-2 right-2">
												<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-dark-700/80 text-violet-300 border border-violet-500/25">
													{Math.round(rec.score * 100)}%
												</span>
											</div>
											<div className="absolute bottom-0 left-0 right-0 p-2.5">
												<p className="text-sm font-semibold truncate">{rec.name}</p>
											</div>
										</motion.div>
									))}
								</div>
								{/* See all button */}
								{recommendations.length > 3 && !showAllResults && (
									<button
										onClick={() => setShowAllResults(true)}
										className="mx-auto px-6 py-2 rounded-lg text-sm font-medium border border-dark-600 text-text-muted hover:text-violet-400 hover:border-violet-500/30 transition-all cursor-pointer"
									>
										See all {recommendations.length} recommendations
									</button>
								)}
								{/* Full list with scores */}
								<AnimatePresence>
									{showAllResults && (
										<motion.div
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											className="space-y-1.5 overflow-y-auto max-h-60"
										>
											{recommendations.map((rec, i) => (
												<div key={rec.gameId} className="flex items-center gap-3 bg-dark-700/50 border border-dark-600 rounded-lg px-3 py-2">
													<span className="text-sm font-bold text-text-muted w-6 text-center shrink-0">#{i + 1}</span>
													{rec.coverUrl ? (
														<img src={rec.coverUrl} alt={rec.name} className="w-8 h-11 rounded object-cover shrink-0" />
													) : (
														<div className="w-8 h-11 rounded bg-dark-600 shrink-0" />
													)}
													<p className="text-sm font-medium text-text-white truncate flex-1">{rec.name}</p>
													<span className="text-xs text-violet-300/60 font-medium shrink-0">
														{Math.round(rec.score * 100)}%
													</span>
												</div>
											))}
										</motion.div>
									)}
								</AnimatePresence>
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
									<div className="flex justify-center mb-5">
										<Logo width={120} height={120} />
									</div>
									<h2 className="text-xl font-bold mb-2">Ready to go</h2>
									<p className="text-text-muted text-sm mb-8 max-w-sm">
										{isHost
											? 'Waiting for all players to set their preferences before launching.'
											: 'Waiting for the host to launch the algorithm.'}
									</p>
									{isHost && (() => {
									const notReady = !lobby.readiness?.ready || lobby.players.length < 2
									return (
										<>
											<button
												onClick={launchAlgorithm}
												disabled={launching || notReady}
												className={`px-12 py-3.5 rounded-xl font-semibold text-sm transition-all cursor-pointer ${launching || notReady
													? 'bg-dark-700 border border-dark-600 text-text-muted cursor-not-allowed'
													: 'bg-violet-600 hover:bg-violet-700 text-white shadow-[0_0_20px_rgba(146,57,228,0.3)] hover:shadow-[0_0_30px_rgba(146,57,228,0.5)]'
													}`}
											>
												{launching ? 'Searching...' : 'Launch algorithm'}
											</button>
											{lobby.players.length < 2 && (
												<p className="text-text-muted text-xs mt-3">At least 2 players required</p>
											)}
											{lobby.players.length >= 2 && notReady && !launching && (
												<p className="text-text-muted text-xs mt-3">Waiting for all players to confirm their preferences</p>
											)}
											{launchError && (
												<p className="text-red-400 text-xs mt-3">{launchError}</p>
											)}
										</>
									)
								})()}
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
						<div className="flex-1 overflow-y-auto mb-4 pr-1 max-h-170">
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
