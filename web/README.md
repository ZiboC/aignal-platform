# Aignal Web

Static Next.js dashboard for the Aignal feed.

## Local Development

From the repository root:

```sh
npm install --prefix web
npm run sync-web-assets
npm --prefix web run dev
```

For a production-style static build:

```sh
npm run build-web
```

The web app reads generated feed data from `web/public/feed` and images from `web/public/images`. Those folders are synchronized from the repository root `public/` folder and are intentionally not committed.
