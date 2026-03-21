import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import Button from '../ui/Button'
import Logo from '../ui/Logo'

type SearchResult = {
	id: string
	username: string
	avatarUrl: string | null
}

type Friend = {
	id: string
	username: string
	avatarUrl: string | null
}


function Header() {
	const { isLoggedIn, user, logout } = useAuth()
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const [friendsOpen, setFriendsOpen] = useState(false)
	const friendsRef = useRef<HTMLDivElement>(null)
	const [friends, setFriends] = useState<Friend[]>([])
	const [search, setSearch] = useState('')
	const [results, setResults] = useState<SearchResult[]>([])
	const [showResults, setShowResults] = useState(false)
	const searchRef = useRef<HTMLDivElement>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
	const navigate = useNavigate()

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false)
			}
			if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
				setShowResults(false)
			}
			if (friendsRef.current && !friendsRef.current.contains(e.target as Node)) {
				setFriendsOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current)
		if (search.trim().length === 0) {
			setResults([])
			setShowResults(false)
			return
		}
		debounceRef.current = setTimeout(async () => {
			const token = localStorage.getItem('accessToken')
			try {
				const res = await fetch(`/api/users/search?q=${encodeURIComponent(search.trim())}`, {
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					const data = await res.json()
					setResults(data)
					setShowResults(true)
				}
			} catch { }
		}, 300)
		return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
	}, [search])
	const fetchFriends = useCallback(async () => {
		const token = localStorage.getItem('accessToken')
		if (!token) return
		try {
			const res = await fetch('/api/friendships', { headers: { Authorization: `Bearer ${token}` } })
			if (res.ok) setFriends(await res.json())
		} catch { }
	}, [])
	const handleToggleFriends = () => {
		if (!friendsOpen) fetchFriends()
		setFriendsOpen(!friendsOpen)
	}
	const handleSelectUser = (userId: string) => {
		setSearch('')
		setResults([])
		setShowResults(false)
		navigate(`/profile/${userId}`)
	}
	const renderSearchResults = () => {
		if (!showResults) return null
		if (search.trim().length > 0 && results.length === 0) {
			return (
				<div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-lg overflow-hidden">
					<p className="px-4 py-3 text-sm text-text-muted">No users found</p>
				</div>
			)
		}
		if (results.length === 0) return null
		return (
			<div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-600 rounded-xl shadow-lg overflow-hidden">
				{results.map((r) => (
					<button
						key={r.id}
						onClick={() => handleSelectUser(r.id)}
						className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-700 transition-colors cursor-pointer"
					>
						{r.avatarUrl ? (
							<img src={r.avatarUrl} alt={r.username} className="w-8 h-8 rounded-full border border-dark-500 object-cover" />
						) : (
							<div className="w-8 h-8 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-xs font-medium text-text-muted">
								{r.username.charAt(0).toUpperCase()}
							</div>
						)}
						<span className="text-sm text-text-white">{r.username}</span>
					</button>
				))}
			</div>
		)
	}
	return (
		<header className="bg-dark-800 border-b border-dark-600 relative z-20">
			<nav className="px-10 py-5 flex items-center">
				{/* Logo */}
				<div className="flex-1 flex items-center gap-3">
					<Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 shrink-0">
						<Logo width={60} height={60} className="translate-y-1" />
						<span className="text-2xl font-bold text-gradient-main">GameFinder</span>
					</Link>
				</div>
				{/* Search bar */}
				{isLoggedIn && (
					<div className="flex-1 flex justify-center" ref={searchRef}>
						<div className="relative w-full max-w-lg group">
							<svg
								className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-violet-400 transition-colors"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
							</svg>
							<input
								type="text"
								placeholder="Search for users..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								onFocus={() => { if (results.length > 0) setShowResults(true) }}
								className="w-full bg-dark-900/50 border border-dark-600 rounded-full pl-10 pr-4 py-3 text-sm text-text-purple placeholder:text-text-muted outline-none focus:border-violet-500/50 focus:bg-dark-900/80 transition-all"
							/>
							{renderSearchResults()}
						</div>
					</div>
				)}
				{/* User menu / Auth buttons */}
				<div className="flex-1 flex items-center justify-end gap-4">
					{isLoggedIn ? (
						<>
						{/* Friends panel */}
						<div className="relative" ref={friendsRef}>
							<button
								onClick={handleToggleFriends}
								className="relative cursor-pointer p-2 rounded-full hover:bg-dark-700 transition-colors"
							>
								<svg className="w-6 h-6 text-text-muted hover:text-text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
								</svg>
							</button>
							{friendsOpen && (
								<div className="absolute right-0 mt-2 w-72 rounded-xl bg-dark-800 border border-dark-600 shadow-lg overflow-hidden">
									{/* Friends list */}
									<p className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">Friends</p>
									{friends.length === 0 ? (
										<p className="px-4 py-3 text-sm text-text-muted">No friends yet</p>
									) : (
										friends.map((f) => (
											<Link
												key={f.id}
												to={`/profile/${f.id}`}
												onClick={() => setFriendsOpen(false)}
												className="flex items-center gap-3 px-4 py-2 hover:bg-dark-700 transition-colors"
											>
												{f.avatarUrl ? (
													<img src={f.avatarUrl} alt={f.username} className="w-8 h-8 rounded-full border border-dark-500 object-cover" />
												) : (
													<div className="w-8 h-8 rounded-full bg-dark-700 border border-dark-500 flex items-center justify-center text-xs font-medium text-text-muted">
														{f.username.charAt(0).toUpperCase()}
													</div>
												)}
												<span className="text-sm text-text-white truncate">{f.username}</span>
											</Link>
										))
									)}
								</div>
							)}
						</div>
						<div className="relative" ref={menuRef}>
							{/* Avatar */}
							<button
								onClick={() => setMenuOpen(!menuOpen)}
								className="cursor-pointer rounded-full transition-shadow hover:shadow-[0_0_12px_rgba(146,57,228,0.6)]"
							>
								{user?.avatarUrl ? (
									<img src={user.avatarUrl} alt="avatar" className="w-14 h-14 rounded-full border-2 border-dark-500" />
								) : (
									<div className="w-11 h-11 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-sm font-medium text-text-white">
										{user?.username?.charAt(0).toUpperCase() ?? '?'}
									</div>
								)}
							</button>
							{/* Dropdown */}
							{menuOpen && (
								<div className="absolute right-0 mt-2 w-44 rounded-xl bg-dark-800 border border-dark-600 shadow-lg overflow-hidden">
									<Link
										to="/profile"
										onClick={() => setMenuOpen(false)}
										className="block px-4 py-3 text-sm text-text-white hover:bg-dark-700 transition-colors"
									>
										Profile
									</Link>
									<Link
										to="/library"
										onClick={() => setMenuOpen(false)}
										className="block px-4 py-3 text-sm text-text-white hover:bg-dark-700 transition-colors"
									>
										Library
									</Link>
									<button
										onClick={() => { setMenuOpen(false); logout() }}
										className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-dark-700 transition-colors border-t border-dark-600"
									>
										Logout
									</button>
								</div>
							)}
						</div>
						</>
					) : (
						<>
							<Button variant="purple" to="/register">
								Create an account
							</Button>
							<Button variant="blue" to="/login">
								Login
							</Button>
						</>
					)}
				</div>
			</nav>
		</header>
	)
}

export default Header
