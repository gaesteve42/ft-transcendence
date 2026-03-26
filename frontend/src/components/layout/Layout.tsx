import { Outlet, Link } from 'react-router'
import Header from './Header'

function Layout() {
	return (
		<div className="min-h-screen flex flex-col">
			{/* Background gradient */}
			<div
				className="fixed inset-0 pointer-events-none -z-10"
				style={{
					background: `linear-gradient(to top, #1a1a3e 0%, #1e1e32 100%)`,
				}}
			/>
			<Header />
			<main className="flex-1 relative">
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
