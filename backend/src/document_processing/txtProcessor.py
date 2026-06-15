import hashlib
from pathlib import Path
from typing import Dict, Any
from datetime import datetime
import logging

from src.document_processing.base import DocumentProcessor

logger = logging.getLogger(__name__)

class TXTProcessor(DocumentProcessor):
    def process(self, file_path: Path) -> Dict[str, Any]:
        if not file_path.exists():
            raise FileNotFoundError(f"The file {file_path} does not exist.")
        
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            metadata = {
                'file_name': file_path.name,
                'file_size': file_path.stat().st_size,
                'last_modified': datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                'file_type': 'TXT',
                'processed_at': datetime.now().isoformat(),
            }
            
            doc_id = hashlib.md5((file_path.name + content).encode('utf-8', errors='ignore')).hexdigest()
            metadata['doc_id'] = doc_id
            
            return {
                'content': content.strip(),
                'metadata': metadata,
                'doc_id': doc_id
            }
        except Exception as e:
            logger.error(f"Error processing TXT file {file_path}: {e}")
            raise RuntimeError(f"Failed to process TXT file {file_path}: {e}") from e
