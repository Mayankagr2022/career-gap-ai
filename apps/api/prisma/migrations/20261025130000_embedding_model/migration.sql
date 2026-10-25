-- Vectors from different embedding models live in different spaces and cannot be compared with each other.
-- Record which model produced every row so similarity search only ever compares vectors of the same model.
-- Rows that exist before this migration were all produced by Gemini, the only embedding provider at the time.
ALTER TABLE "resume_embeddings" ADD COLUMN "embeddingModel" TEXT NOT NULL DEFAULT 'gemini-embedding-001';
ALTER TABLE "job_embeddings" ADD COLUMN "embeddingModel" TEXT NOT NULL DEFAULT 'gemini-embedding-001';
