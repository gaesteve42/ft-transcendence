import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

type CatalogGame = {
	igdbId: string
	name: string
	summary: string | null
	coverUrl: string | null
	firstReleaseDate: string | null
}

function Library() {
	const [search, setSearch] = useState('')
	const [catalogGames, setCatalogGames] = useState<CatalogGame[]>([])
	const [catalogLoading, setCatalogLoading] = useState(false)
	const [hasSearched, setHasSearched] = useState(false)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Debounced IGDB search
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)

		if (search.trim().length < 2) {
			setCatalogGames([])
			setHasSearched(false)
			return
		}

		debounceRef.current = setTimeout(() => {
			const token = localStorage.getItem('accessToken')
			if (!token) return
			setCatalogLoading(true)
			setHasSearched(true)
			fetch(`/api/games/catalog?query=${encodeURIComponent(search.trim())}&limit=20`, {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then((res) => (res.ok ? res.json() : []))
				.then((data) => setCatalogGames(Array.isArray(data) ? data : []))
				.catch(() => setCatalogGames([]))
				.finally(() => setCatalogLoading(false))
		}, 400)

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current)
		}
	}, [search])

	return (
		<div className="flex h-[calc(100vh-64px)]">
			{/* Panneau mes jeux déjà joués */}
			<div className="w-65 border-r border-dark-600 flex flex-col bg-dark-950 shrink-0">
				<div className="px-4 py-3 border-b border-dark-600">
					<p className="text-text-white text-xs font-semibold uppercase tracking-wider">
						Your games
					</p>
				</div>
				<div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
					<div className="flex flex-col items-center justify-center h-32 px-4">
						<p className="text-text-muted text-xs text-center">
							Add games from the catalog
						</p>
					</div>
				</div>
			</div>

			{/* Panneau catalogue IGDB */}
			<div className="flex-1 flex flex-col overflow-hidden">
				<div className="px-6 py-3 border-b border-dark-600">
					<input
						type="text"
						placeholder="Search for a game..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full max-w-md bg-dark-800 border border-dark-600 rounded-lg px-4 py-2 text-text-purple placeholder:text-text-muted outline-none focus:border-violet-500/50 transition-colors"
					/>
				</div>
				<div className="flex-1 overflow-y-auto p-6">
					{catalogLoading ? (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{Array.from({ length: 8 }).map((_, i) => (
							<div
								key={i}
								className="rounded-xl bg-dark-800 border border-dark-600 overflow-hidden animate-pulse"
							>
								<div className="aspect-3/4 bg-dark-700" />
								<div className="p-3">
									<div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
									<div className="h-3 bg-dark-700 rounded w-1/2" />
								</div>
							</div>
						))}
					</div>
				) : !hasSearched ? (
					<div className="flex flex-col items-center justify-center h-full text-center" />
				) : catalogGames.length === 0 ? (
						<motion.p
							className="text-text-muted text-sm text-center mt-16"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
						>
							{`No results for "${search}"`}
						</motion.p>
					) : (
						<AnimatePresence mode="wait">
							<motion.div
								key={search}
								className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2 }}
							>
								{catalogGames.map((game, index) => (
									<motion.div
										key={game.igdbId}
										className="rounded-xl bg-dark-800 border border-dark-600 overflow-hidden hover:border-violet-500/50 transition-colors group"
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: index * 0.03 }}
									>
										{game.coverUrl ? (
											<img
												src={game.coverUrl}
												alt={game.name}
												className="w-full aspect-3/4 object-cover group-hover:scale-105 transition-transform duration-300"
												loading="lazy"
											/>
										) : (
											<div className="w-full aspect-3/4 bg-dark-700 flex items-center justify-center">
												<p className="text-text-muted text-xs">No cover</p>
											</div>
										)}
										<div className="p-3">
											<p className="text-sm font-semibold text-text-purple truncate group-hover:text-violet-400 transition-colors">
												{game.name}
											</p>
											{game.firstReleaseDate && (
												<p className="text-xs text-text-muted mt-1">
													{new Date(game.firstReleaseDate).getFullYear()}
												</p>
											)}
										</div>
									</motion.div>
								))}
							</motion.div>
						</AnimatePresence>
					)}
				</div>
			</div>
		</div>
	)
}

export default Library
