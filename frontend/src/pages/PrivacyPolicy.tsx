function PrivacyPolicy() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-16">
			<h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

			<div className="space-y-6 text-text-white leading-relaxed">
				<section>
					<h2 className="text-xl font-semibold text-white mb-3">1. Data We Collect</h2>
					<p>When you create an account, we collect your username, email address, and password (stored as a hash). If you connect your Steam account, we access your public Steam profile (username, avatar) and your game library (owned games and playtime).</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Data</h2>
					<p>Your data is used exclusively to provide the GameFinder service: matching you with friends, building your game library, and running our recommendation algorithm during sessions. We do not sell, share, or monetize your personal data in any way.</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold text-white mb-3">3. Steam Integration</h2>
					<p>When you link your Steam account, we use the Steam Web API to fetch your public profile and game library. We only store game identifiers and playtime data. We do not access your Steam password, purchase history, or private information.</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold text-white mb-3">4. Data Storage</h2>
					<p>Your data is stored securely in our database. Passwords are hashed using industry-standard algorithms. Authentication is handled via JWT tokens stored locally in your browser.</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold text-white mb-3">5. Your Rights</h2>
					<p>You can request deletion of your account and all associated data at any time by contacting us. You can unlink your Steam account at any time, which will remove your Steam-related data from our system.</p>
				</section>

				<section>
					<h2 className="text-xl font-semibold text-white mb-3">6. Contact</h2>
					<p>For any questions about this privacy policy, reach out to us at gamefinder@contact.com.</p>
				</section>
			</div>

			<p className="text-text-muted text-sm mt-12">Last updated: March 2026</p>
		</div>
	)
}

export default PrivacyPolicy
