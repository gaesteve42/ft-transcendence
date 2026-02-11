import { Navigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
// bloque les pages qui ne sont pas censées être atteinte par un user non connecté ( en gros )
type ProtectedRouteProps = {
	children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { isLoggedIn } = useAuth()
	if (!isLoggedIn) {
		return <Navigate to="/login" replace />
	}

	return <>{children}</>
}
