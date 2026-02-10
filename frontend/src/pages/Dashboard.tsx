import { useNavigate } from 'react-router'

function Dashboard()
{
	const navigate = useNavigate();
	const handleLogout = () => {
		localStorage.removeItem("accessToken");
		navigate("/");
	}
	return(
	<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
		<div className="text-center">
			<h1 className="text-4xl font-bold mb-4">GameFinder</h1>
			<p className="text-gray-400 mb-8">Vous êtes login</p>
			<button
					onClick={handleLogout}
					className="bg-red-500 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors"
				>
					Se déconnecter
				</button>
		</div>
	</div>
	)
}

export default Dashboard
