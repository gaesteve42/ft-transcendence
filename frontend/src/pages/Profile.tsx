import { useState, useEffect } from 'react'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

function Profile() {
	const [user, setUser] = useState<{
		username: string
		email: string
		avatar: string
		steamId: string | null
		avatarUrl: string | null
	} | null>(null)
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
		fetch('/api/auth/me', {
			headers: { Authorization: `Bearer ${token}` },
		})
			.then((res) => res.json())
			.then((data) => {
				setUser({
					username: data.username,
					email: data.email,
					avatar: 'test',
					steamId: data.steamId ?? null,
					avatarUrl: data.avatarUrl ?? null,
				})
				setLoading(false)
			})
	}, [])
	const startEditing = () => {
		setEditForm({ username: user!.username })
		setIsEditing(true)
	}
	const cancelEditing = () => {
		setIsEditing(false)
		setPasswordForm({ current: '', newPass: '', confirm: '' })
	}
	// TODO: implémenter validation
	const handleSave = () => {
		setUser({ ...user!, username: editForm.username })
		setIsEditing(false)
	}
	if (loading || !user) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-text-muted">Chargement...</p>
			</div>
		)
	}
	return (
		<div className="max-w-6xl mx-auto px-6 py-12">
			<h1 className="text-3xl font-bold text-center mb-10">Mon Profil</h1>
			{isEditing ? (
				<div className="bg-dark-800 border border-dark-600 rounded-2xl p-12">
					<div className="flex items-center gap-12">
						<div className="w-40 h-40 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-6xl shrink-0">
							{user.avatar}
						</div>
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
				<div className="bg-dark-800 border border-dark-600 rounded-2xl overflow-hidden">
					{/* Banner */}
					<div className="h-32 bg-linear-to-r from-violet-500/20 to-cyan-500/20" />
					{/* Avatar chevauchant le banner */}
					<div className="px-8 -mt-12">
						<div className="w-24 h-24 rounded-full bg-dark-700 border-4 border-dark-800 flex items-center justify-center text-4xl">
							{user.avatar}
						</div>
					</div>
					{/* Infos */}
					<div className="px-8 py-6">
						<div className="grid grid-cols-2 gap-4 mb-6">
							<div className="border-dark-500 rounded-xl px-5 py-4">
								<p className="text-text-muted text-xs mb-1">Username</p>
								<p className="text-text-purple font-semibold text-xl">{user.username}</p>
							</div>
							<div className="border-dark-500 rounded-xl px-5 py-4">
								<p className="text-text-muted text-xs mb-1">Email</p>
								<p className="text-text-purple font-semibold text-xl">{user.email}</p>
							</div>
						</div>
						<div className="flex justify-end">
							<Button variant="white" onClick={startEditing}>
								Modifier le profil
							</Button>
						</div>
					</div>
					{/* Stats */}
					<div className="grid grid-cols-3 gap-4 mb-6">
						<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
							<p className="text-2xl font-bold text-text-purple">0</p>
							<p className="text-text-muted text-xs mt-1">Jeux likés</p>
						</div>
						<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
							<p className="text-2xl font-bold text-text-purple">0</p>
							<p className="text-text-muted text-xs mt-1">Sessions jouées</p>
						</div>
						<div className="bg-dark-700 rounded-xl px-4 py-4 text-center">
							<p className="text-2xl font-bold text-text-purple">0</p>
							<p className="text-text-muted text-xs mt-1">Amis</p>
						</div>
					</div>
					{/* Steam */}
					<div className="bg-dark-700 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
						<div className="flex items-center gap-3">
							{user.avatarUrl && (
								<img src={user.avatarUrl} alt="Steam avatar" className="w-10 h-10 rounded-full border-2 border-violet-500" />
							)}
							<div>
								<p className="text-text-purple font-medium text-sm">Steam</p>
								<p className={`text-xs ${user.steamId ? 'text-green-400' : 'text-text-muted'}`}>
									{user.steamId ? 'Connecté' : 'Non connecté'}
								</p>
							</div>
						</div>
						{!user.steamId && (
							<a href="/api/auth/steam" className="px-4 py-2 rounded-full text-xs font-medium border bg-dark-600 text-text-white border-dark-500 hover:border-violet-500/50 hover:text-text-purple transition-all">
								Connecter
							</a>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

export default Profile
