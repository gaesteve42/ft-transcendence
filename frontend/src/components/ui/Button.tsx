import { Link } from 'react-router'

type ButtonProps = {
	children: React.ReactNode
	to?: string
	type?: 'button' | 'submit'
	variant?: 'purple' | 'secondary' | 'blue' | 'gradient'
	onClick?: () => void
}

function Button({ children, to, type = 'button', variant = 'purple', onClick }: ButtonProps) {
	const base = 'px-6 py-3 rounded-lg font-semibold transition-all text-center cursor-pointer'
	const variants = {
		purple: 'bg-violet-500 hover:bg-violet-600 text-white hover:shadow-[0_0_25px_rgba(146,57,228,0.5)]',
		secondary:
			'bg-dark-700 hover:bg-dark-600 text-text-purple border border-dark-500 hover:border-violet-500/50 hover:shadow-[0_0_20px_rgba(146,57,228,0.2)]',
		blue: 'bg-blue-500 hover:bg-blue-600 text-white hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]',
		gradient: 'text-2xl font-bold text-gradient-main hover:drop-shadow-[0_0_12px_rgba(146,57,228,1)] transition-all',
	}
	const className = `${base} ${variants[variant]}`

	if (to) {
		return (
			<Link to={to} className={className}>
				{children}
			</Link>
		)
	}

	return (
		<button type={type} onClick={onClick} className={className}>
			{children}
		</button>
	)
}

export default Button
