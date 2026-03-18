import { motion } from 'motion/react'
import Button from '../components/ui/Button'

type FeatureCardProps = {
	step: string
	title: string
	description: string
	color: string
	index: number
}

function FeatureCard({ step, title, description, color, index }: FeatureCardProps) {
	return (
		<motion.div
			className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-6 transition-all hover:-translate-y-1"
			initial={{ opacity: 0, y: 20 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ delay: index * 0.1 }}
		>
			<span
				className="inline-block text-xs font-bold mb-3 px-2 py-1 rounded"
				style={{
					color: color,
					backgroundColor: `${color}15`,
				}}
			>
				STEP {step}
			</span>
			<h3 className="text-xl font-semibold mb-3 transition-colors" style={{ color }}>
				{title}
			</h3>
			<p className="text-text-white text-sm leading-relaxed">{description}</p>
		</motion.div>
	)
}

function Home() {
	return (
		<div className="relative">
			{/* Hero Section */}
			<section className="relative">
				<div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
					<motion.h1
						className="relative text-5xl md:text-7xl font-bold mb-6 leading-tight"
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
					>
						{/* Glow layer */}
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
						<span className="relative text-gradient-main">GameFinder</span>
					</motion.h1>
					<motion.p
						className="text-xl md:text-2xl text-text-white mb-6 max-w-2xl"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
					>
						Find the perfect game for your group of friends
					</motion.p>
					<motion.p
						className="text-xl text-text-white max-w-2xl"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.15 }}
					>
						Create a session, share your preferences, and let our algorithm recommend the best games for your group.
					</motion.p>
				</div>
			</section>
			{ /*How does it work*/}
			<section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
				<motion.h2
					className="text-3xl font-bold text-center mb-4"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
				>
					How does it work?
				</motion.h2>
				<motion.p
					className="text-text-muted text-center mb-14 max-w-lg mx-auto"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.05 }}
				>
					In three simple steps, find the ideal game for your next session.
				</motion.p>
				<div className="grid md:grid-cols-3 gap-6">
					<FeatureCard
						step="01"
						title="Build your library"
						description="Browse our catalog and check the games you own, or connect your Steam account. The more complete your profile, the better the recommendations."
						color="#00bfff"
						index={0}
					/>
					<FeatureCard
						step="02"
						title="Create a session"
						description="Start a session, invite your friends, and everyone shares their preferences. Our algorithm will find the best games for your group."
						color="#9239e4"
						index={1}
					/>
					<FeatureCard
						step="03"
						title="Get recommendations"
						description="Receive 3 to 5 recommended games that match the tastes and preferences of your entire group. All that's left is to pick one and play!"
						color="#22c55e"
						index={2}
					/>
				</div>
			</section>
			{/* About Section */}
			<section className="relative z-10 max-w-4xl mx-auto px-6 py-16">
				<motion.h2
					className="text-3xl font-bold text-center mb-10"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
				>
					Who are we?
				</motion.h2>
				<motion.div
					className="bg-dark-800/50 border border-dark-600/50 rounded-xl p-8 md:p-10"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ delay: 0.05 }}
				>
					<p className="text-text-white leading-relaxed mb-4">
						We're four friends — Leo, Gauthier, Kevin and Pierre — and like many gamers, we've wasted hours debating what to play on any given evening.
					</p>
					<p className="text-text-white leading-relaxed mb-4">
						Between different tastes, games that not everyone owns, and everyone's needs, we came up with GameFinder: a tool that puts an end to the debate.
					</p>
					<p className="text-text-white leading-relaxed mb-4">
						The concept? You create a session, everyone shares their preferences, and our algorithm suggests games that the whole group will enjoy. Simple, fast, effective.
					</p>
				</motion.div>
			</section>
			{/* CTA Section */}
			<section className="relative overflow-hidden py-24 px-6">
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background: 'radial-gradient(ellipse at center, rgba(146,57,228,0.08) 0%, transparent 60%)',
					}}
				/>
				<motion.div
					className="relative z-10 max-w-2xl mx-auto text-center"
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
				>
					<h2 className="text-3xl md:text-4xl font-bold mb-10">Ready to find your next game?</h2>
					<Button to="/register" variant="blue">
						Join us
					</Button>
				</motion.div>
			</section>
		</div>
	)
}

export default Home
