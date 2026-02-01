# ScholarSync Implementation Plan

## Executive Summary

This document outlines the comprehensive implementation plan for ScholarSync's PostgreSQL database architecture, along with plans for new features, bug fixes, and performance improvements.

---

## 1. PostgreSQL Database Integration

### 1.1 Architecture Overview

**Current State:**
- Data persistence: PostgreSQL with Prisma ORM
- API Layer: RESTful API endpoints + Server Actions
- User management: Session-based authentication (Better Auth)
- Caching: PostgreSQL-based cache table for search results and paper metadata

### 1.2 Database Schema Design

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Papers Table (caches external paper data)
CREATE TABLE papers (
    id VARCHAR(255) PRIMARY KEY,
    title TEXT NOT NULL,
    authors JSONB NOT NULL,
    abstract TEXT,
    year INTEGER,
    source VARCHAR(255),
    pdf_url TEXT,
    is_open_access BOOLEAN DEFAULT false,
    open_access_pdf JSONB,
    venue VARCHAR(255),
    citation_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading Lists Table
CREATE TABLE reading_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reading List Papers (Many-to-Many Junction)
CREATE TABLE reading_list_papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_list_id UUID NOT NULL REFERENCES reading_lists(id) ON DELETE CASCADE,
    paper_id VARCHAR(255) NOT REFERENCES papers(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(reading_list_id, paper_id)
);

-- Search History Table
CREATE TABLE search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    results_count INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Sessions Table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reading_lists_user_id ON reading_lists(user_id);
CREATE INDEX idx_reading_list_papers_list_id ON reading_list_papers(reading_list_id);
CREATE INDEX idx_reading_list_papers_paper_id ON reading_list_papers(paper_id);
CREATE INDEX idx_search_history_user_id ON search_history(user_id);
CREATE INDEX idx_papers_title ON papers USING gin(to_tsvector('english', title));
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
```

### 1.3 Prisma Schema Definition

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  name          String?
  avatarUrl     String?         @map("avatar_url")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")
  
  readingLists  ReadingList[]
  searchHistory SearchHistory[]
  sessions      UserSession[]
  
  @@map("users")
}

model Paper {
  id              String           @id
  title           String
  authors         Json
  abstract        String?
  year            Int?
  source          String?
  pdfUrl          String?          @map("pdf_url")
  isOpenAccess    Boolean          @default(false) @map("is_open_access")
  openAccessPdf   Json?            @map("open_access_pdf")
  venue           String?
  citationCount   Int              @default(0) @map("citation_count")
  createdAt       DateTime         @default(now()) @map("created_at")
  updatedAt       DateTime         @updatedAt @map("updated_at")
  
  readingListPapers ReadingListPaper[]
  
  @@map("papers")
}

model ReadingList {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  name        String
  description String?
  color       String   @default("#3B82F6")
  isDefault   Boolean  @default(false) @map("is_default")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  papers      ReadingListPaper[]
  
  @@index([userId])
  @@map("reading_lists")
}

model ReadingListPaper {
  id            String   @id @default(uuid())
  readingListId String   @map("reading_list_id")
  paperId       String   @map("paper_id")
  addedAt       DateTime @default(now()) @map("added_at")
  notes         String?
  
  readingList   ReadingList @relation(fields: [readingListId], references: [id], onDelete: Cascade)
  paper         Paper       @relation(fields: [paperId], references: [id], onDelete: Cascade)
  
  @@unique([readingListId, paperId])
  @@index([readingListId])
  @@index([paperId])
  @@map("reading_list_papers")
}

model SearchHistory {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  query         String
  resultsCount  Int?     @map("results_count")
  createdAt     DateTime @default(now()) @map("created_at")
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@map("search_history")
}

model UserSession {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  sessionToken  String   @unique @map("session_token")
  expiresAt     DateTime @map("expires_at")
  createdAt     DateTime @default(now()) @map("created_at")
  
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([sessionToken])
  @@map("user_sessions")
}
```

### 1.4 Required Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0",
    "better-auth": "^1.0.0",
    "pg": "^8.11.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/pg": "^8.10.9"
  }
}
```

### 1.5 Environment Configuration

Create/update `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/scholarsync?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-here-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# OAuth Providers (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 1.6 Database API Layer

