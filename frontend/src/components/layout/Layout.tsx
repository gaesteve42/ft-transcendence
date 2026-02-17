import { Outlet } from 'react-router'
import Header from './Header'

function Layout() {
	return (
		<div className="min-h-screen flex flex-col bg-dark-900">
			<div className="fixed inset-0 pointer-events-none overflow-hidden">
				<div className="absolute inset-0"
					style={{
						background: 'radial-gradient(ellipse at 50% 40%, rgba(80, 60, 120, 0.20) 0%, rgba(40, 80, 100, 0.15) 35%, transparent 65%)',
					}}
				/>
				<div className="absolute top-[10%] left-[15%] w-[500px] h-[500px]"
					style={{
						background: 'radial-gradient(circle, #9239e4, transparent 75%)',
						opacity: 0.18,
						filter: 'blur(60px)',
					}}
				/>
				<div className="absolute top-[25%] left-[35%] w-[400px] h-[400px] ..."
					style={{
						background: 'radial-gradient(circle, #00bfff, transparent 50%)',
						opacity: 0.18,
						filter: 'blur(70px)',
					}}
				/>
				<div className="absolute top-[5%] left-[45%] w-[450px] h-[450px] ..."
					style={{
						background: 'radial-gradient(circle, #9239e4, transparent 80%)',
						opacity: 0.18,
						filter: 'blur(80px)',
					}}
				/>
		</div>
		{/* Contenu par dessus nos bloom */}
		<Header />
		<main className="flex-1 relative z-10">
			<Outlet />
		</main>
	</div>
	)
}

export default Layout
