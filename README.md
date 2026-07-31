# ✦ luana.dev

![License](https://img.shields.io/github/license/lluanaa/blog)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=white)

my personal blog, where I write about things I've actually dealt with at work - bugs, architectural decisions, tools I've learned, and the occasional existential dev crisis.

live at **[luana.dev](https://lluana.com/)**

---

## stack

- **React 18** + **TypeScript**
- **Vite** - build tool
- **React Router v6** - client-side routing
- **i18next** - pt-BR / EN internationalization
- **highlight.js** - syntax highlighting
- **Giscus** - comments via GitHub Discussions
- **Netlify** - hosting + SPA redirects

## features

- fully bilingual (pt-BR and EN)
- syntax highlighted code blocks with copy button
- comments powered by GitHub Discussions
- guestbook
- responsive design

## structure

```
src/
├── components/       # Navbar, PostCard, Comments, Sidebar, StatusBar
├── pages/            # Home, Posts, PostDetail, About, Guestbook, NotFound
├── data/
│   └── posts.ts      # all posts content
├── locales/
│   ├── en/
│   └── pt-BR/
└── global.css
```

## running locally

```bash
npm install
cp .env.example .env   # fill in your Giscus config
npm run dev
```

## comments setup

comments use [Giscus](https://giscus.app), which stores discussions in this repo's GitHub Discussions tab.

to configure:
1. enable Discussions in this repo's settings
2. go to [giscus.app](https://giscus.app) and generate your IDs
3. fill in `.env` with the values from step 2

```env
VITE_GISCUS_REPO=owner/repo
VITE_GISCUS_REPO_ID=
VITE_GISCUS_CATEGORY=General
VITE_GISCUS_CATEGORY_ID=
```

---

made with lots of coffee ✦
