//import { useState } from 'react'
import Button from '../components/ui/Button'

function Dashboard() {
	//const [showJoinInput, setShowJoinInput] = useState(false)
	return (
		<div className="text-white px-6 py-12 min-h-[calc(70vh-80px)] flex items-center">
			<div className="max-w-6xl mx-auto w-full">
				{/*Header */}
				<div className="text-center mb-16">
					<h1 className="text-5xl font-bold mb-4 text-gradient-main">Bienvenue sur GameFinder</h1>
				</div>
				{/* Cards Grid */}
				<div className="grid md:grid-cols-2 gap-8">
					{/* Steam Card */}
					<div className="bg-dark-800 border border-dark-600 rounded-xl p-8 text-center hover:border-blue-500/50 transition-all hover:shadow-[0_0_30px_rgba(146,57,228,0.2)]">
						<div className="mb-6">
							<h2 className="text-2xl font-bold mb-3 text-blue-400">Lier votre compte Steam</h2>
							<p className="text-text-white leading-relaxed">
								Reliez votre compte à Steam pour que l'algorithme ait accès à vos jeux les plus joués. Ce n'est pas
								obligatoire mais cela nous aidera à vous conseiller selon votre profil de joueur !
							</p>
						</div>
						<Button variant="white" to="/steam-link">
							Connecter Steam
						</Button>
					</div>
					{/* Library Card */}
					<div className="bg-dark-800 border border-dark-600 rounded-xl p-8 text-center hover:border-violet-500/50 transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]">
						<div className="mb-6">
							<h2 className="text-2xl font-bold mb-3 text-violet-400">Explorer la bibliothèque</h2>
							<p className="text-text-white leading-relaxed">
								Si vous n'avez pas Steam, pas d'inquiétude ! Explorez notre bibliothèque avec plus de 400,000 jeux et
								indiquez les jeux auxquels vous avez joués ou les jeux qui vous intéressent !
							</p>
						</div>
						<Button variant="white" to="/library">
							Voir la bibliothèque
						</Button>
					</div>
					{/* Session Card */}
					<div className="md:col-span-2 rounded-xl p-px border border-dark-600  text-center hover:border-transparent hover:bg-linear-to-r hover:from-blue-500 hover:to-violet-500 transition-all hover:shadow-[0_0_30px_rgba(100,80,228,0.3)]">
						<div className="bg-dark-800 rounded-[11px] p-8">
							{' '}
							{/* cette div nous permet de cacher le bloc entier de couleur afin d illuminer uniquement les contours*/}
							<div className="mb-6">
								<h2 className="text-2xl font-bold text-gradient-main">Commencez maintenant</h2>
								<p className="text-text-white leading-relaxed">
									hébergez une session et inviter des amis, remplissez un formulaire sur vos envies et préférences, puis
									laissez l'algorithme faire le reste ! il vous conseillera les jeux les plus adaptés selon les goûts de
									chacun au sein de votre groupe d'amis.
								</p>
							</div>
							<div className="grid grid-cols-2 gap-8">
								<Button variant="white" to="/session">
									Créer une session
								</Button>
								<Button variant="white" to="/session">
									Rejoindre une session
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Dashboard
