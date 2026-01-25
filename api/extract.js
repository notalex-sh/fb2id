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

    const idRegex = /(profile_id|entity_id|userID|user_id|owner_id)["']?\s*[:=]\s*["']?(\d{5,20})/;
    const idMatch = html.match(idRegex);

    if (!idMatch) {
      return res.json({ success: false, error: 'ID not found' });
    }

    const userId = idMatch[2];

    let name = null;
    const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
    if (ogMatch) {
      name = ogMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<|]+)/i);
      if (titleMatch) name = titleMatch[1].trim();
    }

    let username = null;
    const usernamePatterns = [
      /"vanity":"([^"]+)"/,
      /"username":"([^"]+)"/,
      /entity_vanity":"([^"]+)"/,
      /"uri":"https?:\/\/www\.facebook\.com\/([a-zA-Z0-9._]+)"/,
      /facebook\.com\/([a-zA-Z][a-zA-Z0-9._]{4,})["'\s?]/
    ];
    for (const pattern of usernamePatterns) {
      const match = html.match(pattern);
      if (match && match[1] && !match[1].match(/^(profile\.php|pages|groups|events|photo|video|watch|stories|reel)$/)) {
        username = match[1];
        break;
      }
    }

    let profilePhoto = null;
    const photoPatterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i,
      /<meta[^>]*content=["']([^"']+)[^>]*property=["']og:image["']/i,
      /"profilePicLarge"[^}]*"uri":"([^"]+)"/,
      /"profilePic[^"]*"[^}]*"uri":"([^"]+)"/
    ];
    for (const pattern of photoPatterns) {
      const match = html.match(pattern);
      if (match) {
        profilePhoto = match[1].replace(/\\u0025/g, '%').replace(/\\\//g, '/').replace(/&amp;/g, '&');
        break;
      }
    }

    return res.json({
      success: true,
      id: userId,
      name,
      username,
      profilePhoto,
      profile: `https://www.facebook.com/profile.php?id=${userId}`,
      marketplace: `https://www.facebook.com/marketplace/profile/${userId}`
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
};
