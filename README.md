# UMAR AI — Gemini + Modrinth API

## Deploy the backend

1. Import this GitHub repository into Vercel: https://vercel.com/new
2. Keep the project root as `./` and deploy. Vercel detects `api/search.js` automatically.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `GEMINI_API_KEY` = your Google AI Studio API key (secret; never put it in `index.html`).
   - `GEMINI_MODEL` = `gemini-2.5-flash` (optional).
   - `ALLOWED_ORIGIN` = `https://zvosrg2012-cyber.github.io` (recommended; allows the GitHub Pages site origin).
4. Redeploy after adding variables.
5. Copy the deployed API base URL, e.g. `https://your-project.vercel.app`, and set `API_URL` in `index.html` to `https://your-project.vercel.app/api/search`.

## API

`POST /api/search` with JSON body `{"query":"моды на драконов для Minecraft"}`. The backend asks Gemini to refine the search phrase and queries the real Modrinth catalog. Returned cards contain title, description, author, icon, downloads, versions and a Modrinth URL.

The API key is read only from Vercel environment variables. Do not commit secrets. Modrinth owns the returned project metadata and links. This endpoint is intended for a small personal project; for public high traffic, add persistent rate limiting and abuse protection.
