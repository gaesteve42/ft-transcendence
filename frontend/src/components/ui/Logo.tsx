import React from 'react'

interface LogoProps {
	className?: string
	width?: number | string
	height?: number | string
}

const Logo: React.FC<LogoProps> = ({ className = '', width = 100, height = 100 }) => {
	return (
		<svg
			width={width}
			height={height}
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			fill="none" // Assure que le fond global du SVG est transparent
		>
			<defs>
				{/* Dégradé du logo */}
				<linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
					<stop offset="100%" stopColor="#8b5cf6" stopOpacity="1" />
				</linearGradient>

				{/* Clip-path hexagone intérieur pour couper les personnages */}
				<clipPath id="hexClip">
					<path d="M50 16 L75 31 L75 58 L55 67 L50 69 L45 67 L25 58 L25 31 Z" />
				</clipPath>
			</defs>

			{/* Forme Hexagonale - Bordure Extérieure */}
			<path
				d="M50 5 L85 25 L85 65 L60 75 L50 80 L40 75 L15 65 L15 25 Z"
				stroke="url(#logoGradient)"
				strokeWidth="1.8"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>

			{/* Forme Hexagonale - Bordure Intérieure */}
			<path
				d="M50 11 L80 28 L80 62 L58 71 L50 75 L42 71 L20 62 L20 28 Z"
				stroke="url(#logoGradient)"
				strokeWidth="1.5"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>

			{/* Les Personnages - clippés à l'intérieur de l'hexagone */}
			<g fill="url(#logoGradient)" clipPath="url(#hexClip)">
				{/* Personnage Gauche (arrière-plan) */}
				<circle cx="35" cy="40" r="7" opacity="0.55" />
				<rect x="28" y="48" width="14" height="30" rx="7" opacity="0.55" />

				{/* Personnage Droite (arrière-plan) */}
				<circle cx="65" cy="40" r="7" opacity="0.55" />
				<rect x="58" y="48" width="14" height="30" rx="7" opacity="0.55" />

				{/* Personnage Milieu (devant, opaque) */}
				<circle cx="50" cy="33" r="9" />
				<rect x="39" y="44" width="22" height="35" rx="11" />
			</g>
		</svg>
	)
}

export default Logo
