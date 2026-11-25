# Techno Fact — auto-publishing instructions

These are the standing instructions for the scheduled task that publishes one article to
Techno Fact (تكنو فاكت) per run. The run's own message says which **category** to write.
The site owner asked for fully automatic publishing (no review), so quality and accuracy are on you.

## 1. Get ready
1. Work in a clone of `alzbymndhr7-lab/technofact1` (branch `main`). Pull the latest first.
2. Read `automation/history.json` (newest first) and `data/posts.json` so you never repeat a topic.
3. Make a scratch folder `automation/tmp/` (it is git-ignored).

## 2. Pick the topic by category
- **security** — how to protect your account on ONE social network or popular app per article.
  Rotate through this list in order, skipping any whose `topic` appears in the last 20 security
  entries of history; when all are used, start again with a different angle (e.g. "recover a hacked
  account", "privacy settings", "spot fake messages"):
  facebook, instagram, whatsapp, tiktok, snapchat, x (twitter), telegram, youtube, gmail, linkedin,
  messenger, discord, apple-id, microsoft-account, google-account, paypal, steam, threads, signal, outlook.
  Use `topic` = the list key. Steps must match the app's CURRENT menus: check the platform's official
  help pages with WebSearch/WebFetch before writing; if you cannot confirm a menu path, describe it
  generally instead of inventing one.
- **news** — the most important technology news of the last 24–48 hours that is not already covered
  on the site. Search the web (several searches), open the original sources, and write an explainer:
  what happened, why it matters to an Arab reader, what to do about it. Never invent facts, numbers,
  quotes or dates. End with a `## المصادر` section listing the links you actually opened.
  `topic` = a short latin key for the story (e.g. `ios-27-release`).
- **pick** — your own suggestion: a practical, evergreen tech topic useful to Arab readers (apps,
  phone/PC tips, programming basics, AI tools, internet safety, productivity). Not a repeat of any
  title in history or posts. `topic` = a short latin key.

## 3. Write the article (Arabic)
- 900–1400 words, Modern Standard Arabic, clear and friendly, for non-experts.
- Markdown only: start with a 2–3 sentence intro paragraph (NO `#` title line — the site shows the
  title), then `##` sections, numbered steps / bullet lists where useful, **bold** for key actions,
  and a short closing section. No emoji, no filler, no fake statistics.
- Title: specific and attractive, ≤ 65 characters. Excerpt: one sentence, ≤ 160 characters.
- Slug: short lowercase English with dashes (e.g. `protect-instagram-account`).
- Tags: 2–4 lowercase latin tags.
- Never copy text from sources; write in your own words (quotes under 15 words, max one per source).

### Link to the site's free tools
End every **security** article (and any other article where it fits naturally) with a short section
`## أدوات مجانية تساعدك` listing 1–2 of these tools as Markdown links with one line each — pick the ones
that match the article (passwords → checker + generator; phishing/messages/links → link checker):
- [فاحص قوة كلمة السر](https://alzbymndhr7-lab.github.io/technofact1/tools/password-checker/) — اعرف كم يحتاج المخترق لتخمين كلمة سرك.
- [مولّد كلمات السر القوية](https://alzbymndhr7-lab.github.io/technofact1/tools/password-generator/) — كلمة سر قوية وعشوائية بضغطة زر.
- [هل هذا الرابط مشبوه؟](https://alzbymndhr7-lab.github.io/technofact1/tools/link-checker/) — افحص أي رابط قبل أن تضغط عليه.
Also, where the article tells the reader to choose a strong password or warns about suspicious links,
you may link the relevant tool inline once. Never invent other tool URLs.

## 4. Publish
1. Write the body to `automation/tmp/body.md` and the spec to `automation/tmp/post.json`:
   ```json
   {"slug":"protect-instagram-account","title":"...","excerpt":"...","tags":["instagram","security"],
    "category":"security","topic":"instagram","body_file":"automation/tmp/body.md",
    "cover":{"kicker":"أمان حساباتك","icon":"shield","label":"إنستغرام","subtitle":"اختياري: سطر قصير"}}
   ```
   Cover `icon` options: shield key lock eye phone chat user globe chip robot code bolt wifi cloud bug
   gamepad camera laptop sparkle. `label` = the app/platform name in Arabic (security), else omit.
   Never use logos or brand artwork — the cover is generated from text and icons only.
2. Run `node automation/publish.mjs automation/tmp/post.json` from the repo root.
   If `playwright` or `sharp` is missing: `npm i --no-save playwright sharp` then
   `npx playwright install chromium`, and rerun.
3. Look at the generated cover (convert the .webp to .png and view it) — text must be readable and
   not cut off; if it is, shorten the title and rerun after `git checkout -- . && git clean -fd -e automation/tmp`.
4. Commit everything except `automation/tmp/` with message `Add post: <slug> [auto]` and push to `main`.
   On a rejected push: `git pull --rebase` and push again (max 3 tries).
5. Report: title, category, the post URL `https://alzbymndhr7-lab.github.io/technofact1/p/<slug>/`.

## Never
- Never edit `admin.html`, `index.html`, `data/settings.json` or other posts.
- Never publish anything that gives hacking/attack instructions — only defence and safety.
- Never publish if the article is unfinished or you could not verify a news story: skip the run and say why.
