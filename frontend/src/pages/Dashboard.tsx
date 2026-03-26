import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/context/AuthContext'
import { motion, AnimatePresence } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import Button from '../components/ui/Button'

type SteamGame = {
	appId: string
	name: string
	playtimeMinutesForever: number
	playtimeMinutesLast2Weeks: number
	iconUrl: string | null
}

type PopularGame = {
	appId: string
	name: string
	headerImage: string
}

type Tab = 'overview' | 'library'

const TABS: { id: Tab; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'library', label: 'Library' },
]

const hoverGradient = {
	background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(146,57,228,0.15))',
	scale: 1.02,
	transition: { delay: 0, duration: 0.2 },
}

function Dashboard() {
	const { user, loading } = useAuth()
	const [sessionCode, setSessionCode] = useState('')
	const [joinError, setJoinError] = useState('')
	const [activeTab, setActiveTab] = useState<Tab>('overview')
	const [steamGames, setSteamGames] = useState<SteamGame[]>([])
	const [steamLoading, setSteamLoading] = useState(false)
	const [sortBy, setSortBy] = useState<'playtime' | 'recent'>('playtime')
	const [activeLobby, setActiveLobby] = useState<{ id: string; name: string; players: number; maxPlayers: number } | null>(null)
	const [popularGames, setPopularGames] = useState<PopularGame[]>([])
	const scrollRef = useRef<HTMLDivElement>(null)
	const navigate = useNavigate()
	const sortedGames = [...steamGames]
		.filter((g) => sortBy !== 'recent' || g.playtimeMinutesLast2Weeks > 0)
		.sort((a, b) =>
			sortBy === 'recent'
				? b.playtimeMinutesLast2Weeks - a.playtimeMinutesLast2Weeks
				: b.playtimeMinutesForever - a.playtimeMinutesForever
		)
	const steamHeaderUrl = (appId: string) =>
		`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
	useEffect(() => {
		const token = localStorage.getItem('accessToken')
		if (!token) return
		fetch('/api/lobbies/me', { headers: { Authorization: `Bearer ${token}` } })
			.then((res) => res.ok ? res.json() : null)
			.then((data) => {
				if (data?.id) setActiveLobby({ id: data.id, name: data.name, players: data.players.length, maxPlayers: data.maxPlayers })
			})
			.catch(() => { })
	}, [])
	useEffect(() => {
		fetch('/api/games/popular')
			.then((res) => res.ok ? res.json() : [])
			.then((data) => setPopularGames(Array.isArray(data) ? data : []))
			.catch(() => setPopularGames([]))
	}, [])
	useEffect(() => {
		if (activeTab !== 'library' || !user?.steamId) return

		const token = localStorage.getItem('accessToken')
		if (!token)
			return
		setSteamLoading(true)
		fetch(`/api/games/steam/preview/me`, {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then(async (res) => {
				if (!res.ok)
					throw new Error('Failed to load Steam preview')
				return res.json()
			})
			.then((data) => {
				setSteamGames(Array.isArray(data.games) ? data.games : [])
			})
			.catch(() => setSteamGames([]))
			.finally(() => setSteamLoading(false))
	}, [activeTab, user?.steamId])
	const createNewLobby = async () => {
		const token = localStorage.getItem('accessToken')
		if (activeLobby) {
			navigate(`/session/${activeLobby.id}`)
			return
		}
		try {
			const res = await fetch('/api/lobbies', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ name: `${user?.username}'s lobby`, maxPlayers: 4 }),
			})
			const data = await res.json()
			if (res.ok) {
				navigate(`/session/${data.id}`)
			}
		} catch { /* ignore */ }
	}
	const joinLobby = async (lobbyId: string) => {
		if (!lobbyId.trim()) return
		setJoinError('')
		const token = localStorage.getItem('accessToken')
		try {
			const res = await fetch(`/api/lobbies/${lobbyId}/join`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) {
				const data = await res.json()
				if (data.message?.includes('already inside')) {
					navigate(`/session/${lobbyId}`)
					return
				}
				setJoinError(data.message || 'Unable to join')
				return
			}
			navigate(`/session/${lobbyId}`)
		} catch {
			setJoinError('Network error')
		}
	}
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-text-muted">Loading...</p>
			</div>
		)
	}
	return (
		<div className="text-white px-6 py-10">
			<div className="max-w-5xl mx-auto">
				{/* Header */}
				<motion.div className="mb-6" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
					<h1 className="text-3xl font-bold text-center mb-1">Welcome to your Dashboard {user && (<> <span className="text-gradient-main">{user.username}</span> </>)}</h1>
					<p className="text-text-white text-center">Create a session, join a friend's session or look through your personal library </p>
				</motion.div>
				{/* Tab bar */}
				<motion.div
					className="flex gap-1 rounded-xl p-2 mb-8 w-fit mx-auto"
					style={{
						background: 'rgba(255, 255, 255, 0.03)',
						border: '1px solid rgba(255, 255, 255, 0.06)',
					}}
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
				>
					{TABS.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className="relative px-8 py-2 rounded-lg text-sm font-medium transition-colors"
							style={{ color: activeTab === tab.id ? '#069fd2' : '#64748b' }}
						>
							{activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute inset-0 rounded-lg" style={{ background: 'rgba(146, 57, 228, 0.2)' }} transition={{ duration: 0.2 }} />}
							<span className="relative z-10">{tab.label}</span>
						</button>
					))}
				</motion.div>
				{/* Tab content */}
				<AnimatePresence mode="wait">
					<motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
						{/* Overview */}
						{activeTab === 'overview' && (
							<div>
								{/* Active lobby banner */}
								{activeLobby && (
									<motion.div
										initial={{ opacity: 0, y: -10 }}
										animate={{ opacity: 1, y: 0 }}
										className="mb-6 rounded-2xl p-5 bg-violet-500/10 border border-violet-500/30 flex items-center justify-between"
									>
										<div>
											<p className="font-bold text-text-white">{activeLobby.name}</p>
											<p className="text-sm text-text-muted">{activeLobby.players}/{activeLobby.maxPlayers} players · Session in progress</p>
										</div>
										<button
											onClick={() => navigate(`/session/${activeLobby.id}`)}
											className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer"
										>
											Return to session
										</button>
									</motion.div>
								)}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 mt-12">
									{/* Create Session */}
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										whileHover={{
											...hoverGradient,
											boxShadow: '0 8px 30px rgba(146,57,228,0.3)',
										}}
										className="rounded-2xl p-6 group bg-dark-800 border border-dark-600 flex flex-col justify-between"
									>
										<div>
											<h3 className="text-xl font-bold">Create a Session</h3>
											<p className="text-sm text-text-white">Host a lobby and invite your friends with a given code</p>
										</div>
										<div className="flex gap-3 mt-4">
											<Button variant="blue" size="small" onClick={createNewLobby} disabled={!!activeLobby}>
												Start now
											</Button>
										</div>
									</motion.div>
									{/* Join Session */}
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: 0.05 }}
										whileHover={{
											...hoverGradient,
											boxShadow: '0 8px 30px rgba(0,191,255,0.3)',
										}}
										className="rounded-2xl p-6 group bg-dark-800 border border-dark-600 flex flex-col justify-between"
									>
										<div>
											<h3 className="text-xl font-bold">Join a Session</h3>
											<p className="text-sm text-text-white">Write here the code of the lobby your friend has given you</p>
										</div>
										<div className="flex gap-3 mt-15">
											<input
												type="text"
												value={sessionCode}
												onChange={(e) => setSessionCode(e.target.value)}
												onKeyDown={(e) => e.key === 'Enter' && !activeLobby && joinLobby(sessionCode)}
												placeholder="Session code"
												disabled={!!activeLobby}
												className={`flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500 text-white placeholder-text-muted text-sm focus:outline-none focus:border-violet-500 transition-colors ${activeLobby ? 'opacity-50 cursor-not-allowed' : ''}`}
											/>
											<Button variant="purple" size="small" onClick={() => joinLobby(sessionCode)} disabled={!!activeLobby}>
												Join
											</Button>
										</div>
										{joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
									</motion.div>
								</div>
								{/* Popular games */}
								<motion.div
									className="rounded-2xl p-6 bg-dark-800 border border-dark-600 mt-12"
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.15 }}
								>
									<div className="flex items-center justify-between mb-5">
										<div>
											<h3 className="text-lg font-bold">Most played games</h3>
											<p className="text-text-muted text-sm">Top games by current players on Steam</p>
										</div>
										{popularGames.length > 0 && (
											<div className="flex gap-1.5">
												<button
													onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
													className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-500 flex items-center justify-center text-text-muted hover:text-text-white hover:border-dark-400 transition-colors cursor-pointer"
												>
													←
												</button>
												<button
													onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
													className="w-8 h-8 rounded-lg bg-dark-700 border border-dark-500 flex items-center justify-center text-text-muted hover:text-text-white hover:border-dark-400 transition-colors cursor-pointer"
												>
													→
												</button>
											</div>
										)}
									</div>
									{popularGames.length === 0 ? (
										<div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-dark-500">
											<p className="text-text-muted text-sm">Loading...</p>
										</div>
									) : (
										<div
											ref={scrollRef}
											className="flex gap-4 overflow-x-auto pb-2"
											style={{
												scrollbarWidth: 'none',
												maskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
												WebkitMaskImage: 'linear-gradient(to right, transparent, black 3%, black 97%, transparent)',
											}}
										>
											{popularGames.map((game) => (
												<a
													key={game.appId}
													href={`https://store.steampowered.com/app/${game.appId}`}
													target="_blank"
													rel="noopener noreferrer"
													className="shrink-0 w-72 group/card relative rounded-xl overflow-hidden border border-dark-600 hover:border-violet-500/50 transition-colors"
												>
													<img
														src={game.headerImage}
														alt={game.name}
														className="w-full aspect-video object-cover group-hover/card:scale-105 transition-transform duration-300"
														loading="lazy"
													/>
													<div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
													<p className="absolute bottom-0 left-0 right-0 px-3 py-2.5 text-sm font-semibold truncate" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
														{game.name}
													</p>
												</a>
											))}
										</div>
									)}
								</motion.div>
							</div>
						)}
						{activeTab === 'library' && (
							<div className="space-y-6">
								{/* My Library */}
								<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 bg-dark-800 border border-dark-600 flex items-center justify-between">
									<div>
										<h3 className="text-lg font-bold">My Library</h3>
										<p className="text-text-muted text-sm">Browse and add games you've played to your personal library</p>
									</div>
									<Link
										to="/library"
										className="px-5 py-2.5 rounded-lg font-semibold text-sm bg-blue-500 hover:bg-blue-600 text-white transition-colors shrink-0"
									>
										Open library
									</Link>
								</motion.div>
								{/* Steam Library Preview */}
								<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-6 bg-dark-800 border border-dark-600">
									<div className="flex items-center justify-between mb-4">
										<div>
											<h3 className="text-lg font-bold">My Steam Games</h3>
											<p className="text-text-muted text-sm">
												{steamGames.length > 0
													? `Showing top ${Math.min(16, steamGames.length)} of ${steamGames.length} games`
													: 'Your Steam library'}
											</p>
										</div>
										{steamGames.length > 0 && (
											<div className="flex items-center gap-3">
												<div className="flex gap-1 rounded-lg p-1 bg-dark-700">
													{([['playtime', 'Most played'], ['recent', 'Recent']] as const).map(([value, label]) => (
														<button
															key={value}
															onClick={() => setSortBy(value)}
															className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${sortBy === value
																? 'bg-violet-500/30 text-violet-300'
																: 'text-text-muted hover:text-text-white'
																}`}
														>
															{label}
														</button>
													))}
												</div>
											</div>
										)}
									</div>
									{steamLoading ? (
										<div className="flex items-center justify-center h-40">
											<p className="text-text-muted text-sm">Loading your games...</p>
										</div>
									) : steamGames.length === 0 ? (
										<div className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed border-dark-500">
											<p className="text-text-muted text-sm mb-3">
												{user?.steamId ? 'No games found' : 'Connect your account to your Steam account to see your games'}
											</p>
										</div>
									) : (
										<>
											<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
												{sortedGames.slice(0, 16).map((game, index) => (
													<motion.a
														key={game.appId}
														href={`https://store.steampowered.com/app/${game.appId}`}
														target="_blank"
														rel="noopener noreferrer"
														className="group relative rounded-xl overflow-hidden border border-dark-600 hover:border-violet-500/50 transition-colors"
														initial={{ opacity: 0, y: 16 }}
														animate={{ opacity: 1, y: 0 }}
														transition={{ delay: index * 0.02 }}
													>
														<img
															src={steamHeaderUrl(game.appId)}
															alt={game.name}
															className="w-full aspect-460/215 object-cover group-hover:scale-105 transition-transform duration-300"
															loading="lazy"
														/>
														<div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent" />
														<div className="absolute bottom-0 left-0 right-0 p-3" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
															<p className="text-sm font-semibold truncate">{game.name}</p>
															<p className="text-xs text-gray-300">
																{Math.round(game.playtimeMinutesForever / 60)}h
																{game.playtimeMinutesLast2Weeks > 0 && (
																	<span className="text-green-400"> · {Math.round(game.playtimeMinutesLast2Weeks / 60)}h recently</span>
																)}
															</p>
														</div>
													</motion.a>
												))}
											</div>
										</>
									)}
								</motion.div>
							</div>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	)
}

export default Dashboard
