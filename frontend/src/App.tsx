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
		<Route path="/Register" element={<Register/>} />
		<Route path="/Login" element={<Login/>} />
		<Route path="/Profile" element={<Profile/>} />
		<Route path="/session" element={<Session/>} />
	</Routes>
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
