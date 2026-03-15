type LogoProps = {
	className?: string
	width?: number | string
	height?: number | string
}

function Logo({ className = '', width = 100, height = 100 }: LogoProps) {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			fill="none"
		>
			<defs>
				{/* Dégradé du logo */}
				<linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
					<stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
				</linearGradient>
				{/* Clip-path hexagone intérieur pour couper les personnages */}
				<clipPath id="hexClip">
					<path d="M50 23 L73 37 L73 63 L50 77 L27 63 L27 37 Z" />
				</clipPath>
			</defs>
			{/* Bordure Extérieure */}
			<path
				d="M50 10 L85 30 L85 70 L50 90 L15 70 L15 30 Z"
				stroke="url(#logoGradient)"
				strokeWidth="1.8"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			{/* Bordure Intérieure */}
			<path
				d="M50 16 L79 33 L79 67 L50 84 L21 67 L21 33 Z"
				stroke="url(#logoGradient)"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
			<g fill="url(#logoGradient)" clipPath="url(#hexClip)">
				{/* Personnage Gauche */}
				<circle cx="35" cy="42" r="7" opacity="0.55" />
				<rect x="28" y="50" width="14" height="28" rx="7" opacity="0.55" />

				{/* Personnage Droite */}
				<circle cx="65" cy="42" r="7" opacity="0.55" />
				<rect x="58" y="50" width="14" height="28" rx="7" opacity="0.55" />

				{/* Personnage Milieu */}
				<circle cx="50" cy="36" r="9" />
				<rect x="39" y="47" width="22" height="32" rx="11" />
			</g>
		</svg>
	)
}

export default Logo
