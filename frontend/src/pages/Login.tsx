import { useState } from 'react'
//import { Link } from 'react-router'

// to do : Rajouter une gestion de mot de passe incorrect
function Login() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault();
		console.log({ email, password });
	};
	return (
		<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
			<form onSubmit={handleSubmit} className="flex flex-col gap-6 w-50">
				<input className="w-full"
					type="email"
					placeholder="E-mail"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<input className="w-full"
					type="password"
					placeholder="Mot de passe"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<button type="submit" className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors">
					Se connecter
				</button>
			</form>
		</div>
	)
}

export default Login
