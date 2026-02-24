// Extracts user IDs, names, and usernames from Facebook and Instagram profile pages.
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Fetches the profile page, parses HTML for ID and metadata, and returns JSON.
export const GET: RequestHandler = async ({ url }) => {
	const profileUrl = url.searchParams.get('url');
	if (!profileUrl) {
		return json({ success: false, error: 'No URL provided' });
	}

	try {
		const response = await fetch(profileUrl, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});

		if (!response.ok) {
			return json({ success: false, error: `Platform returned ${response.status}` });
		}

		const html = await response.text();
		const isInstagram = profileUrl.includes('instagram.com');

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

			const usernameMatch = profileUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
			if (usernameMatch) username = usernameMatch[1];

			const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
			if (ogTitle) name = ogTitle[1].split('(')[0].split('\u2022')[0].trim();
		} else {
			const fbIdPatterns = [
				/"profile_owner"\s*:\s*\{\s*"id"\s*:\s*"(\d{5,20})"/,
				/"userVanity"\s*:\s*"[^"]+"\s*,\s*"userID"\s*:\s*"(\d{5,20})"/,
				/fb:\/\/profile\/(\d{5,20})/,
				/profile\.php\?id=(\d{5,20})/
			];
			for (const pattern of fbIdPatterns) {
				const match = html.match(pattern);
				if (match) { userId = match[1]; break; }
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
			return json({ success: false, error: 'ID not found' });
		}

		return json({
			success: true,
			platform: isInstagram ? 'instagram' : 'facebook',
			id: userId,
			name,
			username
		});
	} catch {
		return json({ success: false, error: 'Failed to fetch profile' });
	}
};
