import { Link } from 'react-router'
// la barre de navigation dans la partie supérieure du site
function Header() {
	return (
		<header className="bg-dark-950/80 backdrop-blur-md border-b border-dark-700/50 sticky top-0 z-50">
			<div className="w-full px-10 py-4 flex items-center justify-between">
				<Link to="/" className="text-2xl font-bold text-gradient-main hover:opacity-80 transition-opacity">
					GameFinder
				</Link>
				<nav className="flex items-center gap-4">
					<Link
						to="/register"
						className="text-text-secondary hover:text-text-primary transition-colors"
					>
						Créer un compte
					</Link>
					<Link
						to="/login"
						className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-lg font-medium transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
					>
						Se connecter
					</Link>
				</nav>
			</div>
		</header>
	)
}

export default Header
