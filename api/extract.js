const axios = require('axios');

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.json({ success: false, error: 'No URL provided' });
  }

  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = response.data;

    const isInstagram = url.includes('instagram.com');

    let userId = null;
    let name = null;
    let username = null;
    let profilePhoto = null;

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
        if (match) {
          userId = match[1];
          break;
        }
      }

      const usernameMatch = url.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (usernameMatch) username = usernameMatch[1];

      const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
      if (ogTitle) name = ogTitle[1].split('(')[0].split('•')[0].trim();

      const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i);
      if (ogImage) profilePhoto = ogImage[1].replace(/&amp;/g, '&');

    } else {
      const fbIdPatterns = [
        /(profile_id|entity_id|userID|user_id|owner_id)["']?\s*[:=]\s*["']?(\d{5,20})/
      ];
      for (const pattern of fbIdPatterns) {
        const match = html.match(pattern);
        if (match) {
          userId = match[2];
          break;
        }
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
          username = match[1];
          break;
        }
      }

      const photoPatterns = [
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i,
        /<meta[^>]*content=["']([^"']+)[^>]*property=["']og:image["']/i
      ];
      for (const pattern of photoPatterns) {
        const match = html.match(pattern);
        if (match) {
          profilePhoto = match[1].replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/&amp;/g, '&');
          break;
        }
      }
    }

    if (!userId) {
      return res.json({ success: false, error: 'ID not found' });
    }

    return res.json({
      success: true,
      platform: isInstagram ? 'instagram' : 'facebook',
      id: userId,
      name,
      username,
      profilePhoto
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};