#### 1.6.1 Prisma Client Setup

```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 1.6.2 Data Access Layer (DAL)

```typescript
// src/lib/db/readingLists.ts
import { prisma } from '@/lib/prisma';
import { Paper, ReadingList } from '@/types';

export async function getUserReadingLists(userId: string): Promise<ReadingList[]> {
  const lists = await prisma.readingList.findMany({
    where: { userId },
    include: {
      papers: {
        include: { paper: true },
        orderBy: { addedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return lists.map(list => ({
    id: list.id,
    name: list.name,
    description: list.description || undefined,
    paperIds: list.papers.map(p => p.paperId),
    createdAt: list.createdAt.getTime(),
    color: list.color
  }));
}

export async function createReadingList(
  userId: string, 
  name: string, 
  color?: string
): Promise<ReadingList> {
  const list = await prisma.readingList.create({
    data: {
      userId,
      name,
      color: color || '#3B82F6'
    }
  });

  return {
    id: list.id,
    name: list.name,
    paperIds: [],
    createdAt: list.createdAt.getTime(),
    color: list.color
  };
}

export async function addPaperToReadingList(
  listId: string,
  paper: Paper
): Promise<void> {
  // Upsert paper first (cache it)
  await prisma.paper.upsert({
    where: { id: paper.id },
    create: {
      id: paper.id,
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      year: paper.year ? parseInt(paper.year) : null,
      source: paper.source,
      pdfUrl: paper.pdfUrl,
      isOpenAccess: paper.isOpenAccess,
      openAccessPdf: paper.openAccessPdf || null
    },
    update: {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      year: paper.year ? parseInt(paper.year) : null,
      source: paper.source,
      pdfUrl: paper.pdfUrl,
      isOpenAccess: paper.isOpenAccess,
      openAccessPdf: paper.openAccessPdf || null
    }
  });

  // Add to reading list
  await prisma.readingListPaper.create({
    data: {
      readingListId: listId,
      paperId: paper.id
    }
  }).catch(() => {
    // Ignore duplicate key errors (paper already in list)
  });
}

export async function removePaperFromReadingList(
  listId: string,
  paperId: string
): Promise<void> {
  await prisma.readingListPaper.deleteMany({
    where: {
      readingListId: listId,
      paperId
    }
  });
}

export async function deleteReadingList(id: string): Promise<void> {
  await prisma.readingList.delete({
    where: { id }
  });
}

export async function renameReadingList(
  id: string,
  newName: string
): Promise<void> {
  await prisma.readingList.update({
    where: { id },
    data: { name: newName }
  });
}

export async function updateReadingListColor(
  id: string,
  color: string
): Promise<void> {
  await prisma.readingList.update({
    where: { id },
    data: { color }
  });
}
```

#### 1.6.3 Server Actions

```typescript
// src/app/api/reading-lists/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import * as readingListDb from '@/lib/db/readingLists';
import { Paper, ReadingList } from '@/types';

export async function getReadingLists(): Promise<{ 
  data?: ReadingList[]; 
  error?: string 
}> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const lists = await readingListDb.getUserReadingLists(session.user.id);
    return { data: lists };
  } catch (error) {
    console.error('Failed to get reading lists:', error);
    return { error: 'Failed to fetch reading lists' };
  }
}

export async function createReadingList(
  name: string,
  color?: string
): Promise<{ data?: ReadingList; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    const list = await readingListDb.createReadingList(
      session.user.id,
      name,
      color
    );
    
    revalidatePath('/');
    return { data: list };
  } catch (error) {
    console.error('Failed to create reading list:', error);
    return { error: 'Failed to create reading list' };
  }
}

export async function addPaperToList(
  listId: string,
  paper: Paper
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.addPaperToReadingList(listId, paper);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add paper to list:', error);
    return { error: 'Failed to add paper to list' };
  }
}

export async function removePaperFromList(
  listId: string,
  paperId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.removePaperFromReadingList(listId, paperId);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove paper from list:', error);
    return { error: 'Failed to remove paper from list' };
  }
}

export async function deleteReadingListAction(
  id: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.deleteReadingList(id);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete reading list:', error);
    return { error: 'Failed to delete reading list' };
  }
}

export async function renameReadingListAction(
  id: string,
  newName: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.renameReadingList(id, newName);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to rename reading list:', error);
    return { error: 'Failed to rename reading list' };
  }
}

