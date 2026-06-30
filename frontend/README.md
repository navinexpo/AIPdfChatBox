# Docked — AI Document Chat (Frontend)

A local-first AI chat interface for asking questions of PDFs, SOPs, DOCX and
Markdown documents. Built for SaaS, HR, and legal teams who need answers
grounded in their own documents — no OpenAI, no cloud dependency.

This repository is the **frontend only**. It runs against an in-memory mock
API out of the box so you can develop and demo the UI with zero backend.
See `BACKEND_IMPLEMENTATION_GUIDE.md` for the complete spec of the FastAPI
backend this is designed to plug into.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · shadcn/ui (Radix primitives) ·
TanStack Query · React Hook Form · Zod · Zustand

## Getting started

```bash
npm install
npm run dev
```

The app opens directly to the single-page chat interface — no login, no
routing. A local anonymous user ID is generated on first visit and stored in
`localStorage`.

## Connecting to the real backend

By default `VITE_USE_MOCK_API=true`, so all documents/chats live in memory
and reset on refresh. Once the FastAPI backend (see the implementation
guide) is running:

1. Copy `.env.example` to `.env`
2. Set `VITE_USE_MOCK_API=false`
3. Set `VITE_API_BASE_URL` if the backend isn't proxied at `/api`
4. `npm run dev`

No other code changes are required — `src/lib/api.ts` is the single seam
between mock and real data.

## Project structure

```
src/
  components/
    layout/      Header, Sidebar, MainLayout
    chat/         ChatArea, ChatMessage, ChatInput
    upload/       UploadZone, FileList
    welcome/      WelcomeSection
    ui/           shadcn primitives (button, card, dialog, etc.)
  hooks/          useLocalUser, useDocuments, useChats, useMediaQuery
  lib/            api.ts (backend contract), mockData.ts, utils.ts, constants.ts
  providers/      ThemeProvider, QueryProvider
  store/          useAppStore (zustand — active chat, selected docs, sidebar)
  types/          shared domain types mirroring the backend schema
```

## Design tokens

Primary brand color `#3A7CA5`. Light theme is the default; dark theme is
available via the header toggle and persisted to `localStorage`. All colors
are defined as HSL CSS variables in `src/index.css` so theme switching is a
single class toggle on `<html>`.

## Scripts

| Command           | Description              |
| ------------------ | ------------------------ |
| `npm run dev`       | Start the dev server     |
| `npm run build`     | Type-check + build       |
| `npm run preview`   | Preview production build |
| `npm run lint`      | Run ESLint               |
