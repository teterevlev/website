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

Prefer a **page bundle** (folder with `index.md` + assets):

```
content/posts/my-topic/
  index.md
  cover.jpg          ← light theme
  cover-dark.jpg     ← dark theme (optional)
  fig1.svg           ← optional figures
  demo.mp4           ← optional video
```

1. Create the folder and put Markdown in `index.md`.
2. Front matter at the **very top**, then a blank line, then content:

```yaml
---
title: "My article title"
date: 2026-09-27
draft: false
image: cover.jpg
summary: "One sentence for the list on the home page."
---
```

3. Under that — normal Markdown (headings, lists, code, images).

### Front matter cheat sheet

| Field | Meaning |
|-------|---------|
| `title` | Title on the page and in the list |
| `date` | Sort date (`YYYY-MM-DD`) |
| `draft: true` | Hidden on production build; visible with `hugo server -D` |
| `draft: false` | Published |
| `summary` | Short blurb on the home page |
| `image` | Cover file in the bundle (usually `cover.jpg`) — used for OG and cards |

### Covers (light / dark)

Put both files in the page bundle:

| File | Theme |
|------|--------|
| `cover.jpg` | Light |
| `cover-dark.jpg` | Dark (optional; if missing, light cover is used) |

At the top of the article body:

````markdown
{{< theme-cover light="cover.jpg" dark="cover-dark.jpg" alt="Short description" >}}
````

The home card and the article switch covers via `[data-theme]`. Do **not** crop covers to 1200×630 for display — keep the full frame. OG still uses `cover.jpg` (light).

### External links → footnotes (not a “References” list)

Do **not** use bare URLs or a numbered `## References` block with `<https://...>`.

Use Hugo/Goldmark footnotes with a **named link**, same as the ROS safety post:

In the text:

```markdown
I use Pydantic AI[^pydantic-ai], and the package is on PyPI[^pypi].
```

At the end of the file (after the last section):

```markdown
[^pydantic-ai]: [Pydantic AI](https://ai.pydantic.dev/) — documentation.
[^pypi]: [`pydantic-ai-escalation`](https://pypi.org/project/pydantic-ai-escalation/) on PyPI.
```

Hugo renders superscript numbers in the body and a footnotes list at the bottom with titled links.

External `http`/`https` links (including those inside footnotes) automatically get `target="_blank"` `rel="noopener noreferrer"` and a small external-link SVG icon (same as OPEN SOURCE on the home page). Relative/internal links stay normal. No extra markup needed — write a normal Markdown link:

```markdown
[Pydantic AI](https://ai.pydantic.dev/)
[About](/about/)
```

### SVG figures (theme-aware)

Inline SVG from the page bundle so fill/stroke pick up CSS variables (light/dark):

````markdown
{{< figure-svg src="fig1-safety-tree.svg" caption="Optional caption." >}}
````

### Video

Page-bundle video with muted autoplay loop:

````markdown
{{< video src="demo.mp4" >}}
````

### Tables → cards

Markdown tables are rendered as stacked cards (first column = title, other columns keep their headers as labels). Prefer a clear first column name (`Node`, `Trigger`, `` `on_configure` ``). Don’t rely on wide multi-column tables fitting the reading width.

### Interactive demos (inline HTML, not iframe)

Put a fragment in the page bundle as `*.html.txt` (Hugo’s security policy blocks `text/html` page resources). Embed with:

````markdown
{{< demo src="safe-stop-demo.html.txt" >}}
````

Used in *When cutting power isn't safe* for `safe-stop-demo.html.txt` and `graded-stop-demo.html.txt`. Demos follow `[data-theme]` from the site chrome (no iframe).

**“try it” marker.** Every interactive demo root (`.ssd` inside `.article-demo`) should include the shared badge as the first child:

```html
<figure class="ssd" …>
  <span class="ssd-tryit" aria-hidden="true">
    <svg class="ssd-tryit-ico" …>…</svg>
    <span class="ssd-tryit-txt">try it</span>
  </span>
  …
</figure>
```

Styles live in `themes/revlev/static/css/blog.css` (not in the demo fragment):

| State | Behaviour |
| --- | --- |
| Idle | Blue pill + soft pulse; demo has a blue border |
| Hover / focus inside the demo | Border returns to the normal mist stroke; badge collapses to the hand icon only (label slides away, icon stays put) |
| Hover the badge itself | Label expands again |
| `.ssd-btn` present | Stronger pulse (choice / action moment) |

Copy the badge markup from an existing demo; don’t re-style it per fragment.

### Other images in a post

Same bundle: `![alt](photo.jpg)`. Or under `static/`: `![alt](/img/photo.jpg)`.

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
    _index.md          ← home page
    about.md           ← /about/
    posts/
      my-topic/        ← page bundle (preferred)
        index.md
        cover.jpg
        cover-dark.jpg
  data/author.yaml     ← author bento / about / cards
  themes/revlev/       ← look & feel
  static/              ← favicon, default og.jpg (1200×630 for social) + og.png source
  hugo.toml
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
