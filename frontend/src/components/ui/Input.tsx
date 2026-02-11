type InputProps = {
	type?: string
	placeholder?: string
	value?: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	label?: string
}

function Input({ type = 'text', placeholder, value, onChange, label }: InputProps) {
	return (
		<div className="flex flex-col gap-1">
			{label && (
				<label className="text-sm text-text-secondary">{label}</label>
			)}
			<input
				type={type}
				placeholder={placeholder}
				value={value}
				onChange={onChange}
				className="w-full bg-dark-700 border border-dark-500 rounded-lg px-4 py-3 text-text-primary
				placeholder-text-muted focus:outline-none focus:border-violet-500 transition-colors"
			/>
		</div>
	)
}

export default Input
