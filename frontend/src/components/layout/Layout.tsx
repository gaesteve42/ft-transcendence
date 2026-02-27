import { Outlet } from 'react-router'
import Header from './Header'

function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-dark-900">
			<Header />
			<main className="flex-1 relative z-10">
				<Outlet />
			</main>
		</div>
	)
}

export default Layout
