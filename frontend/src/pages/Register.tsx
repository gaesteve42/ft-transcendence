import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { useAuth } from '../components/context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import steamLoginImg from '../assets/steam_login.png'

type RegisterResponse = {
	message?: string | string[]
	accessToken?: string
}

type PasswordStrength = {
	score: 0 | 1 | 2 | 3 | 4
	label: string
	color: string
	missingRequirements: string[]
}

function getPasswordStrength(password: string): PasswordStrength {
	if (password.length === 0) return { score: 0, label: '', color: '', missingRequirements: [] }

	const requirements = [
		{ test: password.length >= 8, missing: 'At least 8 characters' },
		{ test: /[A-Z]/.test(password), missing: 'An uppercase letter' },
		{ test: /[0-9]/.test(password), missing: 'A number' },
		{ test: /[^A-Za-z0-9]/.test(password), missing: 'A special character (!@#$%...)' },
	]

	const passed = requirements.filter((r) => r.test).length
	const missingRequirements = requirements.filter((r) => !r.test).map((r) => r.missing)

	const configs: Record<number, { label: string; color: string }> = {
		0: { label: 'Very weak', color: 'bg-red-500' },
		1: { label: 'Weak', color: 'bg-red-500' },
		2: { label: 'Medium', color: 'bg-yellow-500' },
		3: { label: 'Strong', color: 'bg-green-500' },
		4: { label: 'Very strong', color: 'bg-green-500' },
	}

	return { score: passed as PasswordStrength['score'], label: configs[passed].label, color: configs[passed].color, missingRequirements }
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
	const strength = useMemo(() => getPasswordStrength(password), [password])

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
				const msg = data.message
				setError(Array.isArray(msg) ? msg.join('\n') : msg || 'Registration failed')
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
				{/* Form fields */}
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
				<div>
					<Input
						type="password"
						label="Password"
						placeholder="••••••••"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
					/>
					{password.length > 0 && (
						<div className="mt-2">
							<div className="flex gap-1">
								{[1, 2, 3, 4].map((level) => (
									<div
										key={level}
										className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
											level <= strength.score ? strength.color : 'bg-dark-600'
										}`}
									/>
								))}
							</div>
							<p className={`text-xs mt-1.5 ${
								strength.score <= 1 ? 'text-red-400' : strength.score <= 2 ? 'text-yellow-400' : 'text-green-400'
							}`}>
								{strength.label}
							</p>
							{strength.missingRequirements.length > 0 && (
								<p className="text-xs text-text-muted mt-1">
									Missing: {strength.missingRequirements.join(', ').toLowerCase()}
								</p>
							)}
						</div>
					)}
				</div>
				<Input
					type="password"
					label="Confirm Password"
					placeholder="••••••••"
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.target.value)}
				/>
				{error && <p className="text-red-500 text-sm whitespace-pre-line">{error}</p>}
				{/* Submit */}
				<Button type="submit" variant="blue" disabled={isLoading}>
					{isLoading ? 'Signing up...' : 'Sign up'}
				</Button>
				{/* Steam login */}
				<a
					href="/api/auth/steam"
					className="self-center opacity-80 hover:opacity-100 transition-opacity"
				>
					<img src={steamLoginImg} alt="Sign in through Steam" className="h-9" />
				</a>
				{/* Redirect to login */}
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
