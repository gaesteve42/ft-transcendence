import { BrowserRouter, Routes, Route } from 'react-router'
import Home from './pages/Home'
import Login from './pages/Login.tsx'
import Profile from './pages/Profile.tsx'
import Register from './pages/Register.tsx'
import Session from './pages/Session.tsx'

function App()
{
	return (
	<BrowserRouter>
	<Routes>
		<Route path="/" element={<Home/>} />
		<Route path="/Login" element={<Login/>} />
		<Route path="/Profile" element={<Profile/>} />
		<Route path="/Register" element={<Register />} />
		<Route path="/session" element={<Session />} />
	</Routes>
	</BrowserRouter>
	)
}

export default App
