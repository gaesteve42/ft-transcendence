import { Outlet, Link } from 'react-router'
import Header from './Header'

function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-dark-900">
			<Header />
			<main className="flex-1 relative z-10">
				<Outlet />
			</main>
			<footer className="border-t border-dark-600 py-6 px-6">
				<div className="max-w-5xl mx-auto flex items-center justify-between text-text-muted text-xs">
					<span>GameFinder — 42 Project</span>
					<div className="flex gap-4">
						<Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
						<Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
					</div>
				</div>
			</footer>
		</div>
	)
}

export default Layout
