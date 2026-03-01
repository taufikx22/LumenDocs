import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from src.generation.base import BaseGenerator, GenerationResult

logger = logging.getLogger(__name__)


class LocalLLMGenerator(BaseGenerator):
    """Local LLM generator backed by ModelManager (llama-cpp-python)."""

    def __init__(self, model_manager=None, system_prompt: Optional[str] = None, **kwargs):
        self._manager = model_manager
        self.system_prompt = system_prompt or (
            "You are a helpful AI assistant. Answer the user's question based on the provided context.\n"
            "If the context doesn't contain enough information to fully answer the question, say so clearly.\n"
            "Be accurate, concise, and helpful."
        )

    def set_model_manager(self, manager):
        self._manager = manager

    def generate(
        self,
        query: str,
        context: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        if not self._manager or not self._manager.is_loaded():
            raise RuntimeError("No model loaded — select a model first")

        start = datetime.now()

        # Build prompt with optional chat history
        chat_history = kwargs.get("chat_history", [])
        history_block = ""
        if chat_history:
            recent = chat_history[-5:]
            lines = []
            for msg in recent:
                role = "User" if msg.get("role") == "user" else "Assistant"
                lines.append(f"{role}: {msg.get('content')}")
            history_block = "Previous Conversation:\n" + "\n".join(lines) + "\n\n"

        prompt = f"{self.system_prompt}\n\n{history_block}Context:\n{context}\n\nQuestion: {query}\n\nAnswer:"

        result = self._manager.generate(
            prompt,
            temperature=temperature,
            max_tokens=max_tokens,
        )

        elapsed = (datetime.now() - start).total_seconds()
        active = self._manager.get_active_model()

        metadata = {
            "model": active.get("name", "unknown"),
            "model_id": active.get("id"),
            "provider": "local",
            "temperature": result.get("temperature"),
            "generation_time": elapsed,
            "prompt_tokens": result.get("prompt_tokens", 0),
            "completion_tokens": result.get("completion_tokens", 0),
            "timestamp": datetime.now().isoformat(),
        }

        return GenerationResult(
            query=query,
            response=result["text"],
            context=context,
            metadata=metadata,
        )

    def get_model_info(self) -> Dict[str, Any]:
        if self._manager:
            return self._manager.get_active_model()
        return {"provider": "local", "loaded": False}
