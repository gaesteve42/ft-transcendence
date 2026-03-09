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
			<nav className="px-10 py-5 flex items-center justify-between">
				<Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3">
					<Logo width={60} height={60} className="translate-y-1" />
					<span className="text-2xl font-bold text-gradient-main">GameFinder</span>
				</Link>
				<div className="flex items-center gap-4">
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
