import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Session from './pages/Session'
import Dashboard from './pages/Dashboard'

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
				<Route element={<Layout />}>
					<Route path="/" element={<Home />} />
					<Route path="/register" element={<Register />} />
					<Route path="/login" element={<Login />} />
					<Route path="/profile" element={<Profile />} />
					<Route path="/session" element={<Session />} />
					<Route path="/dashboard" element={<Dashboard />} />
				</Route>
			</Routes>
			</AuthProvider>
		</BrowserRouter>
	)
}

export default App

/*

Ce que je veux focus dans l ordre pour bien comprendre react

Les composants : une fonction qui retourne du JSX (du HTML dans du JavaScript)
Les props : passer des données d'un composant parent à un enfant
Le state avec useState : gérer des données qui changent (ex: un compteur, un input)
Le rendu conditionnel : afficher ou cacher des éléments selon une condition
Les listes et keys : afficher une liste d'éléments avec .map()
Les événements : réagir aux clics, aux saisies clavier, etc.
*/
