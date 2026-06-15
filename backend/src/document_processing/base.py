from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import hashlib

class DocumentProcessor(ABC):
    @abstractmethod
    def process(self, file_path: Path) -> Dict[str, Any]:
        """
        Process the document and extract relevant information
        
        Args:
            file_path (Path): Path to the document file

        Returns:
            Dictionary containing:
            - 'content': str, the text content of the document
            - 'metadata': Dict[str, Any], metadata extracted from the document
        """
        pass

    def _calculate_hash(self, file_path: Path) -> str:
        """Calculate SHA-256 hash of a file."""
        sha256 = hashlib.sha256()
        try:
            with open(file_path, "rb") as f:
                while chunk := f.read(8192):
                    sha256.update(chunk)
            return sha256.hexdigest()
        except Exception:
            return ""

    def _generate_doc_id(self, file_path: Path) -> str:
        """Generate a unique document ID based on file name."""
        return hashlib.md5(file_path.name.encode("utf-8")).hexdigest()


class Document:
    """"class representing a processed document"""
    def __init__(self, content: str, metadata: Dict[str, Any] = None, doc_id: Optional[str] = None):
        """Initialize a Document instance
        Args:
            content (str): The text content of the document
            metadata (Dict[str, Any], optional): Metadata associated with the document
            doc_id (Optional[str], optional): Unique identifier for the document
        """
        self.content = content
        self.metadata = metadata if metadata is not None else {}
        self.doc_id = doc_id
        
    def __repr__(self) -> str:
        return f"Document(doc_id={self.doc_id}, content_length={len(self.content)}, metadata={self.metadata})"