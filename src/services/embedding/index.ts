export { warmupEmbedder, switchEmbeddingModel, embedText, embedBatch, isEmbedderReady, getEmbedDims, getCurrentModelId } from './embedder';
export type { DownloadProgress } from './embedder';
export { searchVectors, semanticSearch, semanticSearchScored, cosineSimilarity } from './vectorSearch';
export type { SearchHit } from './vectorSearch';
export { runBackfill, getBackfillCursor, backfillScenes, backfillNPCs, rebuildAllEmbeddings, runFullReindex } from './backfillRunner';
export type { BackfillProgress } from './backfillRunner';