export async function updateReadingListColorAction(
  id: string,
  color: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    await readingListDb.updateReadingListColor(id, color);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to update reading list color:', error);
    return { error: 'Failed to update reading list color' };
  }
}
```

#### 1.6.4 REST API Routes

```typescript
// src/app/api/reading-lists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as readingListDb from '@/lib/db/readingLists';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lists = await readingListDb.getUserReadingLists(session.user.id);
    return NextResponse.json({ data: lists });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading lists' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const list = await readingListDb.createReadingList(
      session.user.id,
      name,
      color
    );

    return NextResponse.json({ data: list }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to create reading list' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/reading-lists/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as readingListDb from '@/lib/db/readingLists';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await readingListDb.deleteReadingList(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reading list' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (name) {
      await readingListDb.renameReadingList(params.id, name);
    }

    if (color) {
      await readingListDb.updateReadingListColor(params.id, color);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to update reading list' },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/reading-lists/[id]/papers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as readingListDb from '@/lib/db/readingLists';
import { Paper } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const paper: Paper = await request.json();
    await readingListDb.addPaperToReadingList(params.id, paper);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to add paper to reading list' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json(
        { error: 'paperId is required' },
        { status: 400 }
      );
    }

    await readingListDb.removePaperFromReadingList(params.id, paperId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to remove paper from reading list' },
      { status: 500 }
    );
  }
}
```

### 1.7 Authentication Setup (Better Auth)

Better Auth is a framework-agnostic, universal authentication framework for TypeScript that provides comprehensive features out of the box.

#### Server Configuration

```typescript
// src/lib/auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day - refresh session expiration daily
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
  },
});
```

#### API Route Handler (Next.js App Router)

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
```

#### Client Configuration

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
});

// Export specific methods for convenience
export const { signIn, signUp, signOut, useSession, getSession } = authClient;
```

#### Usage Examples

**Sign In (Email/Password):**
```typescript
const { data, error } = await authClient.signIn.email({
  email: "user@example.com",
  password: "password123",
  callbackURL: "/dashboard",
});
```

**Sign In with Google:**
```typescript
await authClient.signIn.social({
  provider: "google",
  callbackURL: "/dashboard",
});
```

**Sign Out:**
```typescript
await authClient.signOut();
```

**Server-Side Session (Server Actions):**
```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getCurrentSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
```

**Client-Side Session:**
```typescript
// React component
const { data: session, isPending, error } = authClient.useSession();

