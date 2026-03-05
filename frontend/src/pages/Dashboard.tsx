import { useState, useEffect } from 'react'
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

type Tab = 'overview' | 'historique' | 'bibliotheque'

const TABS: { id: Tab; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'historique', label: 'History' },
	{ id: 'bibliotheque', label: 'Library' },
]

const hoverGradient = {
	background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(146,57,228,0.15))',
	scale: 1.02,
	transition: { delay: 0, duration: 0.2 },
}

const mockSessionHistory = [
	{
		id: '1',
		name: 'Session de HOTE',
		date: '28 fév. 2026',
		players: ['Guluguts', 'middle', 'Alouwest', 'Muestrano'],
		gamesFound: 3,
	},
	{
		id: '2',
		name: 'Session de HOTE',
		date: '21 fév. 2026',
		players: ['Middle', 'Guluguts'],
		gamesFound: 5,
	},
	{
		id: '3',
		name: 'Session de HOTE',
		date: '14 fév. 2026',
		players: ['Alouwest', 'Muestrano', 'Middle'],
		gamesFound: 2,
	},
]

function Dashboard() {
	const { user, loading } = useAuth()
	const [sessionCode, setSessionCode] = useState('')
	const [joinError, setJoinError] = useState('')
	const [activeTab, setActiveTab] = useState<Tab>('overview')
	const [steamGames, setSteamGames] = useState<SteamGame[]>([])
	const [steamLoading, setSteamLoading] = useState(false)
	const [sortBy, setSortBy] = useState<'playtime' | 'recent'>('playtime')
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
		if (activeTab !== 'bibliotheque' || !user?.steamId) return
		setSteamLoading(true)
		fetch(`/api/games/steam/${user.steamId}/preview`)
			.then((res) => res.json())
			.then((data) => setSteamGames(data.games ?? []))
			.catch(() => setSteamGames([]))
			.finally(() => setSteamLoading(false))
	}, [activeTab, user?.steamId])

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
				setJoinError(data.message || 'Unable to join')
				return
			}
			navigate('/session')
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
					<h1 className="text-3xl font-bold text-center mb-1">Welcome to your Dashboard {user && ( <> , <span className="text-gradient-main">{user.username}</span> </> )}</h1>
					<p className="text-text-white text-center">Create or join a lobby, explore your previous sessions or look through your favorite games </p>
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
							className="relative px-30 py-2 rounded-lg text-sm font-medium transition-colors"
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
						{/* ──── Tab 1: Vue d'ensemble ──── */}
						{activeTab === 'overview' && (
							<div>
								{/* Actions : Créer + Rejoindre */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
											<Button to="/session" variant="blue" size="small">
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
										<div className="flex gap-3 mt-4">
											<input
												type="text"
												value={sessionCode}
												onChange={(e) => setSessionCode(e.target.value)}
												onKeyDown={(e) => e.key === 'Enter' && joinLobby(sessionCode)}
												placeholder="Session code"
												className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500 text-white placeholder-text-muted text-sm focus:outline-none focus:border-violet-500 transition-colors"
											/>
											<Button variant="purple" size="small" onClick={() => joinLobby(sessionCode)}>
												Join
											</Button>
										</div>
										{joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
									</motion.div>
								</div>

								{/* Stats */}
								<motion.div className="grid grid-cols-3 gap-4 mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
									{/* ICI faudra implementer une .map sur tableau de stats. on chopera les stats d un hook useUserStats ou un truc du genre */}
									<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
										<p className="text-2xl font-bold text-text-purple">0</p>
										<p className="text-text-muted text-xs mt-1">Friends online</p>
									</div>
									<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
										<p className="text-2xl font-bold text-text-purple">0</p>
										<p className="text-text-muted text-xs mt-1">Liked games</p>
									</div>
									<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
										<p className="text-2xl font-bold text-text-purple">0</p>
										<p className="text-text-muted text-xs mt-1">Lobbies participation</p>
									</div>
								</motion.div>

								{/* Jeux populaires */}
								<motion.div className="rounded-2xl p-6 bg-dark-800 border border-dark-600" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
									<h3 className="text-lg font-bold mb-1">Popular games</h3>
									<p className="text-text-muted text-sm mb-6">Discover the most played games of all time on PC</p>
									<div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-dark-500">
										<p className="text-text-muted text-sm">Coming soon</p>
									</div>
								</motion.div>
							</div>
						)}

						{/* ──── Tab 2: Sessions (Historique) ──── */}
						{activeTab === 'historique' && (
							<div>
								<motion.div className="mb-6" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
									<h2 className="text-2xl font-bold mb-2">Lobby history</h2>
									<p className="text-text-white">Browse your past sessions and their results</p>
								</motion.div>

								<div className="space-y-3">
									{mockSessionHistory.map((session, index) => (
										<motion.div
											key={session.id}
											className="rounded-xl p-4 bg-dark-800 border border-dark-600"
											initial={{ opacity: 0, y: 16 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: index * 0.05 }}
											whileHover={{
												background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(146,57,228,0.08))',
												borderColor: 'rgba(146,57,228,0.4)',
												transition: { delay: 0, duration: 0.2 },
											}}
										>
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<h4 className="font-bold">{session.name}</h4>
													<p className="text-sm text-text-muted mt-0.5">
														{session.date} · {session.gamesFound} games found
													</p>
												</div>
												<div className="flex items-center gap-2 mr-4">
													{session.players.map((initial) => (
														<div key={initial} className="w-8 h-8 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-xs font-medium text-text-white">
															{initial}
														</div>
													))}
												</div>
											</div>
										</motion.div>
									))}
								</div>
							</div>
						)}

						{/* ──── Tab 3: Bibliothèque ──── */}
						{activeTab === 'bibliotheque' && (
							<div className="space-y-6">
								{/* Profil Steam */}
								<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 bg-dark-800 border border-dark-600">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											{user?.avatarUrl ? (
														<img src={user.avatarUrl} alt="Steam avatar" className="w-14 h-14 rounded-full border-2 border-violet-500" />
													) : (
														<div className="w-14 h-14 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-2xl">{user?.username?.charAt(0).toUpperCase() ?? '?'}</div>
													)}
											<div>
												<h3 className="text-lg font-bold">Steam Profile</h3>
												<p className={`text-sm ${user?.steamId ? 'text-green-400' : 'text-text-muted'}`}>
													{user?.steamId
														? `Connected · ${steamGames.length} games`
														: 'Not connected'}
												</p>
											</div>
										</div>
										{!user?.steamId && (
											<a href="/api/auth/steam" className="px-5 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors">
												Connect Steam
											</a>
										)}
									</div>
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
															className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
																sortBy === value
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
												{user?.steamId ? 'No games found' : 'Connect Steam to see your games'}
											</p>
											{!user?.steamId && (
												<a href="/api/auth/steam" className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
													Connect Steam →
												</a>
											)}
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
											{steamGames.length > 16 && (
												<div className="mt-4 text-center">
													<Link to="/library" className="text-sm font-medium text-blue-400 hover:text-violet-300 transition-colors">
														See all {steamGames.length} games in Library →
													</Link>
												</div>
											)}
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
