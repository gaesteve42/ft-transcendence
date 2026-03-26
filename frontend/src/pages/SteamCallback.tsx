import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router'
import { useAuth } from '../components/context/AuthContext'

function SteamCallback() {
	const [searchParams] = useSearchParams()
	const { login } = useAuth()
	const navigate = useNavigate()
	const [error, setError] = useState('')

	useEffect(() => {
		const exchangeCode = async () => {
			const code = searchParams.get('code')
			if (!code) {
				navigate('/login')
				return
			}
			try {
				const response = await fetch('/api/auth/steam/exchange', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ code }),
				})
				const data = await response.json()
				if (!response.ok) {
					setError(data.message || 'Steam login failed')
					return
				}
				login(data.accessToken)
			} catch {
				setError('Network error')
			}
		}
		exchangeCode()
	}, [searchParams, login, navigate])
	if (error) {
		return (
			<div className="min-h-screen text-white flex flex-col items-center justify-center gap-4">
				<p className="text-red-500">{error}</p>
				<a href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
					Back to login
				</a>
			</div>
		)
	}
	return (
		<div className="min-h-screen text-white flex items-center justify-center">
			<p className="text-text-muted">Connecting with Steam...</p>
		</div>
	)
}

export default SteamCallback
