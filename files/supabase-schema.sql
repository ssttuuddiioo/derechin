-- ============================================================
-- Corte Constitucional Explorer — Database Schema
-- Run this in Supabase SQL Editor to set up your tables
-- ============================================================

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ────────────────────────────────────────────────────────────
-- Core rulings table (populated from datos.gov.co API)
-- ────────────────────────────────────────────────────────────
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- Full text storage (scraped from relatoría website)
-- Separate table for performance — full text can be 100k+ chars
-- ────────────────────────────────────────────────────────────
CREATE TABLE sentencia_textos (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) ON DELETE CASCADE PRIMARY KEY,
  texto_completo TEXT,                       -- cleaned plain text
  texto_html TEXT,                           -- original HTML (for re-processing)
  temas_header TEXT[],                       -- topic descriptors from page header
  word_count INTEGER,
  char_count INTEGER,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- AI-generated summaries (Claude API output)
-- ────────────────────────────────────────────────────────────
CREATE TABLE sentencia_resumenes (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) ON DELETE CASCADE PRIMARY KEY,
  hechos TEXT,                               -- key facts
  problema_juridico TEXT,                    -- legal question(s)
  ratio_decidendi TEXT,                      -- core reasoning
  regla_decision TEXT,                       -- decision rule established
  decision TEXT,                             -- what the Court decided
  salvamentos_resumen TEXT,                  -- dissent/concurrence summary
  temas TEXT[],                              -- topic tags
  derechos TEXT[],                           -- fundamental rights involved
  normas_demandadas TEXT[],                  -- challenged norms (for C rulings)
  precedente_citado TEXT[],                  -- cited prior ruling IDs
  cambio_precedente BOOLEAN DEFAULT FALSE,
  nota_cambio TEXT,                          -- explanation of precedent change
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  model_version TEXT                         -- e.g. "claude-sonnet-4-20250514"
);

-- ────────────────────────────────────────────────────────────
-- Embeddings for semantic search (pgvector)
-- ────────────────────────────────────────────────────────────
CREATE TABLE sentencia_embeddings (
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) ON DELETE CASCADE PRIMARY KEY,
  embedding vector(1536),                    -- OpenAI/Voyage embedding dimension
  tema_primario TEXT,
  temas_secundarios TEXT[],
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- Precedent relationship graph
-- Maps how rulings cite and relate to each other
-- ────────────────────────────────────────────────────────────
CREATE TABLE precedentes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sentencia_id TEXT REFERENCES sentencias(sentencia_id) ON DELETE CASCADE,
  sentencia_citada_id TEXT NOT NULL,          -- ruling being cited (may not be in DB yet)
  relacion TEXT CHECK (relacion IN ('reitera', 'modifica', 'revoca', 'cita', 'aclara')),
  tema TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sentencia_id, sentencia_citada_id, relacion)
);

-- ────────────────────────────────────────────────────────────
-- Full-text search (tsvector for keyword search fallback)
-- ────────────────────────────────────────────────────────────
ALTER TABLE sentencia_textos ADD COLUMN IF NOT EXISTS
  textsearch tsvector
  GENERATED ALWAYS AS (to_tsvector('spanish', coalesce(texto_completo, ''))) STORED;

-- ────────────────────────────────────────────────────────────
-- Indexes for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_sentencias_tipo ON sentencias(tipo);
CREATE INDEX idx_sentencias_anio ON sentencias(anio);
CREATE INDEX idx_sentencias_magistrado ON sentencias(magistrado_ponente);
CREATE INDEX idx_sentencias_fecha ON sentencias(fecha);
CREATE INDEX idx_sentencias_tipo_anio ON sentencias(tipo, anio);

CREATE INDEX idx_resumenes_temas ON sentencia_resumenes USING GIN(temas);
CREATE INDEX idx_resumenes_derechos ON sentencia_resumenes USING GIN(derechos);
CREATE INDEX idx_resumenes_precedente ON sentencia_resumenes USING GIN(precedente_citado);
CREATE INDEX idx_resumenes_cambio ON sentencia_resumenes(cambio_precedente) WHERE cambio_precedente = TRUE;

CREATE INDEX idx_embeddings_vector ON sentencia_embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_textos_search ON sentencia_textos USING GIN(textsearch);

CREATE INDEX idx_precedentes_sentencia ON precedentes(sentencia_id);
CREATE INDEX idx_precedentes_citada ON precedentes(sentencia_citada_id);
CREATE INDEX idx_precedentes_relacion ON precedentes(relacion);

-- ────────────────────────────────────────────────────────────
-- Row Level Security (for Supabase Auth + freemium model)
-- ────────────────────────────────────────────────────────────
ALTER TABLE sentencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentencia_textos ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentencia_resumenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentencia_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE precedentes ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables (data is public domain)
CREATE POLICY "Public read" ON sentencias FOR SELECT USING (true);
CREATE POLICY "Public read" ON sentencia_textos FOR SELECT USING (true);
CREATE POLICY "Public read" ON sentencia_resumenes FOR SELECT USING (true);
CREATE POLICY "Public read" ON sentencia_embeddings FOR SELECT USING (true);
CREATE POLICY "Public read" ON precedentes FOR SELECT USING (true);

-- Only service role can write (for pipeline scripts)
CREATE POLICY "Service write" ON sentencias FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON sentencia_textos FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON sentencia_resumenes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON sentencia_embeddings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service write" ON precedentes FOR ALL USING (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- Useful views
-- ────────────────────────────────────────────────────────────

-- Rulings with summaries (the main query view)
CREATE VIEW v_sentencias_completas AS
SELECT
  s.*,
  r.hechos,
  r.problema_juridico,
  r.ratio_decidendi,
  r.decision,
  r.temas,
  r.derechos,
  r.cambio_precedente,
  t.word_count
FROM sentencias s
LEFT JOIN sentencia_resumenes r ON s.sentencia_id = r.sentencia_id
LEFT JOIN sentencia_textos t ON s.sentencia_id = t.sentencia_id;

-- Precedent changes (for alerts/highlights)
CREATE VIEW v_cambios_precedente AS
SELECT
  s.sentencia_id,
  s.tipo,
  s.fecha,
  s.magistrado_ponente,
  r.temas,
  r.nota_cambio,
  r.precedente_citado
FROM sentencias s
JOIN sentencia_resumenes r ON s.sentencia_id = r.sentencia_id
WHERE r.cambio_precedente = TRUE
ORDER BY s.fecha DESC;

-- ────────────────────────────────────────────────────────────
-- Semantic search function (for pgvector queries)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_sentencias(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  sentencia_id TEXT,
  tipo TEXT,
  fecha DATE,
  magistrado_ponente TEXT,
  temas TEXT[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sentencia_id,
    s.tipo,
    s.fecha,
    s.magistrado_ponente,
    r.temas,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM sentencia_embeddings e
  JOIN sentencias s ON s.sentencia_id = e.sentencia_id
  LEFT JOIN sentencia_resumenes r ON r.sentencia_id = e.sentencia_id
  WHERE 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
