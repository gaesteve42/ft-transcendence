import { BrowserRouter, Routes, Route } from 'react-router'
import { AuthProvider } from './components/context/AuthContext'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Session from './pages/Session'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import SteamCallback from './pages/SteamCallback'

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
						<Route path="/privacy" element={<PrivacyPolicy />} />
						<Route path="/terms" element={<TermsOfService />} />
						<Route path="/auth/callback" element={<SteamCallback />} />

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
							path="/profile/:userId"
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
							path="/session/:lobbyId"
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
