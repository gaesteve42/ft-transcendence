import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Session from './pages/Session'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route element={<Layout />}>
						{/* Pages publiques */}
						<Route path="/" element={<Home />} />
						<Route path="/register" element={<Register />} />
						<Route path="/login" element={<Login />} />

						{/* Pages protégées */}
						<Route
							path="/dashboard"
							element={
								<ProtectedRoute>
									<Dashboard />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/profile"
							element={
								<ProtectedRoute>
									<Profile />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/session"
							element={
								<ProtectedRoute>
									<Session />
								</ProtectedRoute>
							}
						/>
						<Route
							path="/library"
							element={
								<ProtectedRoute>
									<Library />
								</ProtectedRoute>
							}
						/>
					</Route>
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	)
}

export default App

/*

Ce que je veux focus dans l ordre pour bien comprendre react

Les composants : une fonction qui retourne du JSX/TSX (du HTML dans du JavaScript)
Les props : passer des données d'un composant parent à un enfant
Le state avec useState : gérer des données qui changent (ex: un compteur, un input)
Le rendu conditionnel : afficher ou cacher des éléments selon une condition
Les listes et keys : afficher une liste d'éléments avec .map()
Les événements : réagir aux clics, aux saisies clavier, etc.
*/
