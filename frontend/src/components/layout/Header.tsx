import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import Button from '../ui/Button'
import Logo from '../ui/Logo'

// la barre de nav dans la partie supérieure du site
function Header() {
	const { isLoggedIn, user, logout } = useAuth()
	const [menuOpen, setMenuOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const [search, setSearch] = useState('')

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setMenuOpen(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	return (
		<header className="bg-dark-800 border-b border-dark-600 relative z-20">
			<nav className="px-10 py-5 flex items-center">
				<div className="flex-1 flex items-center gap-3">
					<Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3 shrink-0">
						<Logo width={60} height={60} className="translate-y-1" />
						<span className="text-2xl font-bold text-gradient-main">GameFinder</span>
					</Link>
				</div>
				{isLoggedIn && (
					<div className="flex-1 flex justify-center">
						<div className="relative w-full max-w-ml group">
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
								className="w-full bg-dark-900/50 border border-dark-600 rounded-full pl-10 pr-4 py-3 text-sm text-text-purple placeholder:text-text-muted outline-none focus:border-violet-500/50 focus:bg-dark-900/80 transition-all"
							/>
						</div>
					</div>
				)}
				<div className="flex-1 flex items-center justify-end gap-4">
					{isLoggedIn ? (
						<div className="relative" ref={menuRef}>
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
