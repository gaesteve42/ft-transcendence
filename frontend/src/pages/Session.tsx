import { Link } from 'react-router'

function Session()
{
	return(
	<div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-3xl font-bold mb-4">Session de jeu</h1>
			<p className="text-gray-400 mb-8">Page en construction...</p>
			<Link to="/" className="text-purple-400 hover:text-purple-300 underline">
			← Retour à l'accueil
			</Link>
		</div>
	</div>
	)
}

export default Session
