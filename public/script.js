let lastUrl = '';

function copy(text, btn) {
  navigator.clipboard.writeText(text);
  const originalText = btn.textContent;
  btn.textContent = 'Copied';
  setTimeout(() => btn.textContent = originalText, 1000);
}

function isUrl(str) {
  return str.startsWith('http') || str.includes('.com/') || str.includes('.net/');
}

function extractAs(platform) {
  const input = document.getElementById('input').value.trim();
  const url = platform === 'facebook'
    ? `https://www.facebook.com/${input}`
    : `https://www.instagram.com/${input}`;
  document.getElementById('platform-select').classList.add('hidden');
  doExtract(url);
}

async function extract() {
  const input = document.getElementById('input').value.trim();
  if (!input) return;

  if (!isUrl(input)) {
    document.getElementById('platform-select').classList.remove('hidden');
    return;
  }

  document.getElementById('platform-select').classList.add('hidden');
  doExtract(input);
}

function openViewSource() {
  if (lastUrl) {
    window.open('view-source:' + lastUrl, '_blank');
  }
}

async function pasteAndExtract() {
  try {
    const html = await navigator.clipboard.readText();
    if (!html || html.length < 100) {
      document.getElementById('result').innerHTML = '<p class="error">Clipboard empty or invalid. Copy the page source first.</p>';
      return;
    }
    extractFromHtml(html, lastUrl);
  } catch (err) {
    document.getElementById('result').innerHTML = '<p class="error">Clipboard access denied. Please allow clipboard permissions.</p>';
  }
}

function extractFromHtml(html, url) {
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
    document.getElementById('result').innerHTML = '<p class="error">Could not find ID in pasted source.</p>';
    return;
  }

  renderResult({
    platform: isInstagram ? 'instagram' : 'facebook',
    id: userId,
    name,
    username,
    profilePhoto
  });
}

function showManualExtract(url, errorMsg = '') {
  lastUrl = url;
  const reason = errorMsg.includes('ID not found')
    ? 'The platform may be serving a limited page to the server.'
    : 'The server may be blocked by the platform.';
  document.getElementById('result').innerHTML = `
    <div class="error-box">
      <p class="error-msg">${reason}</p>
      <p class="error-help">Try extracting manually:</p>
      <div class="manual-buttons">
        <button class="manual-btn" onclick="openViewSource()">1. View Source</button>
        <button class="manual-btn" onclick="pasteAndExtract()">2. Paste from Clipboard</button>
      </div>
      <p class="error-hint">Click "View Source", then Ctrl+A to select all, Ctrl+C to copy, then click "Paste from Clipboard"</p>
    </div>
  `;
}

async function doExtract(url) {
  lastUrl = url;
  document.getElementById('result').innerHTML = '<p class="loading">Extracting profile data...</p>';

  try {
    const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!data.success) {
      showManualExtract(url, data.error || '');
      return;
    }

    renderResult(data);
  } catch (error) {
    showManualExtract(url);
  }
}

function renderResult(data) {
  const photoHtml = data.profilePhoto
    ? `<img src="${data.profilePhoto}" class="full-photo">`
    : `<div class="no-photo">No profile photo available</div>`;

  let buttons = '';

  if (data.platform === 'instagram') {
    const profileUrl = `https://www.instagram.com/${data.username || data.id}`;
    const waybackUrl = `https://web.archive.org/web/${profileUrl}`;
    const threadsBtn = data.username
      ? `<a href="https://www.threads.com/@${data.username}" target="_blank" class="btn">Threads</a>`
      : `<span class="btn disabled">Threads</span>`;
    buttons = `
      <a href="${profileUrl}" target="_blank" class="btn">Instagram</a>
      ${threadsBtn}
      <a href="${waybackUrl}" target="_blank" class="btn">Wayback</a>
    `;
  } else {
    const profileUrl = `https://www.facebook.com/profile.php?id=${data.id}`;
    const marketplaceUrl = `https://www.facebook.com/marketplace/profile/${data.id}`;
    const waybackUrl = `https://web.archive.org/web/${profileUrl}`;
    buttons = `
      <a href="${profileUrl}" target="_blank" class="btn">Facebook</a>
      <a href="${marketplaceUrl}" target="_blank" class="btn">Marketplace</a>
      <a href="${waybackUrl}" target="_blank" class="btn">Wayback</a>
    `;
  }

  const platformLabel = data.platform === 'instagram' ? 'Instagram' : 'Facebook';
  const usernameHtml = data.username ? `<div class="profile-username">@${data.username}</div>` : '';

  document.getElementById('result').innerHTML = `
    <div class="card">
      <div class="info-section">
        <div class="profile-name">${data.name || 'Unknown'}</div>
        ${usernameHtml}
        <div class="meta-grid">
          <div class="meta-row">
            <span class="meta-label">${platformLabel} ID</span>
            <div class="meta-value">
              <span>${data.id}</span>
              <button class="copy-btn" onclick="copy('${data.id}', this)">Copy</button>
            </div>
          </div>
        </div>
      </div>
      <div class="buttons">${buttons}</div>
      <div class="photos-section">
        <div class="section-label">Profile Photo</div>
        ${photoHtml}
      </div>
    </div>
  `;
}
