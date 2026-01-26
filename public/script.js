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

async function doExtract(url) {
  document.getElementById('result').innerHTML = '<p class="loading">Extracting profile data...</p>';

  try {
    const response = await fetch(`/api/extract?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (!data.success) {
      document.getElementById('result').innerHTML = `<p class="error">${data.error}</p>`;
      return;
    }

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
  } catch (error) {
    document.getElementById('result').innerHTML = `<p class="error">${error.message}</p>`;
  }
}
