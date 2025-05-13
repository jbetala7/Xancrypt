// server/utils/fileChunker.js

/**
 * Given a total file size and a desired chunk size,
 * returns the number of chunks (always rounds up).
 * @throws if chunkSize <= 0
 */
function calculateChunkCount(totalSize, chunkSize) {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be > 0');
  }
  // e.g. a 25-MB file with 10-MB chunks → 3 chunks
  return Math.ceil(totalSize / chunkSize);
}

/**
 * Decide whether to stream rather than buffer in memory.
 * If fileSize exceeds threshold, return true.
 */
function shouldStream(fileSize, streamThreshold) {
  return fileSize > streamThreshold;
}

module.exports = { calculateChunkCount, shouldStream };
