# Research blog (Hugo)

Static blog for **https://research.revlev.org/** — Markdown in, HTML out. No server.

## One-time setup on your Mac

1. Install Hugo:

```bash
brew install hugo
```

2. Check:

```bash
hugo version
```

You want something like `0.128` or newer (Cloudflare Pages will use `HUGO_VERSION`).

## Preview locally

```bash
cd research
hugo server -D
```

Open the URL Hugo prints (usually `http://localhost:1313/`).  
`-D` also shows draft posts (`draft: true`).

Stop with `Ctrl+C`.

## Add a post from your existing `.md` file

1. Copy your file into `content/posts/`. Name it with a short slug, e.g. `content/posts/my-topic.md`.
2. Put this block **at the very top** of the file (front matter). Then leave a blank line and your Markdown:

```yaml
---
title: "My article title"
date: 2026-09-27
draft: false
summary: "One sentence for the list on the home page."
---
```

3. Under that — your normal Markdown (headings, lists, code, images).

### Front matter cheat sheet

| Field | Meaning |
|-------|---------|
| `title` | Title on the page and in the list |
| `date` | Sort date (`YYYY-MM-DD`) |
| `draft: true` | Hidden on production build; visible with `hugo server -D` |
| `draft: false` | Published |
| `summary` | Short blurb on the home page |

### Images in a post

Put images next to the post in a folder, or under `static/`:

- File `static/img/photo.jpg` → in Markdown: `![alt](/img/photo.jpg)`
- Or a “page bundle”: folder `content/posts/my-topic/index.md` + `photo.jpg` → `![alt](photo.jpg)`

## Publish

1. Set `draft: false`.
2. Commit and push to `main` (from the repo root).
3. Cloudflare Pages rebuilds automatically (root directory = `research`).
4. Open `https://research.revlev.org/posts/your-slug/`.

Local production build (optional):

```bash
cd research
hugo --minify
```

Output is in `research/public/` (gitignored).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Post missing on the live site | `draft: true` → set `false` and push |
| 404 on a post URL | Check filename / slug; URL is `/posts/<filename-without-.md>/` |
| Local site looks old | Restart `hugo server -D` |
| Front matter ignored | Must start with `---` on line 1; YAML fields indented correctly |

## Repo layout (what matters)

```
research/
  content/
    _index.md          ← home page text
    posts/
      hello.md         ← example post
      your-post.md     ← your articles go here
  themes/revlev/       ← look & feel (you rarely edit this)
  static/              ← favicon, og.jpg, shared images
  hugo.toml            ← site settings
  README.md            ← this guide
```

## Cloudflare Pages settings

Project **`research`** is already created in the Cloudflare account (`research-9u6.pages.dev`). Custom domain **`research.revlev.org`** is attached (DNS CNAME → pages.dev).

| Setting | Value |
|---------|-------|
| Root directory | `research` |
| Build command | `hugo --minify -b https://research.revlev.org/` |
| Build output directory | `public` |
| Env `HUGO_VERSION` | `0.148.2` (Production + Preview) |
| Custom domain | `research.revlev.org` |

**First deploy:** in the dashboard open the `research` Pages project → **Settings** → **Builds & deployments** → **Connect to Git** → repo `teterevlev/website`, then push `research/` to `main`. Or use **Upload assets** once for a manual deploy of `research/public/`.
