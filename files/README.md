# Corte Constitucional Explorer — Proof of Concept

## What This Is

A proof-of-concept data pipeline + preview UI for a modern jurisprudence explorer
for Colombia's Constitutional Court (1992–present).

## The Problem

The official relatoría (https://www.corteconstitucional.gov.co/relatoria/) is:
- Limited to 500 results per search
- No semantic/topic-based browsing
- No summaries — you must read 50+ page rulings manually
- No jurisprudential timeline (how has precedent evolved?)
- No precedent change detection

## The Solution

A freemium web app with three core features:
1. **Topic Explorer** — Browse all rulings by legal topic, type, magistrate, year
2. **AI Summaries** — Paste a link → get structured summary (facts, ratio, decision)
3. **Jurisprudential Timelines** — See how the Court's position evolves over time

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│                                                         │
│  datos.gov.co API ──→ Metadata ingestion                │
│  (Socrata/SODA)       (ruling ID, type, date,           │
│                        magistrate, chamber)              │
│                                                         │
│  Relatoría HTML  ──→  Full-text scraping                │
│  (predictable URLs)   (cheerio/node-html-parser)        │
│                                                         │
│  ──→ Supabase (Postgres + pgvector)                     │
│      • sentencias table (metadata)                      │
│      • sentencia_textos table (full text)               │
│      • embeddings for semantic search                   │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    AI LAYER                              │
│                                                         │
│  Claude API                                             │
│  • Summarize ruling → structured JSON                   │
│    (hechos, problema_juridico, ratio_decidendi,         │
│     regla_decision, decision, salvamentos)              │
│  • Classify by topic (embeddings + LLM tagging)         │
│  • Detect precedent changes between rulings             │
│  • Generate jurisprudential timeline narratives         │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│                    FRONTEND                              │
│                                                         │
│  Next.js 14 + Tailwind + Vercel                         │
│  • Topic explorer (filterable grid)                     │
│  • Ruling detail page (summary + full text toggle)      │
│  • Link-paste summarizer (input box → AI summary)       │
│  • Jurisprudential timeline (D3 or Recharts)            │
│  • Search (semantic via pgvector + keyword fallback)    │
└─────────────────────────────────────────────────────────┘
```

---

## Data Sources

### 1. Socrata API (Metadata)
- **Endpoint**: `https://www.datos.gov.co/resource/v2k4-2t8s.json`
- **Auth**: None required (public open data)
- **Fields**: proceso, expediente_tipo, expediente_n_mero, magistrado_a_ponente,
  sala, sentencia_tipo, sentencia, fecha_sentencia, sv_spv, av_apv
- **Limits**: 50,000 rows per request (use $offset for pagination)
- **Rate limit**: 1000 requests/hour without app token, unlimited with free token

### 2. Relatoría HTML (Full Text)
- **URL Pattern**: `https://www.corteconstitucional.gov.co/relatoria/{year}/{type_lower}-{number}-{year_short}.htm`
- **Examples**:
  - T-323/24 → `/relatoria/2024/t-323-24.htm`
  - C-239/97 → `/relatoria/1997/c-239-97.htm`
  - SU-081/24 → `/relatoria/2024/su081-24.htm`
- **Format**: Plain HTML, no JS rendering needed
- **Rate limiting**: Be respectful — 1 req/sec with delays

---

## Database Schema (Supabase/Postgres)

```sql
-- Core rulings table
CREATE TABLE sentencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentencia_id TEXT UNIQUE NOT NULL,        -- e.g. "T-323/24"
  tipo TEXT NOT NULL,                        -- T, C, SU, A
  numero INTEGER NOT NULL,                   -- 323
  anio INTEGER NOT NULL,                     -- 2024
  fecha DATE,
  magistrado_ponente TEXT,
  sala TEXT,                                 -- "Sala Plena", "Salas de Revisión"
  proceso TEXT,                              -- "Tutela", "Decreto Legislativo", etc.
  expediente_tipo TEXT,
  expediente_numero TEXT,
  salvamento_voto TEXT,                      -- SV/SPV info
  aclaracion_voto TEXT,                      -- AV/APV info
  url_relatoria TEXT,                        -- constructed URL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full text storage (separate for performance)
CREATE TABLE sentencia_textos (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) PRIMARY KEY,
  texto_completo TEXT,
  texto_html TEXT,                           -- original HTML
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated summaries
CREATE TABLE sentencia_resumenes (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) PRIMARY KEY,
  hechos TEXT,
  problema_juridico TEXT,
  ratio_decidendi TEXT,
  regla_decision TEXT,
  decision TEXT,
  salvamentos_resumen TEXT,
  temas TEXT[],                              -- array of topic tags
  derechos TEXT[],                           -- fundamental rights involved
  normas_demandadas TEXT[],                  -- challenged norms (for C rulings)
  precedente_relevante TEXT[],               -- cited precedent ruling IDs
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT                         -- track which Claude model was used
);

-- Topic classification via embeddings
CREATE TABLE sentencia_embeddings (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) PRIMARY KEY,
  embedding vector(1536),                    -- for semantic search
  tema_primario TEXT,
  temas_secundarios TEXT[]
);

-- Precedent tracking
CREATE TABLE precedentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentencia_id TEXT REFERENCES sentencias(sentencia_id),
  sentencia_citada_id TEXT,                  -- ruling being cited
  relacion TEXT,                             -- "reiterates", "modifies", "overrules"
  tema TEXT,
  notas TEXT
);

-- Indexes
CREATE INDEX idx_sentencias_tipo ON sentencias(tipo);
CREATE INDEX idx_sentencias_anio ON sentencias(anio);
CREATE INDEX idx_sentencias_magistrado ON sentencias(magistrado_ponente);
CREATE INDEX idx_sentencias_fecha ON sentencias(fecha);
CREATE INDEX idx_resumenes_temas ON sentencia_resumenes USING GIN(temas);
CREATE INDEX idx_resumenes_derechos ON sentencia_resumenes USING GIN(derechos);
CREATE INDEX idx_embeddings_vector ON sentencia_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

## Phase 1 Implementation Plan (4 weeks)

### Week 1: Data Ingestion
- [ ] Set up Supabase project + tables
- [ ] Build Socrata API ingestion script (paginated fetch → DB insert)
- [ ] Build URL constructor (ruling ID → relatoría URL)
- [ ] Test with 100 rulings

### Week 2: Full-Text Scraping
- [ ] Build scraper with rate limiting (1 req/sec)
- [ ] Parse HTML → extract clean text (strip nav, footer, etc.)
- [ ] Store full text in sentencia_textos
- [ ] Run on first 1,000 rulings
- [ ] Handle edge cases (missing pages, different HTML formats by year)

### Week 3: Search + Classification
- [ ] Generate embeddings for each ruling (OpenAI or Voyage embeddings)
- [ ] Build pgvector semantic search
- [ ] Initial topic clustering (group similar rulings)
- [ ] Build keyword search fallback (tsvector)

### Week 4: Frontend MVP
- [ ] Next.js 14 app scaffold
- [ ] Topic explorer page (filterable grid with facets)
- [ ] Ruling detail page (metadata + full text)
- [ ] Search bar (semantic + keyword)
- [ ] Deploy to Vercel

## Phase 2: AI Summaries (3 weeks)

### Week 5-6: Summary Engine
- [ ] Design Claude prompt for structured summary extraction
- [ ] Build summary pipeline (fetch text → Claude API → store)
- [ ] Link-paste feature (user inputs URL → fetch → summarize)
- [ ] Cache summaries to avoid re-processing
- [ ] Test accuracy on 50 landmark rulings

### Week 7: Summary UI
- [ ] Summary card component (collapsible sections)
- [ ] Link-paste input with loading state
- [ ] Free tier: 3 summaries/month (track via Supabase auth)
- [ ] Stripe integration for Pro tier

## Phase 3: Jurisprudential Timelines (4 weeks)

### Week 8-9: Precedent Analysis
- [ ] Build citation extractor (find "Sentencia X-NNN/YY" references)
- [ ] Map citation graph (which rulings cite which)
- [ ] Claude analysis: classify citation relationship (reiterates/modifies/overrules)
- [ ] Store in precedentes table

### Week 10-11: Timeline UI
- [ ] Timeline visualization (D3.js or Recharts)
- [ ] Topic-filtered view ("show me all abortion rulings over time")
- [ ] Precedent change highlighting (visual flag when Court changes position)
- [ ] Narrative generation (Claude writes a paragraph explaining the evolution)

---

## Freemium Model

### Free Tier
- Full access to topic explorer and search
- View ruling metadata and full text
- 3 AI summaries per month
- Basic timeline view

### Pro Tier ($15-25/month)
- Unlimited AI summaries
- Full jurisprudential timelines with narratives
- Precedent change alerts
- Export to PDF/DOCX
- Priority processing

---

## Tech Stack

| Component        | Technology                     |
|------------------|-------------------------------|
| Frontend         | Next.js 14, Tailwind CSS      |
| Database         | Supabase (Postgres + pgvector)|
| AI               | Claude API (Sonnet)           |
| Embeddings       | Voyage AI or OpenAI           |
| Auth             | Supabase Auth                 |
| Payments         | Stripe                        |
| Hosting          | Vercel                        |
| Scraping         | Node.js + cheerio             |
| Timeline viz     | D3.js or Recharts             |

---

## Running This Proof of Concept

```bash
# Install dependencies
npm install

# 1. Fetch metadata from Socrata API
node src/01-fetch-metadata.js

# 2. Scrape full text from relatoría
node src/02-scrape-relatoria.js

# 3. Generate AI summary (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-... node src/03-summarize.js

# 4. Preview the data
node src/04-preview.js
```
