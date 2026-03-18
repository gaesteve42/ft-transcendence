import { useState, useEffect, useRef } from 'react'
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

async function uploadAvatar(file: File): Promise<string | null> {
	try {
		const token = localStorage.getItem('accessToken')
		const body = new FormData()
		body.append('avatar', file)
		const res = await fetch('/api/users/avatar', {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` },
			body,
		})
		if (!res.ok) return null
		const data = await res.json()
		return data.avatarUrl
	} catch {
		return null
	}
}

function Profile() {
	const { userId } = useParams<{ userId: string }>()
	const { user: authUser, refreshUser } = useAuth()
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
	const [passwordError, setPasswordError] = useState('')
	const [passwordSuccess, setPasswordSuccess] = useState('')
	const [saveStatus, setSaveStatus] = useState<'saved' | 'error' | ''>('')
	const [avatarUploading, setAvatarUploading] = useState(false)
	const [avatarError, setAvatarError] = useState('')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setAvatarError('')
		setAvatarUploading(true)
		const newUrl = await uploadAvatar(file)
		if (newUrl) {
			setUser({ ...user!, avatar: newUrl, avatarUrl: newUrl })
			await refreshUser()
		} else {
			setAvatarError('Impossible d\'importer cette image')
			setTimeout(() => setAvatarError(''), 4000)
		}
		setAvatarUploading(false)
		if (fileInputRef.current) fileInputRef.current.value = ''
	}
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
	const handleSave = async () => {
		const token = localStorage.getItem('accessToken')
		setPasswordError('')
		setPasswordSuccess('')
		setSaveStatus('')
		if (passwordForm.current || passwordForm.newPass || passwordForm.confirm) {
			if (passwordForm.newPass !== passwordForm.confirm) {
				setPasswordError('Passwords do not match')
				setSaveStatus('error')
				return
			}
			try {
				const res = await fetch('/api/auth/password', {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
					body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.newPass }),
				})
				if (!res.ok) {
					const data = await res.json()
					setPasswordError(data.message || 'Failed to change password')
					setSaveStatus('error')
					return
				}
				setPasswordSuccess('Password updated')
				setPasswordForm({ current: '', newPass: '', confirm: '' })
			} catch {
				setPasswordError('Network error')
				setSaveStatus('error')
				return
			}
		}
		setUser({ ...user!, username: editForm.username })
		setSaveStatus('saved')
		setTimeout(() => setSaveStatus(''), 3000)
	}
	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[60vh]">
				<p className="text-text-muted">Loading...</p>
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
			{/* Edit mode */}
			{isEditing && isOwnProfile ? (
				<div className="bg-dark-800 border border-dark-600 rounded-2xl p-12">
					<div className="flex items-center gap-12">
						{/* Avatar — clickable in edit mode */}
						<div className="relative shrink-0 cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
							{user.avatar ? (
								<img src={user.avatar} alt={user.username} className="w-40 h-40 rounded-full border-2 border-dark-500 object-cover" />
							) : (
								<div className="w-40 h-40 rounded-full bg-dark-700 border-2 border-dark-500 flex items-center justify-center text-6xl text-text-muted">
									{user.username.charAt(0).toUpperCase()}
								</div>
							)}
							<div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<span className="text-white text-sm font-medium">{avatarUploading ? 'Uploading...' : 'Change'}</span>
							</div>
							<input ref={fileInputRef} type="file" accept="image/jpeg,image/png" onChange={handleAvatarChange} className="hidden" />
						</div>
						{avatarError && <p className="text-red-500 text-sm mt-2">{avatarError}</p>}
						{/* Edit form */}
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
							{/* Password change */}
							<div className="border-t border-dark-500 pt-4 mt-4">
								<p className="text-text-muted text-sm mb-3">Change password</p>
								<div className="space-y-3">
									<Input
										label="Current password"
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
										label="New password"
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
										label="Confirm"
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
								{passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
								{passwordSuccess && <p className="text-green-400 text-sm mt-2">{passwordSuccess}</p>}
							</div>
						</div>
					</div>
					<div className="flex items-center gap-4 justify-end mt-8">
						{saveStatus === 'saved' && <span className="text-green-400 text-sm">Saved</span>}
						{saveStatus === 'error' && <span className="text-red-500 text-sm">Error</span>}
						<Button variant="blue" onClick={handleSave}>
							Save
						</Button>
						<Button variant="white" onClick={() => setIsEditing(false)}>
							Back to profile
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
