<!-- Accepts a Facebook/Instagram URL or username, extracts the profile ID, and displays it with related links. -->
<script lang="ts">
	interface ExtractResult {
		success: boolean;
		platform: 'facebook' | 'instagram';
		id: string;
		name: string | null;
		username: string | null;
		error?: string;
	}

	let input = $state('');
	let loading = $state(false);
	let result = $state<ExtractResult | null>(null);
	let errorMsg = $state('');
	let showPlatformSelect = $state(false);
	let manualExtract = $state(false);
	let lastUrl = $state('');
	let copyLabel = $state('copy');

	// Returns true if the string looks like a URL rather than a bare username.
	function isUrl(str: string): boolean {
		return str.startsWith('http') || str.includes('.com/') || str.includes('.net/');
	}

	// Hides the platform selector as the user types.
	function handleInput() {
		showPlatformSelect = false;
	}

	// Triggers extraction when the user presses Enter.
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') extract();
	}

	// Determines whether input is a URL or username and routes accordingly.
	async function extract() {
		const trimmed = input.trim();
		if (!trimmed) return;

		if (!isUrl(trimmed)) {
			showPlatformSelect = true;
			return;
		}

		showPlatformSelect = false;
		await doExtract(trimmed);
	}

	// Builds a full profile URL from a bare username and the chosen platform, then extracts.
	async function extractAs(platform: 'facebook' | 'instagram') {
		const trimmed = input.trim();
		const url = platform === 'facebook'
			? `https://www.facebook.com/${trimmed}`
			: `https://www.instagram.com/${trimmed}`;
		showPlatformSelect = false;
		await doExtract(url);
	}

	// Calls the extract API and updates state with the result or shows manual extraction fallback.
	async function doExtract(url: string) {
		lastUrl = url;
		loading = true;
		result = null;
		errorMsg = '';
		manualExtract = false;
		copyLabel = 'copy';

		try {
			const res = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
			const data: ExtractResult = await res.json();

			if (!data.success) {
				manualExtract = true;
				errorMsg = data.error || 'Could not extract ID';
				return;
			}

			result = data;
		} catch {
			manualExtract = true;
			errorMsg = 'Failed to fetch profile data';
		} finally {
			loading = false;
		}
	}

	// Copies the extracted ID to the clipboard and briefly changes the button label.
	function copyId() {
		if (!result) return;
		navigator.clipboard.writeText(result.id);
		copyLabel = 'copied';
		setTimeout(() => copyLabel = 'copy', 1000);
	}

	// Opens the last extracted profile URL in a new tab.
	function openProfile() {
		if (lastUrl) window.open(lastUrl, '_blank');
	}

	// Reads HTML source from the clipboard and passes it to client-side extraction.
	async function pasteAndExtract() {
		try {
			const html = await navigator.clipboard.readText();
			if (!html || html.length < 100) {
				errorMsg = 'Clipboard empty or invalid. Copy the page source first.';
				return;
			}
			extractFromHtml(html, lastUrl);
		} catch {
			errorMsg = 'Clipboard access denied. Please allow clipboard permissions.';
		}
	}

	// Parses raw HTML source to extract the user ID, name, and username using regex patterns.
	function extractFromHtml(html: string, url: string) {
		const isInstagram = url.includes('instagram.com');

		let userId: string | null = null;
		let name: string | null = null;
		let username: string | null = null;

		if (isInstagram) {
			const igIdPatterns = [
				/"user_id":"(\d+)"/,
				/"id":"(\d+)"/,
				/"pk":"(\d+)"/,
				/profilePage_(\d+)/,
				/"owner":\{"id":"(\d+)"/
			];
			for (const pattern of igIdPatterns) {
				const match = html.match(pattern);
				if (match) { userId = match[1]; break; }
			}

			const usernameMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
			if (usernameMatch) username = usernameMatch[1];

			const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
			if (ogTitle) name = ogTitle[1].split('(')[0].split('\u2022')[0].trim();
		} else {
			const fbIdPatterns = [
				/(profile_id|entity_id|userID|user_id|owner_id)["']?\s*[:=]\s*["']?(\d{5,20})/
			];
			for (const pattern of fbIdPatterns) {
				const match = html.match(pattern);
				if (match) { userId = match[2]; break; }
			}

			const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
			if (ogMatch) {
				name = ogMatch[1].trim();
			} else {
				const titleMatch = html.match(/<title[^>]*>([^<|]+)/i);
				if (titleMatch) name = titleMatch[1].trim();
			}

			const usernamePatterns = [
				/"vanity":"([^"]+)"/,
				/"username":"([^"]+)"/,
				/entity_vanity":"([^"]+)"/
			];
			for (const pattern of usernamePatterns) {
				const match = html.match(pattern);
				if (match && match[1] && !match[1].match(/^(profile\.php|pages|groups|events)$/)) {
					username = match[1]; break;
				}
			}
		}

		if (!userId) {
			errorMsg = 'Could not find ID in pasted source. Make sure you copied the full page source.';
			return;
		}

		manualExtract = false;
		result = {
			success: true,
			platform: isInstagram ? 'instagram' : 'facebook',
			id: userId,
			name,
			username
		};
	}
