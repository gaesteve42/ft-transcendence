// ce fichier me permet de partager le state de l'auth
// entre tous mes composants, pour qu on ait une
// single page application.

import { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router'

type AuthContextType = {
	isLoggedIn: boolean
	login: (token: string) => void
	logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

function AuthProvider({ children }: { children: React.ReactNode }) {
	const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('accessToken'))
	const navigate = useNavigate()

	const login = (token: string) => {
		localStorage.setItem('accessToken', token)
		setIsLoggedIn(true)
		navigate('/dashboard')
	}

	const logout = () => {
		localStorage.removeItem('accessToken')
		setIsLoggedIn(false)
		navigate('/')
	}

	return <AuthContext.Provider value={{ isLoggedIn, login, logout }}>{children}</AuthContext.Provider>
}

function useAuth() {
	const context = useContext(AuthContext)
	if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider')
	return context
}

export { AuthProvider, useAuth }
