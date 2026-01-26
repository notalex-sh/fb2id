# fb2id

Extract user IDs from Facebook and Instagram profile URLs.

## How it works

Profile pages contain embedded metadata in their HTML source, including the numeric user ID. This tool fetches the profile page and uses regex patterns to extract:

**Facebook:**
- `profile_id`, `entity_id`, `userID`, `user_id`, `owner_id`

**Instagram:**
- `user_id`, `id`, `pk`, `profilePage_`, `owner.id`

Also extracts name, username, and profile photo from `og:` meta tags.

## Links generated

**Facebook profiles:**
- Direct profile link (`facebook.com/profile.php?id=...`)
- Threads profile (if username found)
- Wayback Machine archive

**Instagram profiles:**
- Instagram profile 
- Threads profile (`threads.com/@[instagram username]`)
- Wayback Machine archive

## Finding profiles

If you don't have a profile URL, try:

| Tool | Use |
|------|-----|
| [Toolzu](https://toolzu.com/search-instagram-profiles/) | Instagram username search |
| [Inflact](https://inflact.com/tools/instagram-search/) | Instagram search |
| [WhatsMyName](https://whatsmyname.app/) | Username OSINT across platforms |
| [FB Public](https://facebook.com/public/) | Facebook public directory |

**Google dorking:**
```
site:facebook.com "John Smith" "New York"
site:instagram.com "username"
```

## Limitations

- Facebook/Instagram may block requests from server IPs
- Profile photo extraction depends on og:image availability
- Username extraction is not always reliable
- Instagram heavily restricts unauthenticated access
