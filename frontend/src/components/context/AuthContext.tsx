// ce fichier me permet de partager le state de l'auth
// entre tous mes composants, pour qu on ait une
// single page application.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router'

type User = {
	id: string
	email: string
	username: string
}

type AuthContextType = {
	isLoggedIn: boolean
	user: User | null
	loading: boolean
	login: (token: string) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
	const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'))
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState(() => !!localStorage.getItem('accessToken'))
	const navigate = useNavigate()

	const fetchUser = useCallback(async () => {
		const token = localStorage.getItem('accessToken')
		if (!token) return
		try {
			const res = await fetch('/api/auth/me', {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error('auth')
			const userData = (await res.json()) as User
			setUser(userData)
			setIsLoggedIn(true)
		} catch {
			localStorage.removeItem('accessToken')
			setIsLoggedIn(false)
			setUser(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchUser()
	}, [fetchUser])

	const login = (token: string) => {
		localStorage.setItem('accessToken', token)
		setIsLoggedIn(true)
		setLoading(true)
		fetchUser().then(() => navigate('/dashboard'))
	}

	const logout = () => {
		localStorage.removeItem('accessToken')
		setIsLoggedIn(false)
		setUser(null)
		navigate('/')
	}

	return <AuthContext.Provider value={{ isLoggedIn, user, loading, login, logout }}>{children}</AuthContext.Provider>
}

function useAuth() {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
	return context
}

export { AuthProvider, useAuth }
export type { User }