// Or with async
const { data: session } = await authClient.getSession();
```

#### Protected Routes Middleware

```typescript
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session")?.value;
  
  // Check if user is trying to access protected routes without session
  if (!sessionCookie && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
```

### 1.8 Migration Strategy

#### Phase 1: Setup (Week 1)
1. Install dependencies (`prisma`, `@prisma/client`, `next-auth`, etc.)
2. Initialize Prisma: `npx prisma init`
3. Create schema definitions
4. Set up environment variables
5. Create database: `npx prisma db push`
6. Generate Prisma client: `npx prisma generate`

#### Phase 2: Dual-Write Mode (Week 2)
1. Implement database layer alongside localStorage
2. Create new hooks: `useReadListsDB.ts`
3. Modify `useReadLists.ts` to write to both localStorage AND database
4. Add feature flag: `USE_DATABASE_STORAGE`
5. Test data synchronization

#### Phase 3: Migration Scripts (Week 3)
1. Create data export tool from localStorage
2. Create import script to database
3. Build user-facing migration UI
4. Test migration with sample data

#### Phase 4: Full Cutover (Week 4)
1. Switch `USE_DATABASE_STORAGE` to true by default
2. Implement graceful fallback to localStorage if DB unavailable
3. Remove dual-write logic after stability confirmed
4. Deprecate localStorage persistence (keep as backup only)

### 1.9 Data Migration Script

```typescript
// scripts/migrate-localstorage-to-db.ts
import { prisma } from '@/lib/prisma';
import { Paper, ReadingList } from '@/types';

interface LocalStorageData {
  readLists: ReadingList[];
  papers: Record<string, Paper>;
  activeListId: string | null;
}

export async function migrateUserData(
  userId: string,
  localStorageData: LocalStorageData
): Promise<void> {
  const { readLists, papers } = localStorageData;

  // Start transaction
  await prisma.$transaction(async (tx) => {
    // 1. Migrate papers
    for (const paper of Object.values(papers)) {
      await tx.paper.upsert({
        where: { id: paper.id },
        create: {
          id: paper.id,
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          year: paper.year ? parseInt(paper.year) : null,
          source: paper.source,
          pdfUrl: paper.pdfUrl,
          isOpenAccess: paper.isOpenAccess,
          openAccessPdf: paper.openAccessPdf || null,
        },
        update: {
          title: paper.title,
          authors: paper.authors,
          abstract: paper.abstract,
          year: paper.year ? parseInt(paper.year) : null,
          source: paper.source,
          pdfUrl: paper.pdfUrl,
          isOpenAccess: paper.isOpenAccess,
          openAccessPdf: paper.openAccessPdf || null,
        },
      });
    }

    // 2. Migrate reading lists
    for (const list of readLists) {
      const createdList = await tx.readingList.create({
        data: {
          userId,
          name: list.name,
          color: list.color || '#3B82F6',
          isDefault: list.id === 'default',
        },
      });

      // 3. Add papers to list
      for (const paperId of list.paperIds) {
        const paper = papers[paperId];
        if (paper) {
          await tx.readingListPaper.create({
            data: {
              readingListId: createdList.id,
              paperId: paper.id,
            },
          });
        }
      }
    }
  });
}
```

---

## 2. API Specifications

### 2.1 Reading Lists API

#### GET /api/reading-lists
**Description:** Get all reading lists for the authenticated user

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Machine Learning Papers",
      "description": "Papers about ML algorithms",
      "paperIds": ["paper-id-1", "paper-id-2"],
      "createdAt": 1704067200000,
      "color": "#3B82F6"
    }
  ]
}
```

#### POST /api/reading-lists
**Description:** Create a new reading list

**Request Body:**
```json
{
  "name": "Computer Vision",
  "color": "#10B981"
}
```

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "Computer Vision",
    "paperIds": [],
    "createdAt": 1704067200000,
    "color": "#10B981"
  }
}
```

**Errors:**
- `400`: Name is required or invalid
- `401`: Unauthorized (no session)
- `500`: Database error

#### DELETE /api/reading-lists/:id
**Description:** Delete a reading list

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `401`: Unauthorized
- `404`: Reading list not found
- `500`: Database error

#### PATCH /api/reading-lists/:id
**Description:** Update reading list (name, color, or both)

**Request Body:**
```json
{
  "name": "Updated Name",
  "color": "#F59E0B"
}
```

**Response:**
```json
{
  "success": true
}
```

#### POST /api/reading-lists/:id/papers
**Description:** Add a paper to a reading list

**Request Body:**
```json
{
  "id": "semantic-scholar-paper-id",
  "title": "Paper Title",
  "authors": ["Author 1", "Author 2"],
  "abstract": "Paper abstract...",
  "year": "2024",
  "source": "NeurIPS",
  "pdfUrl": "https://arxiv.org/pdf/xxx",
  "isOpenAccess": true
}
```

**Response (201):**
```json
{
  "success": true
}
```

**Errors:**
- `400`: Invalid paper data
- `401`: Unauthorized
- `404`: Reading list not found
- `409`: Paper already in list (conflict)

#### DELETE /api/reading-lists/:id/papers?paperId=:paperId
**Description:** Remove a paper from a reading list

**Response:**
```json
{
  "success": true
}
```

### 2.2 Papers API

#### GET /api/papers/:id
**Description:** Get paper details (cached in DB or fetch from external API)

**Response:**
```json
{
  "data": {
    "id": "paper-id",
    "title": "Title",
    "authors": ["Author 1"],
    "abstract": "Abstract...",
    "year": "2024",
    "source": "Conference",
    "pdfUrl": "https://...",
    "isOpenAccess": true,
    "openAccessPdf": { "url": "https://...", "status": "GREEN" }
  }
}
```

### 2.3 Search History API

#### GET /api/search-history
**Description:** Get user's recent searches

**Query Parameters:**
- `limit`: Number of results (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "query": "machine learning",
      "resultsCount": 24,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/search-history
**Description:** Record a search query

**Request Body:**
```json
{
  "query": "neural networks",
  "resultsCount": 18
}
```

---

## 3. New Features to Add

### 3.1 User Authentication & Profiles

**Feature:** User accounts with Google OAuth
**Priority:** High
**Timeline:** 2 weeks

**Requirements:**
- Google OAuth integration via Better Auth
- User profile page with avatar, name, email
- Session management with cookie-based sessions
- Protected routes middleware

**Implementation Steps:**
1. Set up Better Auth with GoogleProvider
2. Add Sign In button with Google Icon in Sidebar
3. Add middleware for protected routes
4. Create user profile dropdown in header with Sign Out
5. Add avatar component to header

### 3.2 Advanced Reading List Management

**Feature:** Enhanced reading list capabilities
**Priority:** High
**Timeline:** 2 weeks

**Requirements:**
- List descriptions
- Custom colors per list (already supported in schema)
- Drag-and-drop reordering of papers in list
- List sharing (public/private)
- Export list to PDF/CSV
- Import from Zotero/Mendeley

**Implementation Steps:**
1. Add description field to reading list form
2. Implement color picker component
3. Add drag-and-drop using `@dnd-kit/core`
4. Create export utilities (PDF, CSV)
5. Add share modal with public link generation

### 3.3 Paper Notes & Annotations

**Feature:** Personal notes on papers
**Priority:** Medium
**Timeline:** 1 week

**Requirements:**
- Text notes per paper in reading list
- Rich text editor (Markdown support)
- Note search functionality
- Export notes

**Database Changes:**
```sql
ALTER TABLE reading_list_papers ADD COLUMN notes TEXT;
```

**Implementation Steps:**
1. Add notes column to schema
2. Create note editor component
3. Add API endpoint for saving notes
4. Display notes in paper detail modal

### 3.4 Collaborative Features

**Feature:** Share reading lists with other users
**Priority:** Medium
**Timeline:** 2 weeks

**Requirements:**
- Share via email or link
- View-only and edit permissions
- Activity log for shared lists
- Comments on papers within shared lists

**Database Changes:**
```sql
CREATE TABLE reading_list_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reading_list_id UUID REFERENCES reading_lists(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(10) CHECK (permission IN ('view', 'edit')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.5 Search Enhancements

**Feature:** Advanced search capabilities
**Priority:** Medium
**Timeline:** 1 week

**Requirements:**
- Search filters (year, author, venue)
- Saved searches
- Search suggestions
- Recent searches
- Search history visualization

**Implementation Steps:**
1. Add filters UI to search bar
2. Create saved searches table
3. Implement autocomplete/suggestions
4. Add search history page

### 3.6 AI-Powered Features

**Feature:** Enhanced AI integration
**Priority:** Low
**Timeline:** 2 weeks

**Requirements:**
- Paper summarization
- Key findings extraction
- Citation analysis
- Paper recommendations based on reading history
- Reading time estimation

**Implementation Steps:**
1. Create new AI prompts for summarization
2. Add AI service methods
3. Cache AI results in database
4. Display AI insights in paper cards

### 3.7 Data Export/Import

**Feature:** Full data portability
**Priority:** Medium
**Timeline:** 1 week

**Requirements:**
- Export all data (JSON, CSV)
- Import from JSON
- Backup/restore functionality

**Implementation Steps:**
1. Create data export API
2. Build export UI with format selection
3. Create import validation
4. Add backup scheduling (optional)

---

## 4. Bug Fixes Required

### 4.1 Critical Bugs

#### Bug: Search results not persisting correctly on refresh
**File:** `src/hooks/useSearch.ts`
**Issue:** Search state resets on refresh
**Fix:**
```typescript
// Implement search history persistence in DB
```

#### Bug: Duplicate papers can be added to reading list
**File:** `src/hooks/useReadLists.ts`
**Issue:** No duplicate check before adding
**Fix:**
```typescript
// Handled in backend and frontend logic
```

### 4.2 Medium Priority Bugs

#### Bug: PDF viewer fails on certain URLs
**File:** `src/hooks/usePdfViewer.ts`
**Issue:** CORS errors with some PDF URLs
**Fix:** Add fallback to external viewer and error handling

#### Bug: Graph visualization performance issues with large datasets
**File:** `src/hooks/useRelatedPapersGraph.ts`
**Issue:** No node limit causes browser freeze
**Fix:** Add virtualization or node limit with warning

### 4.3 Low Priority Bugs

#### Bug: Context menu positioning issues on small screens
**Fix:** Add viewport boundary detection

#### Bug: Modal scroll lock not releasing on unmount
**Fix:** Ensure cleanup in `useBodyScrollLock.ts`

#### Bug: Search query special characters not encoded
**Fix:** Properly encodeURIComponent all query parameters

---

## 5. Performance Improvements

### 5.1 Database Optimization & Caching

**Action Items:**
1. Add database indexes (see schema above)
2. Implement connection pooling with PgBouncer
3. Use PostgreSQL cache table for caching search results (TTL: 1 hour)
4. Implement query result pagination with cursor-based pagination

#### PostgreSQL Cache Table Design

```sql
-- Create UNLOGGED cache table for better performance (acceptable for cache data)
CREATE UNLOGGED TABLE cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast expiration lookups
CREATE INDEX idx_cache_expires_at ON cache (expires_at);

-- Optimize for frequent updates
ALTER TABLE cache SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);
```

**Caching Layer Implementation:**

```typescript
// src/lib/db/cache.ts
import { prisma } from '@/lib/prisma';

export async function getCached<T>(key: string): Promise<T | null> {
  const result = await prisma.$queryRaw<{ value: T }[]>`
    SELECT value FROM cache 
    WHERE key = ${key} 
    AND expires_at > NOW()
  `;
  
  return result.length > 0 ? result[0].value : null;
}

export async function setCache<T>(
  key: string, 
  value: T, 
  ttlSeconds: number = 3600
): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO cache (key, value, expires_at)
    VALUES (
      ${key},
      ${JSON.stringify(value)}::jsonb,
      NOW() + INTERVAL '1 second' * ${ttlSeconds}
    )
    ON CONFLICT (key)
    DO UPDATE SET
      value = EXCLUDED.value,
      expires_at = EXCLUDED.expires_at
  `;
}

export async function deleteCache(key: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM cache WHERE key = ${key}`;
}

export async function cleanupExpiredCache(): Promise<number> {
  const result = await prisma.$executeRaw`
    DELETE FROM cache WHERE expires_at <= NOW()
  `;
  return result;
}
```

**Usage Example:**

```typescript
// src/lib/db/cacheQueries.ts
import { getCached, setCache } from './cache';
import { Paper } from '@/types';

export async function getCachedSearch(
  query: string, 
  page: number
): Promise<Paper[] | null> {
  const cacheKey = `search:${query}:${page}`;
  return getCached<Paper[]>(cacheKey);
}

export async function setCachedSearch(
  query: string, 
  page: number, 
  papers: Paper[],
  ttlMinutes: number = 60
): Promise<void> {
  const cacheKey = `search:${query}:${page}`;
  await setCache(cacheKey, papers, ttlMinutes * 60);
}
```

**Cache Stampede Protection:**

```typescript
// src/lib/db/cacheWithLock.ts
import { prisma } from '@/lib/prisma';

export async function getOrSetWithLock<T>(
  key: string,
  compute: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // Check cache first
  const cached = await getCached<T>(key);
  if (cached !== null) return cached;
  
  // Try to acquire advisory lock to prevent stampede
  const lockId = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const lockResult = await prisma.$queryRaw<{ pg_try_advisory_lock: boolean }[]>`
    SELECT pg_try_advisory_lock(${lockId})
  `;
  
  if (!lockResult[0].pg_try_advisory_lock) {
    // Another process is computing, wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getOrSetWithLock(key, compute, ttlSeconds);
  }
  
  try {
    // Double-check cache after acquiring lock
    const cachedAfterLock = await getCached<T>(key);
    if (cachedAfterLock !== null) return cachedAfterLock;
    
    // Compute and cache
    const result = await compute();
    await setCache(key, result, ttlSeconds);
    return result;
  } finally {
    // Release lock
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${lockId})`;
  }
}
```

**Automated Cleanup Job:**

```typescript
// scripts/cleanup-cache.ts or use pg_cron extension
import { cleanupExpiredCache } from '@/lib/db/cache';

