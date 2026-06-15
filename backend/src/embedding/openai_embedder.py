from typing import List, Dict, Any, Optional
import numpy as np
import logging
import os
from datetime import datetime

from src.chunking.base import Chunk
from src.embedding.base import BaseEmbedder, EmbeddingResult

logger = logging.getLogger(__name__)

class OpenAIEmbedder(BaseEmbedder):
    """Embedder using OpenAI's embedding API."""
    
    def __init__(
        self,
        model: str = "text-embedding-ada-002",
        api_key: Optional[str] = None,
        batch_size: int = 16,
        dimensions: Optional[int] = None
    ):
        self.model = model
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.batch_size = batch_size
        self._dimensions = dimensions
        
        if not self.api_key:
            raise ValueError(
                "OpenAI API key not provided and OPENAI_API_KEY environment variable not set."
            )
            
        from openai import OpenAI
        self.client = OpenAI(api_key=self.api_key)
        logger.info(f"Initialized OpenAIEmbedder with model '{model}'")

    def embed_chunk(self, chunk: Chunk) -> EmbeddingResult:
        """Generate embedding for a single document chunk."""
        try:
            start_time = datetime.now()
            res = self.client.embeddings.create(input=[chunk.text], model=self.model)
            emb = res.data[0].embedding
            processing_time = (datetime.now() - start_time).total_seconds()
            
            metadata = {
                **chunk.metadata,
                "model": self.model,
                "processing_time": processing_time,
                "embedding_timestamp": datetime.now().isoformat()
            }
            return EmbeddingResult(chunk_id=chunk.chunk_id, embedding=emb, metadata=metadata)
        except Exception as e:
            logger.error(f"Error embedding chunk {chunk.chunk_id}: {str(e)}")
            raise

    def embed_chunks(self, chunks: List[Chunk]) -> List[EmbeddingResult]:
        """Generate embeddings for multiple chunks in batches."""
        try:
            results = []
            for i in range(0, len(chunks), self.batch_size):
                batch = chunks[i:i+self.batch_size]
                texts = [c.text for c in batch]
                
                start_time = datetime.now()
                res = self.client.embeddings.create(input=texts, model=self.model)
                total_time = (datetime.now() - start_time).total_seconds()
                avg_time = total_time / len(batch) if batch else 0
                
                for chunk, data in zip(batch, res.data):
                    metadata = {
                        **chunk.metadata,
                        "model": self.model,
                        "total_batch_time": total_time,
                        "avg_time_per_chunk": avg_time,
                        "embedding_timestamp": datetime.now().isoformat()
                    }
                    results.append(EmbeddingResult(chunk_id=chunk.chunk_id, embedding=data.embedding, metadata=metadata))
            return results
        except Exception as e:
            logger.error(f"Error embedding batch of {len(chunks)} chunks: {str(e)}")
            raise

    def embed_query(self, query: str) -> np.ndarray:
        """Generate an embedding for a search query."""
        try:
            res = self.client.embeddings.create(input=[query], model=self.model)
            return np.array(res.data[0].embedding, dtype=float)
        except Exception as e:
            logger.error(f"Error embedding query: {str(e)}")
            raise

    @property
    def dimension(self) -> int:
        """Get the dimensionality of the embeddings."""
        if self._dimensions is None:
            self._dimensions = len(self.embed_query("dimension check"))
        return self._dimensions
