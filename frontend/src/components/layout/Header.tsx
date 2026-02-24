import { Link } from 'react-router'
import { useAuth } from '../context/AuthContext'
import Button from '../ui/Button'
import Logo from '../ui/Logo'

// la barre de navigation dans la partie supérieure du site
function Header() {
	const { isLoggedIn, logout } = useAuth()
	return (
		<header className="bg-dark-800 border-b border-dark-600 relative z-20">
			<nav className="px-10 py-5 flex items-center justify-between">
				<Link to={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-3">
					<Logo width={60} height={60} className="translate-y-1" />
					<span className="text-2xl font-bold text-gradient-main">GameFinder</span>
				</Link>
				<div className="flex items-center gap-4">
					{isLoggedIn ? (
						<>
							<Link to="/profile" className="text-text-white hover:text-text-purple transition-colors">
								Profile
							</Link>
							<Button variant="white" onClick={logout}>
								Logout
							</Button>
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
