# Personal site

Existing Home, Case studies, and Blog pages keep their current layout. Stories live as JSON in `src/content/work/` and `src/content/blog/`. Astro builds a standalone page for each one at `work/<slug>/` and `blog/<slug>/`.

## Write

```bash
npm install
npm run dev
```

Open `/author/` (Save Draft and Publish write files on that local server). Then commit and push; GitHub Actions publishes the built site.

Drafts stay out of the public listings until you Publish.
