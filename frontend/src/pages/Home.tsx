import Button from '../components/ui/Button'
import {
	GiBroadsword, GiCrossbow, GiDragonHead, GiMountainRoad,
	GiShield, GiCastle, GiCrossedSwords, GiSkullCrossedBones,
	GiTreasureMap, GiCrystalBall, GiWizardStaff, GiHelmet,
	GiCrown, GiTorch, GiCompass, GiScrollUnfurled,
	GiGamepad, GiAxeSword, GiSwordInStone,
} from 'react-icons/gi'
import type { IconType } from 'react-icons' //react_icons sert uniquement ici pour l'instant, on peut avoir des icons plutôt cools qui correspondent au site

const BACKGROUND_ICONS: { Icon: IconType; color: string; top: string; left?: string; right?: string; rotate: number; size: number }[] = [
	{ Icon: GiBroadsword, color: '#ef4444', top: '3%', left: '7%', rotate: -20, size: 32 },
	{ Icon: GiCrossbow, color: '#f59e0b', top: '6%', right: '9%', rotate: 15, size: 28 },
	{ Icon: GiDragonHead, color: '#9239e4', top: '5%', left: '21%', rotate: -5, size: 34 },
	{ Icon: GiMountainRoad, color: '#22c55e', top: '12%', left: '77%', rotate: 8, size: 30 },
	{ Icon: GiShield, color: '#3b82f6', top: '16%', left: '14%', rotate: -12, size: 26 },
	{ Icon: GiCastle, color: '#a855f7', top: '20%', right: '6%', rotate: 10, size: 34 },
	{ Icon: GiCrossedSwords, color: '#00bfff', top: '25%', left: '4%', rotate: 18, size: 30 },
	{ Icon: GiSkullCrossedBones, color: '#dc2626', top: '33%', left: '82%', rotate: 12, size: 26 },
	{ Icon: GiTreasureMap, color: '#eab308', top: '38%', left: '10%', rotate: -15, size: 32 },
	{ Icon: GiCrystalBall, color: '#ec4899', top: '42%', right: '7%', rotate: 5, size: 28 },
	{ Icon: GiWizardStaff, color: '#8b5cf6', top: '48%', left: '78%', rotate: -10, size: 30 },
	{ Icon: GiHelmet, color: '#00bfff', top: '52%', left: '5%', rotate: 14, size: 28 },
	{ Icon: GiCrown, color: '#f59e0b', top: '56%', right: '14%', rotate: -6, size: 26 },
	{ Icon: GiTorch, color: '#f97316', top: '62%', left: '18%', rotate: 20, size: 30 },
	{ Icon: GiCompass, color: '#22c55e', top: '66%', right: '5%', rotate: -12, size: 32 },
	{ Icon: GiScrollUnfurled, color: '#14b8a6', top: '75%', left: '80%', rotate: 8, size: 28 },
	{ Icon: GiGamepad, color: '#9239e4', top: '75%', left: '8%', rotate: -18, size: 34 },
	{ Icon: GiAxeSword, color: '#ef4444', top: '88%', left: '13%', rotate: -8, size: 30 },
	{ Icon: GiSwordInStone, color: '#3b82f6', top: '90%', right: '10%', rotate: 15, size: 32 },
]

function Home() {
	return (
		<div className="relative">
			{/* Background gaming icons */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{BACKGROUND_ICONS.map(({ Icon, color, top, left, right, rotate, size }, i) => (
					<Icon
						key={i}
						className="absolute"
						style={{
							top,
							left,
							right,
							transform: `rotate(${rotate}deg)`,
							opacity: 0.5,
							color,
							fontSize: size,
						}}
					/>
				))}
			</div>

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
					<p className="text-xl md:text-2xl text-text-secondary mb-6 max-w-2xl">
						Trouvez le jeu parfait pour votre groupe d'amis
					</p>
					<p className="text-xl text-text-secondary max-w-2xl">
						Créez une session, partagez vos envies, et laissez notre algorithme
						vous recommander les meilleurs jeux pour votre groupe.
					</p>
				</div>
			</section>
			{/* Qui sommes-nous Section */}
			<section className="relative z-10 max-w-4xl mx-auto px-6 py-24">
				<h2 className="text-3xl font-bold text-center mb-10">
					Qui sommes-nous ?
				</h2>
				<div className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-8 md:p-10">
					<p className="text-text-secondary leading-relaxed mb-4">
						On est quatre potes — <span className="text-text-primary font-medium">
							Leo, Gauthier, Kevin et Pierre</span> — et comme beaucoup de joueurs,
						on a perdu <span className="text-text-primary font-medium">des heures
							à débattre</span> de ce qu'on allait jouer le soir même.
					</p>
					<p className="text-text-secondary leading-relaxed mb-4">
						Entre les <span className="text-text-primary font-medium">goûts
							différents</span>, les jeux que tout le monde n'a pas, et les
						"Ouais mais moi j'ai pas envie de ça ce soir"… on a eu l'idée de
						GameFinder : <span className="text-text-primary font-medium">
							un outil qui fait le taf à notre place</span>.
					</p>
					<p className="text-text-secondary leading-relaxed">
						Le concept ? Vous créez une session, chacun indique son
						<span className="text-text-primary font-medium"> mood et ses envies
							du moment</span>, et notre algorithme vous sort les jeux qui vont
						plaire à <span className="text-text-primary font-medium">tout le
							monde</span>. Simple, rapide, efficace.
					</p>
				</div>
			</section>
			{/* Features Section */}
			<section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
				<h2 className="text-3xl font-bold text-center mb-4">
					Comment ça marche ?
				</h2>
				<p className="text-text-muted text-center mb-14 max-w-lg mx-auto">
					En trois étapes simples, trouve le jeu idéal pour ta prochaine session.
				</p>
				<div className="grid md:grid-cols-3 gap-6">
					<FeatureCard
						step="01"
						title="Construis ta ludothèque"
						description="Parcours notre catalogue et coche les jeux que tu possèdes ou que tu as déjà testés. Plus ton profil est complet, meilleures sont les recommandations."
						color="#00bfff"
					/>
					<FeatureCard
						step="02"
						title="Créer une session"
						description="Lance une session, invite tes amis, et chacun indique son mood du moment : chill, compétitif, coopératif... Notre algorithme fait le reste."
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
					<h2 className="text-3xl md:text-4xl font-bold mb-10">
						Prêt à trouver ton prochain jeu ?
					</h2>
					<Button to="/register" variant="blue">Rejoins-nous</Button>
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
			<h3
				className="text-xl font-semibold mb-3 transition-colors"
				style={{ color }}
			>
				{title}
			</h3>
			<p className="text-text-secondary text-sm leading-relaxed">{description}</p>
		</div>
	)
}

export default Home
