import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'

type ProtectedRouteProps = {
	children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { isLoggedIn } = useAuth()
	if (!isLoggedIn) {
		return <Navigate to="/" replace />
	}
	return <>{children}</>
}
