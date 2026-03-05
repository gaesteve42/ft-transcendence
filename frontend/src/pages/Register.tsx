import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useAuth } from '../components/context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

type RegisterResponse = {
	message?: string
	accessToken?: string
}

function Register() {
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const navigate = useNavigate()
	const { login } = useAuth()

	const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
		e.preventDefault()
		setError('')
		if (password !== confirmPassword) {
			setError('Passwords do not match')
			return
		}
		setIsLoading(true)
		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, username, password }),
			})
			const data = (await response.json()) as RegisterResponse
			if (!response.ok) {
				setError(data.message || 'Registration failed')
				return
			}
			if (data.accessToken) {
				login(data.accessToken)
				navigate('/dashboard')
			}
		} catch {
			setError('Network error, please try again')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen text-white flex items-center justify-center">
			<motion.form
				onSubmit={handleSubmit}
				className="flex flex-col gap-6 w-96"
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
			>
				<h1 className="text-3xl font-bold text-center mb-4">Sign up</h1>
				<Input
					type="text"
					label="Username"
					placeholder="Username"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<Input
					type="email"
					label="Email"
					placeholder="example@email.com"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>
				<Input
					type="password"
					label="Password"
					placeholder="••••••••"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<Input
					type="password"
					label="Confirm Password"
					placeholder="••••••••"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
				{error && <p className="text-red-500 text-sm">{error}</p>}
				<Button type="submit" variant="blue" disabled={isLoading}>
					{isLoading ? 'Signing up...' : 'Sign up'}
				</Button>
				<a
					href="/api/auth/steam"
					className="px-4 py-2 rounded-lg text-sm font-semibold transition-all text-center cursor-pointer bg-dark-700 hover:bg-dark-600 text-text-purple border border-dark-500 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(146,57,228,0.2)] self-center"
				>
					Log in with Steam
				</a>
				<p className="text-center text-sm text-text-muted">
					Already have an account?{' '}
					<Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
						Log in
					</Link>
				</p>
			</motion.form>
		</div>
	)
}

export default Register
