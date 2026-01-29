import { Link } from 'react-router'

function Home()
{
	return(
	<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">GameFinder</h1>
			<p className="text-gray-400 mb-8">Trouve le jeu parfait pour jouer avec tes potes</p>
			<div>
				<Link to="/register" className="bg-purple-700 hover:bg-purple-800 px-6 py-3 rounded-lg font-semibold transition-colors">
				Se connecter
				</Link>
				<Link to="/login" className="bg-purple-700 hover:bg-purple-800 px-6 py-3 rounded-lg font-semibold transition-colors">
				Déjà un compte ?
				</Link>
			</div>
		</div>
	</div>
	)
}

export default Home
