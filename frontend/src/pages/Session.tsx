import { useState } from 'react'
import Button from '../components/ui/Button'

// Types
type SessionPhase = 'setup' | 'results'

type User = {
	id: string
	username: string
	avatar: string
	isReady: boolean
	isHost: boolean
}

type GameResult = {
	id: number
	title: string
	genre: string
	coverColor: string
}

const mockUsers: User[] = [
	{ id: '1', username: 'gauthier', avatar: 'pp', isReady: true, isHost: true },
	{ id: '2', username: 'KevLePn', avatar: 'pp', isReady: true, isHost: false },
	{ id: '3', username: 'LeoLaColocMaudite', avatar: 'pp', isReady: true, isHost: false},
	{ id: '4', username: 'Caillou', avatar: 'pp', isReady: true, isHost: false},
]

const mockGames: GameResult[] = [
	{ id: 1, title: 'Among Us', genre: 'Party', coverColor: '#1a1a2e' },
	{ id: 2, title: 'Stardew Valley', genre: 'Simulation', coverColor: '#2d4a2d' },
	{ id: 3, title: 'Rocket League', genre: 'Sport', coverColor: '#1a2e4a' },
	{ id: 4, title: 'Minecraft', genre: 'Sandbox', coverColor: '#4a3a1a' },
	{ id: 5, title: 'Fall Guys', genre: 'Party', coverColor: '#4a1a3a' },
]

function Session() {
	const [phase, setPhase] = useState<SessionPhase>('setup')
	const [users, setUsers] = useState<User[]>(mockUsers)
	const [sessionCode] = useState('code123')
	const [isCalculating, setIsCalculating] = useState(false)
	const [revealedGames, setRevealedGames] = useState(0)
	const [copied, setCopied] = useState(false)
	const allReady = users.every(p => p.isReady)

	const toggleReady = () => setUsers(prev =>
		prev.map(p => p.isHost ? { ...p, isReady: !p.isReady } : p)
	)

	const copyCode = () => {
		navigator.clipboard.writeText(sessionCode)
		setCopied(true)
		setTimeout(() => setCopied(false), 2000)
	}

	const resetSession = () => {
		setPhase('setup')
		setUsers(mockUsers)
		setRevealedGames(0)
	}

	const launchAlgo = async () => {
		setIsCalculating(true)
		await new Promise(r => setTimeout(r, 2000))
		setIsCalculating(false)
		setPhase('results')
		mockGames.forEach((_, i) => {
			setTimeout(() => setRevealedGames(i + 1), i * 400)
		})
	}
	if (isCalculating) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<div className="text-center">
					<div className="text-5xl mb-4 animate-glow-pulse">⟳</div>
					<p className="text-text-secondary text-lg">Calcul en cours...</p>
					<p className="text-text-muted text-sm mt-2">L'algorithme analyse les goûts de votre groupe</p>
				</div>
			</div>
		)
	}

	if (phase === 'results') {
		return (
			<div className="px-6 py-12">
				<h1 className="text-3xl font-bold text-center mb-2 text-gradient-main">Vos jeux recommandés</h1>
				<p className="text-text-muted text-center mb-12">Basé sur les goûts de votre groupe</p>

				<div className="flex flex-wrap justify-center gap-6 mb-12">
					{mockGames.map((game, i) => (
						<div
							key={game.id}
							className={`w-60 h-100 rounded-2xl p-5 flex flex-col justify-end transition-all duration-500 ${
								i < revealedGames ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
							}`}
							style={{ backgroundColor: game.coverColor }}
						>
							<p className="font-bold text-white text-base">{game.title}</p>
							<p className="text-xs text-white/50 mt-1">{game.genre}</p>
						</div>
					))}
				</div>

				<div className="text-center">
					<Button variant="secondary" onClick={resetSession}>Nouvelle session</Button>
				</div>
			</div>
		)
	}

	const hostParticipant = users.find(p => p.isHost)!
	return (
		<div className="max-w-lg mx-auto px-6 py-12">
			<h1 className="text-3xl font-bold mb-1 text-center"> Session de {users.find(p => p.isHost)?.username} </h1>
			<p className="text-text-muted text-sm mb-8 text-center">Invitez vos amis, Remplissez le formulaire puis lancez l'algorithme</p>
			{/* Code de session */}
			<div className="bg-dark-800 border border-dark-600 rounded-xl px-6 py-4 flex items-center justify-between mb-6">
				<div>
					<p className="text-text-muted text-xs mb-1">Code de session</p>
					<p className="font-mono text-xl font-bold tracking-widest text-text-purple">{sessionCode}</p>
				</div>
				<button
					onClick={copyCode}
					className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border ${
						copied
							? 'bg-green-500/20 text-green-400 border-green-500/30 scale-105'
							: 'bg-dark-700 text-text-secondary border-dark-500 hover:border-violet-500/50 hover:text-text-purple'
					}`}
				>
					{copied ? '✓ Copié' : '📋 Copier le lien'}
				</button>
			</div>
			{/* Liste des participants */}
			<div className="mb-6">
				<div className="flex items-center justify-between mb-3">
					<p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
						Users ({users.length}/4)
					</p>
					<p className="text-text-muted text-xs">
						{users.filter(p => p.isReady).length}/{users.length} prêts
					</p>
				</div>
				<div className="space-y-2">
					{users.map(p => (
						<div key={p.id} className="bg-dark-800 border border-dark-600 rounded-xl px-4 py-3 flex items-center gap-4">
							<div className="w-9 h-9 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-lg shrink-0">
								{p.avatar}
							</div>
							<span className="flex-1 text-text-purple font-medium">{p.username}</span>
							{p.isHost ? (
								<button
									onClick={toggleReady}
									className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
										hostParticipant.isReady
											? 'bg-green-500/20 text-green-400 border-green-500/30'
											: 'bg-dark-700 text-text-muted border-dark-500 hover:border-violet-500/50'
									}`}
								>
									{hostParticipant.isReady ? '✓ Prêt' : 'Pas prêt'}
								</button>
							) : (
								<span className={`px-3 py-1 rounded-full text-xs font-medium border ${
									p.isReady
										? 'bg-green-500/20 text-green-400 border-green-500/30'
										: 'bg-dark-700 text-text-muted border-dark-500'
								}`}>
									{p.isReady ? '✓ Prêt' : 'En attente...'}
								</span>
							)}
						</div>
					))}
				</div>
			</div>
			{/* Lancer */}
			<div>
				{!allReady && (
					<p className="text-text-muted text-xs text-center mb-3">
						En attente que tous les participants soient prêts...
					</p>
				)}
				<button
					onClick={launchAlgo}
					disabled={!allReady}
					className={`w-full py-4 rounded-full font-semibold transition-all text-sm tracking-wide ${
						allReady
							? 'bg-violet-500 hover:bg-violet-600 text-white hover:shadow-[0_0_25px_rgba(146,57,228,0.5)]'
							: 'bg-dark-800 border border-dark-600 text-text-muted cursor-not-allowed'
					}`}
				>
					Lancer l'algorithme ›
				</button>
			</div>
		</div>
	)
}
export default Session
