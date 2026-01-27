import { Link } from 'react-router'

function Home()
{
	return(
	<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">FindYourGame</h1>
			<p className="text-gray-400 mb-8">Trouve le jeu parfait pour jouer avec tes potes</p>
			<Link
				to="/session"
				className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors"
			>
			Créer une session
			</Link>
		</div>
	</div>
	)
}

export default Home
