import { useState, useEffect } from 'react'
import { useParams } from 'react-router'
import { useAuth } from '../components/context/AuthContext'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import steamLoginImg from '../assets/steam_login.png'

type ProfileUser = {
	username: string
	email: string | null
	avatar: string | null
	steamId: string | null
	avatarUrl: string | null
}

function Profile() {
	const { userId } = useParams<{ userId: string }>()
	const { user: authUser } = useAuth()
	const isOwnProfile = !userId || userId === authUser?.id

	const [user, setUser] = useState<ProfileUser | null>(null)
	const [isEditing, setIsEditing] = useState(false)
	const [editForm, setEditForm] = useState({ username: '' })
	const [passwordForm, setPasswordForm] = useState({
		current: '',
		newPass: '',
		confirm: '',
	})
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const token = localStorage.getItem('accessToken')
		setLoading(true)
		setIsEditing(false)

		if (isOwnProfile) {
			fetch('/api/auth/me', {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then((res) => res.json())
				.then((data) => {
					setUser({
						username: data.username,
						email: data.email,
						avatar: data.avatarUrl ?? null,
						steamId: data.steamId ?? null,
						avatarUrl: data.avatarUrl ?? null,
					})
					setLoading(false)
				})
		} else {
			fetch(`/api/users/${userId}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
				.then((res) => {
					if (!res.ok) throw new Error('User not found')
					return res.json()
				})
				.then((data) => {
					setUser({
						username: data.username,
						email: null,
						avatar: data.avatarUrl ?? null,
						steamId: data.steamId ?? null,
						avatarUrl: data.avatarUrl ?? null,
					})
					setLoading(false)
				})
				.catch(() => {
					setUser(null)
					setLoading(false)
				})
		}
	}, [userId, isOwnProfile])

	const startEditing = () => {
		setEditForm({ username: user!.username })
		setIsEditing(true)
	}
	const cancelEditing = () => {
		setIsEditing(false)
		setPasswordForm({ current: '', newPass: '', confirm: '' })
	}
	const handleLinkSteam = async () => {
		const token = localStorage.getItem('accessToken')
		const res = await fetch('/api/auth/steam/link/start', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
		})
		if (res.ok) {
			const { redirectUrl } = await res.json()
			window.location.href = redirectUrl
		}
	}
	const handleSave = () => {
		setUser({ ...user!, username: editForm.username })
		setIsEditing(false)
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-text-muted">Chargement...</p>
			</div>
		)
	}
	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-text-muted">User not found</p>
			</div>
		)
	}

	return (
		<div className="max-w-6xl mx-auto px-6 py-12">
			{isEditing && isOwnProfile ? (
				<div className="bg-dark-800 border border-dark-600 rounded-2xl p-12">
					<div className="flex items-center gap-12">
						{user.avatar ? (
							<img src={user.avatar} alt={user.username} className="w-40 h-40 rounded-full border-2 border-dark-500 object-cover shrink-0" />
						) : (
							<div className="w-40 h-40 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-6xl shrink-0 text-text-muted">
								{user.username.charAt(0).toUpperCase()}
							</div>
						)}
						<div className="flex-1 space-y-4">
							<Input
								label="Username"
								value={editForm.username}
								onChange={(e) =>
									setEditForm({
										...editForm,
										username: e.target.value,
									})
								}
							/>
							<div className="border-t border-dark-500 pt-4 mt-4">
								<p className="text-text-muted text-sm mb-3">Changer le mot de passe</p>
								<div className="space-y-3">
									<Input
										label="Mot de passe actuel"
										type="password"
										value={passwordForm.current}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												current: e.target.value,
											})
										}
									/>
									<Input
										label="Nouveau mot de passe"
										type="password"
										value={passwordForm.newPass}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												newPass: e.target.value,
											})
										}
									/>
									<Input
										label="Confirmer"
										type="password"
										value={passwordForm.confirm}
										onChange={(e) =>
											setPasswordForm({
												...passwordForm,
												confirm: e.target.value,
											})
										}
									/>
								</div>
							</div>
						</div>
					</div>
					<div className="flex gap-4 justify-end mt-8">
						<Button variant="blue" onClick={handleSave}>
							Sauvegarder
						</Button>
						<Button variant="white" onClick={cancelEditing}>
							Annuler
						</Button>
					</div>
				</div>
			) : (
				<div className="space-y-6">
					{/* Profile card */}
					<div className="bg-dark-800 border border-dark-600 rounded-2xl p-8">
						{/* Avatar + info + edit button */}
						<div className="flex items-center gap-6">
							{user.avatar ? (
								<img src={user.avatar} alt={user.username} className="w-24 h-24 rounded-full border-3 border-violet-500/40 object-cover shrink-0 shadow-[0_0_20px_rgba(146,57,228,0.2)]" />
							) : (
								<div className="w-24 h-24 rounded-full bg-dark-700 border-3 border-violet-500/40 flex items-center justify-center text-4xl text-text-muted shrink-0 shadow-[0_0_20px_rgba(146,57,228,0.2)]">
									{user.username.charAt(0).toUpperCase()}
								</div>
							)}
							<div className="min-w-0 flex-1">
								<h2 className="text-2xl font-bold truncate">{user.username}</h2>
								{isOwnProfile && (
									<p className="text-text-white text-sm mt-1">{user.email || 'Steam account'}</p>
								)}
							</div>
							{isOwnProfile && (
								<Button variant="white" onClick={startEditing}>
									Edit profile
								</Button>
							)}
						</div>
						{/* Stats row */}
						<div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-dark-600">
							<div className="text-center">
								<p className="text-2xl font-bold text-gradient-main">0</p>
								<p className="text-text-muted text-xs mt-1">Games in your personal library</p>
							</div>
							<div className="text-center">
								<p className="text-2xl font-bold text-gradient-main">0</p>
								<p className="text-text-muted text-xs mt-1">Sessions you participated in</p>
							</div>
						</div>
					</div>
					{/* Steam connection card — own profile only */}
					{isOwnProfile && (
						<div className="bg-dark-800 border border-dark-600 rounded-2xl px-6 py-5 flex items-center justify-between">
							<div className="flex items-center gap-4">
								<div>
									<p className="font-medium text-sm">Steam</p>
									<p className={`text-xs ${user.steamId ? 'text-green-400' : 'text-text-muted'}`}>
										{user.steamId ? 'Connected' : 'Not connected'}
									</p>
								</div>
							</div>
							{!user.steamId && (
								<button onClick={handleLinkSteam} className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer">
									<img src={steamLoginImg} alt="Sign in through Steam" className="h-8" />
								</button>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	)
}

export default Profile