</script>

<svelte:head>
	<title>fb2id</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-black text-white font-mono flex flex-col items-center px-4 py-20">
	<div class="w-full max-w-lg animate-fade-in">
		<div class="mb-10">
			<h1 class="text-3xl font-bold tracking-tighter mb-2">
				fb2id<span class="text-zinc-600">_</span>
			</h1>
			<p class="text-zinc-500 text-xs tracking-wide uppercase">
				extract profile ids from facebook & instagram
			</p>
		</div>

		<div class="flex gap-2">
			<div class="relative flex-1">
				<span class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs select-none">
					&gt;
				</span>
				<input
					type="text"
					bind:value={input}
					oninput={handleInput}
					onkeydown={handleKeydown}
					placeholder="url or username"
					class="w-full bg-black border rounded px-4 py-2.5 pl-7 text-sm text-white
						placeholder:text-zinc-700 focus:outline-none transition-all duration-300
						border-zinc-800 focus:border-zinc-400"
				/>
			</div>
			<button
				onclick={extract}
				disabled={loading || !input.trim()}
				class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
					disabled:opacity-30 disabled:hover:border-zinc-800 disabled:hover:bg-transparent
					disabled:hover:text-white disabled:cursor-not-allowed
					rounded px-5 py-2.5 text-sm font-medium transition-all duration-200
					cursor-pointer"
			>
				{#if loading}
					<span class="inline-flex items-center gap-1.5">
						<span class="inline-block w-1 h-1 bg-white rounded-full animate-pulse"></span>
						<span class="inline-block w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.2s]"></span>
						<span class="inline-block w-1 h-1 bg-white rounded-full animate-pulse [animation-delay:0.4s]"></span>
					</span>
				{:else}
					extract
				{/if}
			</button>
		</div>

		{#if showPlatformSelect}
			<div class="mt-3 flex items-center gap-2 animate-fade-in">
				<span class="text-zinc-600 text-xs">platform:</span>
				<button
					onclick={() => extractAs('facebook')}
					class="border border-zinc-800 hover:border-zinc-400 rounded px-3 py-1.5
						text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
				>
					facebook
				</button>
				<button
					onclick={() => extractAs('instagram')}
					class="border border-zinc-800 hover:border-zinc-400 rounded px-3 py-1.5
						text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
				>
					instagram
				</button>
			</div>
		{/if}

		{#if loading}
			<div class="mt-8 animate-fade-in">
				<div class="border border-zinc-800 rounded animate-pulse-border">
					<div class="p-4 space-y-3">
						<div class="h-3 w-32 rounded animate-shimmer"></div>
						<div class="h-3 w-48 rounded animate-shimmer [animation-delay:0.2s]"></div>
						<div class="h-8 w-full rounded animate-shimmer [animation-delay:0.4s]"></div>
					</div>
				</div>
			</div>
		{/if}

		{#if manualExtract}
			<div class="mt-8 border border-red-500/30 rounded animate-fade-in">
				<div class="p-4">
					<p class="text-xs text-red-400 mb-3">
						<span class="text-red-500">err:</span> {errorMsg || 'the platform may be blocking the request'}
					</p>
					<p class="text-xs text-zinc-500 mb-4">if you know the account exists, try manual extraction:</p>
					<div class="flex gap-2 mb-4">
						<button
							onclick={openProfile}
							class="border border-zinc-800 hover:border-zinc-400 rounded px-4 py-2
								text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
						>
							1. open profile
						</button>
						<button
							onclick={pasteAndExtract}
							class="border border-zinc-800 hover:border-zinc-400 rounded px-4 py-2
								text-xs text-zinc-400 hover:text-white transition-all duration-200 cursor-pointer"
						>
							2. paste source
						</button>
					</div>
					<p class="text-[10px] text-zinc-700 leading-relaxed">
						open the profile, press ctrl+u to view source, then ctrl+a, ctrl+c to copy, then click "paste source"
					</p>
				</div>
			</div>
		{/if}

		{#if result}
			<div class="mt-8 animate-slide-up">
				<div class="border border-zinc-800 rounded">
					<div class="px-4 py-3 border-b border-zinc-800">
						<p class="text-xs text-zinc-500 uppercase tracking-widest mb-1">
							{result.platform}
						</p>
						<p class="text-sm font-semibold">{result.name || 'Unknown'}</p>
						{#if result.username}
							<p class="text-xs text-zinc-500 mt-0.5">@{result.username}</p>
						{/if}
					</div>

					<div class="px-4 py-3 border-b border-zinc-800">
						<p class="text-xs text-zinc-500 uppercase tracking-widest mb-2">id</p>
						<div class="flex items-center justify-between">
							<span class="text-sm text-zinc-300 font-medium">{result.id}</span>
							<button
								onclick={copyId}
								class="border border-zinc-800 hover:border-zinc-400 rounded px-3 py-1
									text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider
									transition-all duration-200 cursor-pointer"
							>
								{copyLabel}
							</button>
						</div>
					</div>

					<div class="px-4 py-3">
						<p class="text-xs text-zinc-500 uppercase tracking-widest mb-2">links</p>
						<div class="grid grid-cols-3 gap-2">
							{#if result.platform === 'instagram'}
								<a
									href="https://www.instagram.com/{result.username || result.id}"
									target="_blank"
									rel="noopener noreferrer"
									class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
										rounded px-3 py-2 text-xs text-center transition-all duration-200"
								>instagram</a>
								{#if result.username}
									<a
										href="https://www.threads.com/@{result.username}"
										target="_blank"
										rel="noopener noreferrer"
										class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
											rounded px-3 py-2 text-xs text-center transition-all duration-200"
									>threads</a>
								{:else}
									<span class="border border-zinc-900 rounded px-3 py-2 text-xs text-center text-zinc-700 cursor-not-allowed">
										threads
									</span>
								{/if}
								<a
									href="https://web.archive.org/web/https://www.instagram.com/{result.username || result.id}"
									target="_blank"
									rel="noopener noreferrer"
									class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
										rounded px-3 py-2 text-xs text-center transition-all duration-200"
								>wayback</a>
							{:else}
								<a
									href="https://www.facebook.com/profile.php?id={result.id}"
									target="_blank"
									rel="noopener noreferrer"
									class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
										rounded px-3 py-2 text-xs text-center transition-all duration-200"
								>facebook</a>
								<a
									href="https://www.facebook.com/marketplace/profile/{result.id}"
									target="_blank"
									rel="noopener noreferrer"
									class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
										rounded px-3 py-2 text-xs text-center transition-all duration-200"
								>marketplace</a>
								<a
									href="https://web.archive.org/web/https://www.facebook.com/profile.php?id={result.id}"
									target="_blank"
									rel="noopener noreferrer"
									class="border border-zinc-800 hover:border-white hover:bg-white hover:text-black
										rounded px-3 py-2 text-xs text-center transition-all duration-200"
								>wayback</a>
							{/if}
						</div>
					</div>

				</div>
			</div>
		{/if}

		<div class="mt-16 pt-8 border-t border-zinc-900">
			<p class="text-[10px] text-zinc-700 tracking-wide">
				fetches profile pages and extracts embedded user ids via regex pattern matching
			</p>
		</div>
	</div>
</div>
