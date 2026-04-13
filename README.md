# ScholarSync

ScholarSync is an advanced research paper discovery and management tool designed to streamline the academic literature review process. Powered by the **Semantic Scholar Graph API** and **Google's Gemini 2.0 Flash**, it offers a seamless blend of traditional search and AI-driven discovery.

## 🚀 Key Features

- **Intelligent Discovery**: Search millions of academic papers with real-time results from Semantic Scholar.
- **Progressive Research Graph**: Visualize research connections with an interactive, pannable, and zoomable graph powered by **React Flow**. Build your map progressively by clicking "Related" on any node.
- **AI-Powered Fallback**: Built-in resilience with **Gemini 2.0 Flash**. If Semantic Scholar hits rate limits, Gemini automatically takes over to find relevant papers and recommendations.
- **Personal Library**: Create custom readlists and save papers locally for easy access later.
- **Deep Context**: View abstracts, venues, and open-access status at a glance.

## 🛠 Tech Stack

- **Frontend**: [Next.js 16](https://nextjs.org/) + [React 19](https://reactjs.org/)
- **Backend**: [Spring Boot 3.4](https://spring.io/projects/spring-boot) + Java 17
- **Database**: PostgreSQL 15
- **Authentication**: JWT via HTTP-only cookies
- **Graph Visualization**: [@xyflow/react](https://reactflow.dev/)
- **AI/ML**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.0 Flash)
- **API**: [Semantic Scholar Graph API](https://api.semanticscholar.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)

## 📁 Project Structure

```
scholarsync/
├── scholarsync-frontend/     # Next.js 16 application (port 6969)
├── scholarsync-backend/   # Spring Boot API (port 8080)
└── docker-compose.yml  # Database services
```

## 🏃 Run Locally

### Prerequisites

- Node.js 20+
- Java 17+
- PostgreSQL 15+
- pnpm

### 1. Start Database (Optional - if not using Docker Compose)

```bash
docker-compose up -d
```

### 2. Start Backend

```bash
cd scholarsync-backend
cp .env.example .env.development.local
./gradlew bootRun
```

The backend runs on `http://localhost:8080`.

### 3. Start Frontend

```bash
cd scholarsync-frontend
cp .env.example .env.local  # Configure NEXT_PUBLIC_GEMINI_API_KEY
pnpm install
pnpm dev
```

The frontend runs on `http://localhost:6969`.

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_GEMINI_API_KEY=...
API_BASE_URL=http://localhost:8080
```

### Backend (.env.development.local)

```env
DATABASE_URL=jdbc:postgresql://localhost:5432/scholarsync
DATABASE_USERNAME=scholarsync
DATABASE_PASSWORD=...
JWT_SECRET=...
SEMANTIC_SCHOLAR_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|------------|
| POST | /api/auth/signup | Register new user |
| POST | /api/auth/signin | Sign in user |
| POST | /api/auth/refresh | Refresh token |
| POST | /api/auth/signout | Sign out |
| GET | /api/auth/me | Get current user |
| GET | /api/reading-lists | List user's reading lists |
| POST | /api/reading-lists | Create reading list |
| GET | /api/papers/search | Search papers |
| GET | /api/papers/{id} | Get paper details |

## 📈 Using the Research Graph

1. Search for a topic in the main interface.
2. Click the **"Related"** button on any paper card.
3. You will be navigated to the **Research Graph** view.
4. Drag to pan, scroll to zoom.
5. Click **"Related"** on any node in the graph to discover deeper connections and expand your research map progressively.

## 🐳 Docker Compose

The root `docker-compose.yml` starts only the PostgreSQL database:

```bash
docker-compose up -d
```

For full-stack deployment with backend, see `scholarsync-backend/docker-compose.yml`.