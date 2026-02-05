import { Outlet } from 'react-router'
import Header from './Header'

function Layout() {
	return (
		<div className="min-h-screen flex flex-col">
			<Header />
			<main className="flex-1">
				<Outlet />
			</main>
		</div>
	)
}

export default Layout
