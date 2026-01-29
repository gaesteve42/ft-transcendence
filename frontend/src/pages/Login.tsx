import { Link } from 'react-router'

function Login()
{
	return(
	<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">Login</h1>
			<p className="text-gray-400 mb-8">Connectez-vous</p>
			<Link to="/" className="text-purple-400 hover:text-purple-300 underline">
			← Retour à l'accueil
			</Link>
		</div>
	</div>
	)
}

export default Login
