import logging
import os
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

_llama_available = False
try:
    from llama_cpp import Llama
    _llama_available = True
except ImportError:
    logger.warning("llama-cpp-python not installed — model loading disabled")


class ModelManager:
    """Manages GGUF model lifecycle: registration, loading, unloading, generation."""

    def __init__(self, db_store=None, config: Optional[Dict[str, Any]] = None):
        self._db = db_store
        self._config = config or {}
        self._model: Optional[Any] = None  # Llama instance
        self._active_model_id: Optional[str] = None
        self._active_model_name: Optional[str] = None

        # Generation defaults
        self._default_ctx = self._config.get("default_context_size", 4096)
        self._default_temp = self._config.get("default_temperature", 0.2)
        self._default_max_tokens = self._config.get("default_max_tokens", 1024)
        self._gpu_layers = self._config.get("gpu_layers", -1)

    # ── registration ──────────────────────────────────────────────

    def register_model(self, name: str, gguf_path: str) -> Dict[str, Any]:
        path = Path(gguf_path).resolve()

        # If path is a directory, find the first .gguf file inside
        if path.is_dir():
            gguf_files = sorted(path.glob("*.gguf"))
            if not gguf_files:
                raise FileNotFoundError(f"No .gguf files found in directory: {path}")
            path = gguf_files[0]
            logger.info(f"Auto-selected GGUF file from directory: {path.name}")

        if not path.exists() or path.suffix.lower() != ".gguf":
            raise FileNotFoundError(f"Invalid GGUF file: {path}")

        model_id = str(uuid.uuid4())
        file_size = path.stat().st_size

        if self._db:
            self._db.register_model(model_id, name, str(path), file_size)

        logger.info(f"Registered model '{name}' ({file_size / 1e9:.2f} GB)")
        return {"id": model_id, "name": name, "path": str(path), "file_size_bytes": file_size}

    def unregister_model(self, model_id: str) -> bool:
        if self._active_model_id == model_id:
            self.unload_model()
        if self._db:
            self._db.unregister_model(model_id)
        return True

    def list_models(self) -> List[Dict[str, Any]]:
        if self._db:
            return self._db.list_models()
        return []

    def set_default_model(self, model_id: str) -> bool:
        if self._db:
            self._db.set_default_model(model_id)
            return True
        return False

    def get_default_model(self) -> Optional[Dict[str, Any]]:
        if self._db:
            return self._db.get_default_model()
        return None

    # ── loading / unloading ───────────────────────────────────────

    def load_model(self, model_id: str) -> Dict[str, Any]:
        if not _llama_available:
            raise RuntimeError("llama-cpp-python is not installed")

        if self._active_model_id == model_id and self._model is not None:
            return self.get_active_model()

        # Unload existing model first
        self.unload_model()

        model_info = self._db.get_model(model_id) if self._db else None
        if not model_info:
            raise ValueError(f"Model '{model_id}' not found in registry")

        gguf_path = model_info["gguf_path"]
        if not Path(gguf_path).exists():
            raise FileNotFoundError(f"GGUF file missing: {gguf_path}")

        logger.info(f"Loading model '{model_info['name']}' from {gguf_path}")

        try:
            self._model = Llama(
                model_path=gguf_path,
                n_ctx=self._default_ctx,
                n_gpu_layers=self._gpu_layers,
                verbose=False,
            )
            self._active_model_id = model_id
            self._active_model_name = model_info["name"]

            if self._db:
                self._db.touch_model_used(model_id)

            logger.info(f"Model '{model_info['name']}' loaded successfully")
            return self.get_active_model()

        except Exception as e:
            self._model = None
            self._active_model_id = None
            self._active_model_name = None
            logger.error(f"Failed to load model: {e}")
            raise RuntimeError(f"Failed to load model: {e}")

    def unload_model(self):
        if self._model is not None:
            name = self._active_model_name or "unknown"
            del self._model
            self._model = None
            self._active_model_id = None
            self._active_model_name = None
            logger.info(f"Unloaded model '{name}'")

    def get_active_model(self) -> Dict[str, Any]:
        if self._model is None:
            return {"loaded": False}
        return {
            "loaded": True,
            "id": self._active_model_id,
            "name": self._active_model_name,
            "context_size": self._default_ctx,
        }

    def is_loaded(self) -> bool:
        return self._model is not None

    # ── generation ────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if self._model is None:
            raise RuntimeError("No model loaded")

        temp = temperature if temperature is not None else self._default_temp
        tokens = max_tokens if max_tokens is not None else self._default_max_tokens

        result = self._model(
            prompt,
            max_tokens=tokens,
            temperature=temp,
            stop=stop or [],
            echo=False,
        )

        text = result["choices"][0]["text"] if result.get("choices") else ""
        usage = result.get("usage", {})

        return {
            "text": text.strip(),
            "model_name": self._active_model_name,
            "model_id": self._active_model_id,
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "temperature": temp,
        }