// Run this every minute via cron job or background worker
export async function runCacheCleanup(): Promise<void> {
  const deleted = await cleanupExpiredCache();
  console.log(`Cleaned up ${deleted} expired cache entries`);
}
```

---

## 7. Implementation Timeline

### Week 1-2: Database Foundation
- [x] Set up PostgreSQL database
- [x] Create Prisma schema
- [x] Implement database layer (DAL)
- [x] Set up Better Auth
- [x] Create basic API routes

### Week 3-4: Migration & Cleanup
- [x] Implement database-backed hooks
- [x] Remove localStorage persistence
- [x] Add feature flags

### Week 5-6: Authentication & User Features
- [x] Add Sign In with Google button in Header
- [x] Build user profile dropdown and Sign Out logic
- [x] Implement protected routes
- [x] Add user avatar component

### Week 7-8: Enhanced Reading Lists
- [ ] Add list descriptions
- [ ] Implement color picker
- [ ] Add drag-and-drop reordering
- [ ] Create export functionality (PDF/CSV)
- [ ] Add share modal

### Week 9-10: Advanced Features
- [ ] Implement paper notes
- [ ] Add search filters
- [ ] Create search history page
- [ ] Add collaborative features
- [ ] Implement AI enhancements

### Week 11-12: Bug Fixes & Optimization
- [ ] Fix critical bugs
- [ ] Implement PostgreSQL caching layer
- [ ] Add virtual scrolling
- [ ] Optimize API performance

### Week 13: Final Testing & Deployment
- [ ] Performance validation
- [ ] Security audit
- [ ] Documentation updates
- [ ] Production deployment

---

## 8. Deployment Checklist

### Pre-Deployment
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Backup strategy in place
- [ ] Monitoring tools configured (Sentry, LogRocket)

### Database
- [ ] PostgreSQL instance provisioned
- [ ] Connection pooling configured
- [ ] Automated backups enabled
- [ ] Read replicas configured (if needed)

### Security
- [ ] Row-level security policies applied
- [ ] Rate limiting configured
- [ ] CORS settings validated
- [ ] Input sanitization verified
- [ ] SQL injection prevention tested

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Database query monitoring
- [ ] Uptime monitoring
- [ ] User analytics

---

## 9. Risk Mitigation

### Risk: Data Loss During Migration
**Mitigation:**
- Automated backup before migration
- Test rollback procedures
- Provide user-facing export feature

### Risk: Database Performance Issues
**Mitigation:**
- Implement PostgreSQL-based caching layer
- Add database connection pooling
- Use read replicas for queries (if needed)
- Implement query result pagination
- Add database monitoring and query optimization

### Risk: Authentication Failures
**Mitigation:**
- Comprehensive error handling
- Session refresh mechanisms

### Risk: API Rate Limiting
**Mitigation:**
- Implement request queuing
- Add client-side rate limiting
- Use exponential backoff
- Cache external API responses

---

## 10. Success Metrics

### Performance Metrics
- Page load time: < 2 seconds
- API response time: < 500ms (p95)
- Search results: < 1 second
- Database query time: < 100ms (p95)

### User Experience Metrics
- 99.9% uptime
- < 0.1% error rate
- User retention > 80%

### Technical Metrics
- Zero security vulnerabilities
- < 100ms time to first byte
- 95+ Lighthouse performance score

---

## 11. Appendix

### A. Database Connection String Examples

**Development:**
```
postgresql://localhost:5432/scholarsync?schema=public
```

**Production:**
```
postgresql://user:password@prod-db-host:5432/scholarsync?schema=public&connection_limit=20
```

### B. Environment Variable Template

```bash
# Required
DATABASE_URL=
BETTER_AUTH_URL=
BETTER_AUTH_SECRET=

# OAuth (at least one required)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional
SENTRY_DSN=
```

### C. Useful Commands

```bash
# Database
npx prisma migrate dev          # Create migration
npx prisma db push              # Push schema changes
npx prisma studio               # Open Prisma Studio
npx prisma generate             # Generate client

# Better Auth
npx @better-auth/cli generate   # Generate auth schema
npx @better-auth/cli migrate    # Run auth migrations

# Development
npm run dev                     # Start dev server
npm run lint                    # Run ESLint
npm run build                   # Production build
```

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Owner:** Engineering Team  
**Review Schedule:** Weekly during implementation
