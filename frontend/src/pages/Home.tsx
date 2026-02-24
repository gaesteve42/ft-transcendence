import Button from '../components/ui/Button'

function Home() {
	return (
		<div className="relative">
			{/* App name Section */}
			<section className="relative">
				<div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
					<h1 className="relative text-5xl md:text-7xl font-bold mb-6 leading-tight">
						{/* Glow layer — copie floue derrière le texte */}
						<span
							className="absolute inset-0 text-5xl md:text-7xl font-bold"
							aria-hidden="true"
							style={{
								background: 'linear-gradient(135deg, #00bfff, #9239e4)',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								backgroundClip: 'text',
								filter: 'blur(25px)',
								opacity: 0.35,
							}}
						>
							GameFinder
						</span>
						{/* Texte principal */}
						<span className="relative text-gradient-main">GameFinder</span>
					</h1>
					<p className="text-xl md:text-2xl text-text-white mb-6 max-w-2xl">
						Trouvez le jeu parfait pour votre groupe d'amis
					</p>
					<p className="text-xl text-text-white max-w-2xl">
						Créez une session, partagez vos envies, et laissez notre algorithme vous recommander les meilleurs jeux pour
						votre groupe.
					</p>
				</div>
			</section>
			{/* Qui sommes-nous Section */}
			<section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
				<h2 className="text-3xl font-bold text-center mb-10">Qui sommes-nous ?</h2>
				<div className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-8 md:p-10">
					<p className="text-text-white leading-relaxed mb-4">
						On est quatre potes — Leo, Gauthier, Kevin et Pierre — et comme beaucoup de joueurs, on a perdu des heures à
						débattre de ce qu'on allait jouer le soir même.
					</p>
					<p className="text-text-white leading-relaxed mb-4">
						Entre les goûts différents , les jeux que tout le monde n'a pas, et les besoins de chacun, on a eu l'idée de
						GameFinder : un outil qui met fin aux débats.
					</p>
					<p className="text-text-white leading-relaxed mb-4">
						Le concept ? Vous créez une session, chacun indique ses préférences et ses envies du moment, et notre
						algorithme vous propose les jeux qui vont plaire à tout le monde . Simple, rapide, efficace.
					</p>
				</div>
			</section>
			{/* Features Section */}
			<section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
				<h2 className="text-3xl font-bold text-center mb-4">Comment ça marche ?</h2>
				<p className="text-text-muted text-center mb-14 max-w-lg mx-auto">
					En trois étapes simples, trouve le jeu idéal pour ta prochaine session.
				</p>
				<div className="grid md:grid-cols-3 gap-6">
					<FeatureCard
						step="01"
						title="Construis ta bibliothèque"
						description="Parcours notre catalogue et coche les jeux que tu possèdes ou connecte ton compte à Steam. Plus ton profil est complet, meilleures sont les recommandations."
						color="#00bfff"
					/>
					<FeatureCard
						step="02"
						title="Créer une session"
						description="Lance une session, invite tes amis, et chacun indique ses préférences. Notre algorithme trouvera les jeux les plus adaptés pour vous."
						color="#9239e4"
					/>
					<FeatureCard
						step="03"
						title="L'algorithme vous aide"
						description="Recevez 3 à 5 jeux recommandés qui correspondent aux goûts et aux envies de tout le groupe. Plus qu'à voter et lancer la partie !"
						color="#22c55e"
					/>
				</div>
			</section>
			{/* CTA Section */}
			<section className="relative overflow-hidden py-24 px-6">
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background: 'radial-gradient(ellipse at center, rgba(146,57,228,0.08) 0%, transparent 60%)',
					}}
				/>
				<div className="relative z-10 max-w-2xl mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-bold mb-10">Prêt à trouver ton prochain jeu ?</h2>
					<Button to="/register" variant="blue">
						Rejoins-nous
					</Button>
				</div>
			</section>
		</div>
	)
}

type FeatureCardProps = {
	step: string
	title: string
	description: string
	color: string
}

function FeatureCard({ step, title, description, color }: FeatureCardProps) {
	return (
		<div className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-6 transition-all hover:-translate-y-1">
			<span
				className="inline-block text-xs font-bold mb-3 px-2 py-1 rounded"
				style={{
					color: color,
					backgroundColor: `${color}15`,
				}}
			>
				ÉTAPE {step}
			</span>
			<h3 className="text-xl font-semibold mb-3 transition-colors" style={{ color }}>
				{title}
			</h3>
			<p className="text-text-white text-sm leading-relaxed">{description}</p>
		</div>
	)
}

export default Home
