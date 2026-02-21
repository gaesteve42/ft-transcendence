import { useState } from 'react'

type Game = {
	id: number
	title: string
	genre: string
}

function Library() {
	const [myGames, setMyGames] = useState<Game[]>([])
	const [search, setSearch] = useState('')
	const [likedIds, setLikedIds] = useState<Set<number>>(new Set())
	const availableGames: Game[] = []
	const addGame = (game: Game) => setMyGames((prev) => [...prev, game])
	const removeGame = (id: number) => setMyGames((prev) => prev.filter((g) => g.id !== id))
	const toggleLike = (id: number) =>
		setLikedIds((prev) => {
			const next = new Set(prev)
			next.has(id) ? next.delete(id) : next.add(id)
			return next
		})
	return (
		<div className="flex h-[calc(100vh-64px)]">
			{/*Panneau mes jeux*/}
			<div className="w-[18%] border-r border-dark-600 flex flex-col bg-dark-950">
				<div className="px-4 py-3 border-b border-dark-600">
					<p className="text-text-secondary text-xs font-semibold uppercase tracking-wider">Mes jeux</p>
				</div>
				<div className="flex-1 overflow-y-auto"></div>
			</div>
			{/* Panneau catalogue*/}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="px-6 py-3 border-b border-dark-600">
					<input
						type="text"
						placeholder="Rechercher un jeu..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full max-w-md bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-text-purple placeholder:text-text-muted outline-none focus:border-violet-500/50 transition-colors"
					/>
				</div>
				<div className="flex-1 overflow-y-auto p-6">
					{availableGames.length === 0 ? (
						<p className="text-text-muted text-sm text-center mt-16">{`Aucun résultat pour "${search}"`}</p>
					) : (
						<div className="grid grid-cols-4 xl:grid-cols-5 gap-4">
							{availableGames.map((game) => (
								<button
									key={game.id}
									onClick={() => addGame(game)}
									className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden text-left hover:border-violet-500/50 hover:scale-[1.02] transition-all duration-200 group"
								>
									<div className="h-28 w-full bg-dark-700">
										<p className="text-text-purple text-sm font-medium truncate group-hover:text-violet-400 transition-colors">
											{game.title}
										</p>
										<p className="text-text-muted text-xs mt-0.5">{game.genre}</p>
									</div>
								</button>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

export default Library
