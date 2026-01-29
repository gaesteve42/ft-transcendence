import { useState } from 'react'
//import { Link } from 'react-router'

const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');

const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
	e.preventDefault();
	if (password !== confirmPassword)
	{
		console.log("Les mots de passe ne correspondent pas");
		return;
	}
	console.log({ username, email, password });
};

function Register()
{
	return(
	<div className="min-h-screen bg-gray-800 text-white flex items-center justify-center">
		<div>
			<form onSubmit={handleSubmit}>
				<input
				type ="username"
				placeholder="Nom d'utilisateur"
				value={username}
				onChange={(e) => setUsername(e.target.value)}
				/>
				<input
				type ="email"
				placeholder="E-mail"
				value={username}
				onChange={(e) => setEmail(e.target.value)}
				/>
				<input
				type ="password"
				placeholder="Mot de passe"
				value={username}
				onChange={(e) => setPassword(e.target.value)}
				/>
				<input
				type ="password"
				placeholder="Confirmez le mot de passe"
				value={username}
				onChange={(e) => setConfirmPassword(e.target.value)}
				/>
			<button type="submit"> S'inscrire </button>
			</form>
		</div>
	</div>
	)
}

export default Register
