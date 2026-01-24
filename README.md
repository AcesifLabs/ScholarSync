# ScholarStream

ScholarStream is an advanced research paper discovery and management tool designed to streamline the academic literature review process. Powered by the **Semantic Scholar Graph API** and **Google's Gemini 2.0 Flash**, it offers a seamless blend of traditional search and AI-driven discovery.

## 🚀 Key Features

- **Intelligent Discovery**: Search millions of academic papers with real-time results from Semantic Scholar.
- **Progressive Research Graph**: Visualize research connections with an interactive, pannable, and zoomable graph powered by **React Flow**. Build your map progressively by clicking "Related" on any node.
- **AI-Powered Fallback**: Built-in resilience with **Gemini 2.0 Flash**. If Semantic Scholar hits rate limits, Gemini automatically takes over to find relevant papers and recommendations.
- **Personal Library**: Create custom readlists and save papers locally for easy access later.
- **Deep Context**: View abstracts, venues, and open-access status at a glance.

## 🛠 Tech Stack

- **Framework**: [Vite](https://vitejs.dev/) + [React 19](https://reactjs.org/)
- **AI/ML**: [@google/genai](https://www.npmjs.com/package/@google/genai) (Gemini 2.0 Flash)
- **Graph Visualization**: [@xyflow/react](https://reactflow.dev/)
- **API**: [Semantic Scholar Graph API](https://api.semanticscholar.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🏃 Run Locally

**Prerequisites:** Node.js (v18+)

1. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

2. **Configure Environment:**
   Create or edit `.env.local` and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_key_here
   SEMANTIC_SCHOLAR_API_KEY=your_semantic_scholar_key_here
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

## 📈 Using the Research Graph

1. Search for a topic in the main interface.
2. Click the **"Related"** button on any paper card.
3. You will be navigated to the **Research Graph** view.
4. Drag to pan, scroll to zoom.
5. Click **"Related"** on any node in the graph to discover deeper connections and expand your research map progressively.
