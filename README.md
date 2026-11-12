# ScholarSync

ScholarSync helps researchers find, organise, read and discuss academic papers. Paper metadata is merged from six free sources whose metadata can be used commercially:
- [OpenAlex](https://openalex.org)
- [Crossref](https://www.crossref.org)
- [Europe PMC](https://europepmc.org)
- [arXiv](https://arxiv.org)
- [OpenCitations](https://opencitations.net)
- [Unpaywall](https://unpaywall.org), which is off by default

Each paper is one record per DOI, combining the most informative fields from every source. See `docs/adr/0005-federated-sources-search-cache.md`.

## Features

- **Search**: one query searches OpenAlex, Crossref, Europe PMC and arXiv in parallel and merges the results, with:
  - filters: year range, field of study, venue, minimum citations, open access, paper type;
  - sorting by relevance, citations or recency;
  - title autocomplete.

  Results are cached in Postgres. A repeat search, or a sufficiently similar one by any user, makes no API calls; matching uses exact text, then trigram, then embedding similarity.
- **Library**: save papers and track each one as To read, In progress or Done. The reader remembers the last page you read, and "Continue reading" reopens it there.
- **Collections**: named, ordered reading lists with drag-and-drop ordering, per-paper notes and tags, share-by-link, and BibTeX/Markdown export.
- **Archive**: hide finished collections and papers without deleting them.
- **Researchers**: author search and profiles (papers, citations, h-index).
- **Citation graph**: an interactive network of citing and cited papers, 1–2 hops deep, with click-to-expand and PNG export.
- **PDF reader**: open-access PDFs (proxied by the backend) or your own upload, with coloured highlights, comments, reply threads, resolve, and Markdown export. A PDF can be uploaded only for a paper that has none and that is in your library or in a group where you are a member or above; the uploader can remove it again until someone annotates the paper.
- **Reading groups**: Owner/Admin/Member/Viewer roles, invite links, a shared paper library, threaded Markdown discussion per paper, group annotations (also listed together on the group's Annotations tab), and an activity feed.
- **Notifications**: in-app alerts when you are added to a group, someone replies to you, or a paper is shared with your group.

## Stack

| Part | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TanStack Query, Tailwind CSS 4, shadcn/ui (Base UI), `openapi-fetch` |
| Backend | Spring Boot 4, Java 21, Spring Security (Google OAuth2 + JWT cookie), Flyway, Caffeine cache, LangChain4j ONNX embeddings (all-MiniLM-L6-v2) |
| Data | PostgreSQL 16 with pgvector and pg_trgm (search cache), MinIO (S3-compatible storage for uploaded PDFs) |
| Tests | JUnit 5 + Testcontainers + WireMock (backend end-to-end), Vitest (frontend utilities) |

## Project layout

```
scholarsync-backend/    Spring Boot API on :9000, context path /scholarsync-api
  infra/docker-compose.yml   Postgres + pgvector (:5555) and MinIO (:9100, console :9101)
  src/main/resources/db/migration   Flyway migrations (rollbacks in db/rollback)
scholarsync-frontend/   Next.js app on :6969
docs/adr/               Architecture decisions
CONTEXT.md              Domain glossary
```

## Run locally

Prerequisites: Docker, Java 21, Node.js 22, pnpm (version pinned in `scholarsync-frontend/package.json`).

### 1. Infrastructure

Starting the backend (step 2) runs `infra/docker-compose.yml` for you through Spring Boot's Docker Compose support, and stops the containers when the app exits. Docker must be running. The compose path is resolved from the repo root, so set an IDE run configuration's working directory to the repo root (`./gradlew bootRun` already does this). To run the services on their own:

```bash
cd scholarsync-backend
docker compose -f infra/docker-compose.yml up -d
```

### 2. Backend

```bash
cd scholarsync-backend
cp .env.example .env.dev.local   # fill in the values, see below
./gradlew bootRun
```

Swagger UI: http://localhost:9000/scholarsync-api/swagger-ui.html

| Variable | Notes |
|---|---|
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | `jdbc:postgresql://localhost:5555/scholarsync`, `scholarsync`, `scholarsync_dev_password` with the infra compose |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client. Authorised redirect URI: `http://localhost:9000/scholarsync-api/login/oauth2/code/google` |
| `JWT_SECRET` | At least 32 bytes |
| `JWT_ISSUER_URI`, `JWT_EXPIRATION_MS` | e.g. `http://localhost:9000`, `604800000` (7 days) |
| `JWT_SECURE_COOKIE` | Defaults to `true` (cookie only sent over HTTPS). Set `false` for local HTTP development |
| `FRONTEND_URL` | `http://localhost:6969` (CORS origin and post-login redirect) |
| `OPENALEX_API_KEY` | Free key from https://openalex.org/settings/api. OpenAlex requires one |
| `SOURCES_CONTACT_EMAIL` | A contact address for your deployment. It is sent to Crossref (polite pool `mailto`), Unpaywall (required) and OpenAlex |
| `OPENCITATIONS_API_KEY` | Optional access token from https://opencitations.net/accesstoken |
| `UNPAYWALL_ENABLED` | Defaults to `false`. Set `true` only once you have confirmed Unpaywall's terms for your use |
| `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` | MinIO: `http://localhost:9100`, `scholarsync`, `scholarsync_dev_password`, `scholarsync` |

Flyway applies the schema on startup. Migration V9 needs the `vector` and `pg_trgm` extensions: the compose file uses the `pgvector/pgvector:pg16-trixie` image, and a managed Postgres must allow both.

Search tuning (`search.*`; defaults in `SearchProperties`, override them in `application.yml`):
- results per source (100);
- per-source timeout (8 s);
- cache lifetimes: 7 days, 1 hour for partial results, 30 days for papers;
- similarity thresholds: trigram 0.8, vector 0.95.
- the daily cleanup cron for expired entries, and how often hit counts are written (`search.cache.cleanup-cron`, `hit-flush-interval`).

Each source's rate limit (`external.<source>.min-interval` and `max-concurrent`) is set in `application.yml`; the HTTP timeouts (`external.connect-timeout`, `read-timeout`) default in `ExternalSourcesProperties`.

Every cache lookup logs its layer and best score, which you can use to tune the thresholds.

### 3. Frontend

```bash
cd scholarsync-frontend
cp .env.example .env.local       # NEXT_PUBLIC_API_BASE_URL=http://localhost:9000/scholarsync-api
pnpm install
pnpm dev
```

Open http://localhost:6969.

After changing backend endpoints, regenerate the typed client while the backend runs:

```bash
pnpm generate-types
```

## Tests

```bash
cd scholarsync-backend && ./gradlew test     # needs Docker (Testcontainers)
cd scholarsync-frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI (`.github/workflows/ci.yml`) runs both on every push and pull request to `main`.

## Docker

```bash
docker build -t scholarsync-backend scholarsync-backend
docker run --env-file scholarsync-backend/.env.dev.local -p 9000:9000 scholarsync-backend
```

`.github/workflows/docker.yml` builds the image and pushes it to Docker Hub on `main` and `develop`.
