import { useState } from 'react'
import { useAuth } from '../components/context/AuthContext'
import { motion, AnimatePresence } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import Button from '../components/ui/Button'

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
	const navigate = useNavigate()

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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
									{/* Create Session */}
									<motion.div
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										whileHover={{
											...hoverGradient,
											boxShadow: '0 8px 30px rgba(146,57,228,0.3)',
										}}
										className="rounded-2xl p-6 cursor-pointer group bg-dark-800 border border-dark-600"
									>
										<h3 className="text-xl font-bold mb-2 mt-1">Create a Session</h3>
										<p className="text-sm text-text-white mb-4">Host a lobby and invite your friends with a given code</p>
										<Link to="/session" className="text-sm font-medium text-blue-400 inline-flex items-center gap-2">
											Start now
											<span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
										</Link>
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
										className="rounded-2xl p-6 group bg-dark-800 border border-dark-600"
									>
										<h3 className="text-xl font-bold mb-2 mt-1">Join a Session</h3>
										<p className="text-sm text-text-white mb-4">Write here the code of the lobby your friend has given you</p>
										<div className="flex gap-3">
											<input
												type="text"
												value={sessionCode}
												onChange={(e) => setSessionCode(e.target.value)}
												onKeyDown={(e) => e.key === 'Enter' && joinLobby(sessionCode)}
												placeholder="Session code"
												className="flex-1 px-4 py-2 rounded-lg bg-dark-700 border border-dark-500 text-white placeholder-text-muted text-sm focus:outline-none focus:border-violet-500 transition-colors"
											/>
											<Button variant="blue" onClick={() => joinLobby(sessionCode)}>
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
											<div className="w-14 h-14 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-2xl">{user?.username?.charAt(0).toUpperCase() ?? '?'}</div>
											<div>
												<h3 className="text-lg font-bold">Steam Profile</h3>
												<p className="text-text-muted text-sm">Not connected</p>
											</div>
										</div>
										<a href="/api/auth/steam" className="px-5 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors">
											Connect Steam
										</a>
									</div>
								</motion.div>

								{/* Mes jeux likés */}
								<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-6 bg-dark-800 border border-dark-600">
									<h3 className="text-lg font-bold mb-1">My liked games</h3>
									<p className="text-text-muted text-sm mb-6">Games you've added to your library</p>
									<div className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed border-dark-500">
										<p className="text-text-muted text-sm mb-3">No games in your library yet</p>
										<Link to="/library" className="text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
											Browse the library →
										</Link>
									</div>
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
