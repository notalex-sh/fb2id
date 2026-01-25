# fb2id

Extract Facebook user IDs and profile data from profile URLs.

## How it works

Facebook profile pages contain embedded metadata in their HTML source, including the numeric user ID. This tool fetches the profile page and uses regex patterns to extract:

- **User ID** - Found in variables like `profile_id`, `entity_id`, `userID`
- **Name** - From `og:title` meta tag or page title
- **Username** - From `vanity` or `username` fields in page data
- **Profile Photo** - From `og:image` meta tag

## The Marketplace technique

Facebook's Marketplace profile URLs use the numeric user ID directly:

```
https://www.facebook.com/marketplace/profile/{USER_ID}
```

This means once you have someone's ID, you can view their Marketplace listings even if their main profile uses a custom username. The Marketplace profile often reveals:

- Items they're selling
- Location (general area)
- Profile photo and name
- Join date for Marketplace

## Usage

**Profile URL mode:** Paste any Facebook profile URL to extract the user ID and generate direct links.

**Public Name Search:** Search Facebook's public directory by name (opens `facebook.com/public/First-Last`).

## Limitations

- Facebook may block requests from server IPs
- Profile photo extraction depends on og:image availability
- Username extraction is not always reliable