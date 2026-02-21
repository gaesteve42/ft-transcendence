import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'

type LoginResponse = {
	message?: string
	accessToken?: string
}

function Login() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const navigate = useNavigate()
	const { login } = useAuth()
	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault()
		setError('')
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})
			const data = (await response.json()) as LoginResponse
			if (!response.ok) {
				setError(data.message || 'Erreur de connexion')
				return
			}
			if (data.accessToken) {
				login(data.accessToken)
				navigate('/dashboard')
			}
		} catch {
			setError('Erreur réseau, réessayez plus tard')
		}
	}
	return (
		<div className="min-h-screen text-white flex items-center justify-center">
			<form onSubmit={handleSubmit} className="flex flex-col gap-6 w-96">
				<h1 className="text-3xl font-bold text-center mb-4">Connexion</h1>
				<Input
					type="email"
					label="Email"
					placeholder="exemple@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<Input
					type="password"
					label="password"
					placeholder="••••••••"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{error && <p className="text-red-500">{error}</p>}
				<button
					type="submit"
					className="bg-blue-500 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold transition-colors"
				>
					Se connecter
				</button>
			</form>
		</div>
	)
}

export default Login
