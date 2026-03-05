import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '../components/context/AuthContext'

function SteamCallback() {
	const [searchParams] = useSearchParams()
	const { login } = useAuth()

	useEffect(() => {
		const token = searchParams.get('token')
		if (token) {
			login(token)
		} else {
			window.location.href = '/login'
		}
	}, [searchParams, login])

	return (
		<div className="min-h-screen text-white flex items-center justify-center">
			<p className="text-text-muted">Connecting with Steam...</p>
		</div>
	)
}

export default SteamCallback
