from typing import Optional
import logging

from src.generation.base import BaseGenerator
from src.generation.local_generator import LocalLLMGenerator

logger = logging.getLogger(__name__)


class GeneratorFactory:
    """Factory for creating generator instances — local-only."""

    def __init__(self, config=None, model_manager=None):
        self.config = config or {}
        self._model_manager = model_manager
        self._generator: Optional[LocalLLMGenerator] = None

    def get_default_generator(self) -> BaseGenerator:
        if not self._generator:
            self._generator = LocalLLMGenerator(
                model_manager=self._model_manager,
                system_prompt=self.config.get("system_prompt"),
            )
        return self._generator

    def get_generator(self, model_type: str) -> Optional[BaseGenerator]:
        # Everything is local now
        return self.get_default_generator()

    def set_model_manager(self, manager):
        self._model_manager = manager
        if self._generator:
            self._generator.set_model_manager(manager)
