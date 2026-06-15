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
        model_info = self._db.get_model(model_id) if self._db else None
        if not model_info:
            raise ValueError(f"Model '{model_id}' not found in registry")

        gguf_path = model_info["gguf_path"]
        
        # Intercept cloud model loading
        if gguf_path.startswith("openai://") or gguf_path.startswith("gemini://") or gguf_path.startswith("claude://"):
            self.unload_model()
            self._active_model_id = model_id
            self._active_model_name = model_info["name"]
            
            if self._db:
                self._db.touch_model_used(model_id)
                
            logger.info(f"Loaded cloud model: {model_info['name']}")
            return self.get_active_model()

        if not _llama_available:
            raise RuntimeError("llama-cpp-python is not installed")

        if self._active_model_id == model_id and self._model is not None:
            return self.get_active_model()

        # Unload existing model first
        self.unload_model()

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
        else:
            self._active_model_id = None
            self._active_model_name = None

    def get_active_model(self) -> Dict[str, Any]:
        if self._active_model_id:
            # Check if active is cloud
            model_info = self._db.get_model(self._active_model_id) if self._db else None
            if model_info and (model_info["gguf_path"].startswith("openai://") or model_info["gguf_path"].startswith("gemini://") or model_info["gguf_path"].startswith("claude://")):
                return {
                    "loaded": True,
                    "id": self._active_model_id,
                    "name": self._active_model_name,
                    "context_size": self._default_ctx,
                }
        if self._model is None:
            return {"loaded": False}
        return {
            "loaded": True,
            "id": self._active_model_id,
            "name": self._active_model_name,
            "context_size": self._default_ctx,
        }

    def is_loaded(self) -> bool:
        if self._active_model_id:
            model_info = self._db.get_model(self._active_model_id) if self._db else None
            if model_info and (model_info["gguf_path"].startswith("openai://") or model_info["gguf_path"].startswith("gemini://") or model_info["gguf_path"].startswith("claude://")):
                return True
        return self._model is not None

    # ── generation ────────────────────────────────────────────────

    def generate(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        # Route cloud generation first
        if self._active_model_id:
            model_info = self._db.get_model(self._active_model_id) if self._db else None
            if model_info:
                gguf_path = model_info["gguf_path"]
                if gguf_path.startswith("openai://"):
                    model_name = gguf_path.replace("openai://", "")
                    return self._generate_openai(prompt, model_name, temperature, max_tokens, stop)
                elif gguf_path.startswith("gemini://"):
                    model_name = gguf_path.replace("gemini://", "")
                    return self._generate_gemini(prompt, model_name, temperature, max_tokens, stop)
                elif gguf_path.startswith("claude://"):
                    model_name = gguf_path.replace("claude://", "")
                    return self._generate_claude(prompt, model_name, temperature, max_tokens, stop)

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

    def _generate_openai(
        self,
        prompt: str,
        model_name: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        api_key = self._config.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        if not model_name:
            model_name = "gpt-4o"
            
        messages = [{"role": "user", "content": prompt}]
        
        response = client.chat.completions.create(
            model=model_name,
            messages=messages,
            temperature=temperature if temperature is not None else self._default_temp,
            max_tokens=max_tokens if max_tokens is not None else self._default_max_tokens,
            stop=stop,
        )
        
        text = response.choices[0].message.content or ""
        prompt_tokens = response.usage.prompt_tokens if response.usage else 0
        completion_tokens = response.usage.completion_tokens if response.usage else 0
        
        return {
            "text": text.strip(),
            "model_name": f"OpenAI {model_name}",
            "model_id": self._active_model_id,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "temperature": temperature if temperature is not None else self._default_temp,
        }

    def _generate_gemini(
        self,
        prompt: str,
        model_name: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        api_key = self._config.get("google_api_key") or os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("Google API key not configured")

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        
        if not model_name:
            model_name = "gemini-1.5-flash"
            
        generation_config = {}
        generation_config["temperature"] = temperature if temperature is not None else self._default_temp
        generation_config["max_output_tokens"] = max_tokens if max_tokens is not None else self._default_max_tokens
        if stop:
            generation_config["stop_sequences"] = stop
            
        model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=generation_config
        )
        
        response = model.generate_content(prompt)
        text = response.text or ""
        
        prompt_tokens = 0
        completion_tokens = 0
        try:
            if hasattr(response, "usage_metadata"):
                prompt_tokens = response.usage_metadata.prompt_token_count
                completion_tokens = response.usage_metadata.candidates_token_count
        except Exception:
            pass
            
        return {
            "text": text.strip(),
            "model_name": f"Gemini {model_name}",
            "model_id": self._active_model_id,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "temperature": generation_config["temperature"],
        }

    def _generate_claude(
        self,
        prompt: str,
        model_name: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        api_key = self._config.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("Anthropic API key not configured")

        import httpx
        
        if not model_name:
            model_name = "claude-3-5-sonnet-20241022"
            
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
        
        payload = {
            "model": model_name,
            "max_tokens": max_tokens if max_tokens is not None else self._default_max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        
        if temperature is not None:
            payload["temperature"] = max(0.0, min(1.0, temperature))
            
        if stop:
            payload["stop_sequences"] = stop
            
        with httpx.Client() as client:
            response = client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            
        if response.status_code != 200:
            raise RuntimeError(f"Anthropic API error: {response.text}")
            
        res_data = response.json()
        text = ""
        if res_data.get("content"):
            text = res_data["content"][0].get("text", "")
            
        usage = res_data.get("usage", {})
        prompt_tokens = usage.get("input_tokens", 0)
        completion_tokens = usage.get("output_tokens", 0)
        
        return {
            "text": text.strip(),
            "model_name": f"Claude {model_name}",
            "model_id": self._active_model_id,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "temperature": payload.get("temperature", self._default_temp),
        }
