# Implementation Setup Checklist

**Status:** Pre-Implementation Setup  
**Date:** November 3, 2025

---

## ✅ Already Complete

- [x] PRDs finalized (SS_Reqs_PRD.md, SS_Architecture_PRD.md)
- [x] Documentation (SCHEMA.md, DECISIONS.md, LIMITATIONS.md)
- [x] Content catalog structure (content/ with 6 examples per persona = 30 total needed)
- [x] Partner offers structure (data/offers/ with 21 offers)
- [x] GitHub repository setup
- [x] Vercel configuration (vercel.json)
- [x] Package.json with scripts (dev, build, test, eval)
- [x] .gitignore

---

## 🔧 Required Setup Before Implementation

### 1. Project Structure
Create the folder structure as specified in Architecture PRD:

```
backend/
  src/
    server.ts              # Main Express server
    routes/                # API routes
    services/              # Business logic
      signals/             # Signal detection
      personas/             # Persona assignment
      recommend/            # Recommendation engine
      chat/                 # Chat/LLM integration
    middleware/             # Auth, consent, validation
    utils/                  # Helpers
  prisma/
    schema.prisma          # Database schema
    seed.ts                # Data generator
    migrations/            # Auto-generated
  tests/
    unit/
    integration/
  scripts/
    export-csv.ts
    export-json.ts
    export-parquet.ts
    eval-harness.ts
frontend/
  src/
    components/
    pages/
    hooks/
    services/              # API client
    utils/
  public/
  dist/                    # Build output
```

### 2. Environment Variables Template
Create `.env.example` with all required variables:

```env
# Database
DATABASE_URL="file:./spendsense.db"

# Authentication
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="24h"

# OpenAI (Chat)
OPENAI_API_KEY="sk-..."
USE_LLM_STUB="false"  # Set to "true" for local development without API key

# Data Generation
DATA_SEED="1337"  # Fixed seed for deterministic data

# Node Environment
NODE_ENV="development"
PORT="3000"

# Frontend
VITE_API_URL="http://localhost:3000/api"
```

### 3. Prisma Schema Stub
Create `backend/prisma/schema.prisma` with basic structure:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// Add all tables from SCHEMA.md
// Start with users, accounts, transactions, liabilities
// Then signals, personas, content, offers, recommendations, etc.
```

### 4. TypeScript Configuration
Create `backend/tsconfig.json` and `frontend/tsconfig.json`:

**backend/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**frontend/tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5. Backend Package.json
Create `backend/package.json` with dependencies:

```json
{
  "name": "spendsense-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "eval": "tsx scripts/eval-harness.ts",
    "eval:metrics": "tsx scripts/eval-harness.ts --metrics",
    "eval:report": "tsx scripts/eval-harness.ts --report",
    "eval:traces": "tsx scripts/eval-harness.ts --traces",
    "export:csv": "tsx scripts/export-csv.ts",
    "export:json": "tsx scripts/export-json.ts",
    "export:parquet": "tsx scripts/export-parquet.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@prisma/client": "^5.7.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.22.4",
    "openai": "^4.20.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/jest": "^29.5.8",
    "prisma": "^5.7.0",
    "tsx": "^4.6.2",
    "typescript": "^5.3.2",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.1"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### 6. Frontend Package.json
Create `frontend/package.json` with dependencies:

```json
{
  "name": "spendsense-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.42",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.7"
  }
}
```

### 7. Testing Framework Setup
Create `backend/jest.config.js`:

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

### 8. ESLint & Prettier (Optional but Recommended)
Create `.eslintrc.js` and `.prettierrc` for code quality:

**.eslintrc.js:**
```js
module.exports = {
  extends: ['eslint:recommended', '@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  root: true,
};
```

**.prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

### 9. Vite Configuration
Create `frontend/vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
```

### 10. Basic Server Stub
Create `backend/src/server.ts` with Express setup:

```typescript
import express from 'express';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: Add routes from Architecture PRD
// POST /api/users
// POST /api/consent
// GET /api/profile/:userId
// GET /api/recommendations/:userId
// POST /api/feedback
// GET /api/operator/review
// etc.

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

### 11. Data Generator Stub
Create `backend/prisma/seed.ts` with basic structure:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DATA_SEED = process.env.DATA_SEED || '1337';

async function main() {
  console.log(`Seeding with DATA_SEED=${DATA_SEED}`);
  
  // TODO: Implement data generator per Reqs PRD Section 1
  // - Generate 50-100 synthetic users
  // - Create accounts (checking, savings, credit_card, etc.)
  // - Generate transactions (30-90 days)
  // - Create liabilities (credit cards, loans)
  // - Use fixed seed for determinism
  
  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 12. API Client Stub
Create `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

---

## 📋 Implementation Priority Order

1. **Project Structure** - Create backend/ and frontend/ folders
2. **Environment Setup** - Create .env.example
3. **Prisma Schema** - Create schema.prisma from SCHEMA.md
4. **TypeScript Configs** - Set up tsconfig.json files
5. **Package.json Files** - Create backend and frontend package.json
6. **Basic Server** - Create Express server stub
7. **Vite Config** - Set up frontend build tool
8. **Testing Setup** - Configure Jest
9. **Data Generator Stub** - Create seed.ts structure
10. **API Client** - Create frontend API service

---

## 🚀 Next Steps After Setup

Once setup is complete, you can provide a prompt to implement:

1. **Phase 1: Data Layer**
   - Complete Prisma schema
   - Data generator (seed.ts)
   - Database migrations

2. **Phase 2: Signal Detection**
   - Subscription signals
   - Savings signals
   - Credit signals
   - Income signals

3. **Phase 3: Persona Assignment**
   - Persona scoring algorithm
   - Primary/secondary assignment

4. **Phase 4: Recommendation Engine**
   - Content matching
   - Offer eligibility
   - Rationale templates

5. **Phase 5: API & Frontend**
   - REST API endpoints
   - React frontend
   - Operator view

6. **Phase 6: Guardrails & Evaluation**
   - Consent middleware
   - Tone checks
   - Evaluation harness

---

## 📝 Notes

- All paths should match the Architecture PRD structure
- Use DATA_SEED=1337 for deterministic data generation
- Keep SQLite for development (Vercel will use /tmp/spendsense.db)
- USE_LLM_STUB=true for local development without OpenAI API key
- All API endpoints should use /api prefix per PRD requirements

