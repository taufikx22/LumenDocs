from typing import Dict, Any, Optional
import os
import logging

from src.embedding.base import BaseEmbedder
from src.embedding.sentence_transformer import SentenceTransformerEmbedder
from src.embedding.openai_embedder import OpenAIEmbedder
from src.embedding.gemini_embedder import GeminiEmbedder

logger = logging.getLogger(__name__)

class EmbedderFactory:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def get_embedder(self) -> BaseEmbedder:
        # Check environment variable first, then fallback to config
        provider = os.getenv("EMBEDDING_PROVIDER") or self.config.get("provider", "local")
        provider = provider.lower()
        
        if provider == "openai":
            logger.info("Initializing OpenAIEmbedder...")
            model_name = os.getenv("EMBEDDING_MODEL") or self.config.get("model_name", "text-embedding-ada-002")
            return OpenAIEmbedder(
                model=model_name,
                api_key=self.config.get("openai_api_key")
            )
        elif provider == "gemini":
            logger.info("Initializing GeminiEmbedder...")
            model_name = os.getenv("EMBEDDING_MODEL") or self.config.get("model_name", "models/text-embedding-004")
            return GeminiEmbedder(
                model=model_name,
                api_key=self.config.get("google_api_key")
            )
        else:
            # Local sentence-transformer
            logger.info("Initializing SentenceTransformerEmbedder...")
            raw_embedding_config = dict(self.config)
            raw_embedding_config.setdefault('model_name', raw_embedding_config.pop('default_model', 'all-MiniLM-L6-v2'))
            allowed_embedder_keys = {'model_name', 'batch_size', 'device', 'normalize_embeddings', 'show_progress'}
            embedding_config = {k: v for k, v in raw_embedding_config.items() if k in allowed_embedder_keys}
            return SentenceTransformerEmbedder(**embedding_config)
