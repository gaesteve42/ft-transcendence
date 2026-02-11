import { useNavigate } from 'react-router'

function Dashboard()
{
	const navigate = useNavigate();
	return(
	<div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">GameFinder</h1>
			<p className="text-gray-400 mb-8">Vous êtes login</p>
			<button
				onClick={() => navigate("/session")}
				className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
			>
				Créer une session
			</button>
		</div>
	</div>
	)
}

export default Dashboard
