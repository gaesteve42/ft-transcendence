import { useState } from 'react'
//import { Link } from 'react-router'
import { useNavigate } from 'react-router'

function Register()
{
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();
	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) =>
	{
		e.preventDefault();
		setError('');
		if (password !== confirmPassword)
		{
			setError("Les mots de passe ne correspondent pas");
			return;
		}
		try {
			const response = await fetch("/api/auth/register", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, username, password })
			});
			const data = await response.json();
			if (!response.ok)
			{
				setError(data.message);
				return;
			}
			localStorage.setItem("accessToken", data.accessToken);
			navigate("/");
		}
		catch
		{
			setError("Erreur réseau, réessayez plus tard");
		}
	};
	return(
	<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
			<form onSubmit={handleSubmit} className="flex flex-col gap-6 w-50">
				<input className = "w-full"
					type ="username"
					placeholder="Nom d'utilisateur"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<input className="w-full"
					type ="email"
					placeholder="E-mail"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<input className="w-full"
					type ="password"
					placeholder="Mot de passe"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<input className="w-full"
					type ="password"
					placeholder="Confirmez le mot de passe"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
			{error && <p className="text-red-500">{error}</p>}
			<button type="submit" className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors">
			S'inscrire
			</button>
			</form>
	</div>
	)
}

export default Register
