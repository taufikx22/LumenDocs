import logging
import os
import tempfile
import string
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
import uvicorn

from app.config.loader import load_config
from src.rag_system import RAGSystem
from src.memory.sqlite_store import SQLiteStore
from src.model_manager import ModelManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="LumenDocs API",
    description="Local-first RAG System with GGUF model management",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_system: Optional[RAGSystem] = None
memory_store: Optional[SQLiteStore] = None
model_manager: Optional[ModelManager] = None


# ── request / response models ────────────────────────────────────

class QueryRequest(BaseModel):
    question: str = Field(...)
    top_k: int = Field(5, ge=1, le=20)
    session_id: Optional[str] = Field(None)

class QueryResponse(BaseModel):
    question: str
    answer: str
    context: Optional[str] = None
    retrieval_metadata: Optional[Dict[str, Any]] = None
    generation_metadata: Optional[Dict[str, Any]] = None
    model_id: Optional[str] = None
    model_name: Optional[str] = None
    retrieved_chunks: int = 0
    error: Optional[str] = None

class IngestionResponse(BaseModel):
    processed_documents: int
    total_chunks: int
    errors: List[str]
    vector_store_info: Optional[Dict[str, Any]] = None

class HealthResponse(BaseModel):
    status: str
    rag_system_ready: bool
    vector_store_status: str
    model_loaded: bool

class RegisterModelRequest(BaseModel):
    name: str
    gguf_path: str

class ModelResponse(BaseModel):
    id: str
    name: str
    gguf_path: str
    file_size_bytes: Optional[int] = None
    is_default: bool = False
    registered_at: Optional[str] = None
    last_used_at: Optional[str] = None


# ── startup ───────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    global rag_system, memory_store, model_manager
    try:
        config = load_config()
        memory_store = SQLiteStore()
        model_manager = ModelManager(db_store=memory_store, config=config.get("generation", {}))

        logger.info("Initializing RAG system...")
        rag_system = RAGSystem(config, model_manager=model_manager)

        # Auto-load default model if one is set
        default = memory_store.get_default_model()
        if default:
            try:
                model_manager.load_model(default["id"])
                logger.info(f"Auto-loaded default model: {default['name']}")
            except Exception as e:
                logger.warning(f"Could not auto-load default model: {e}")

        logger.info("System ready")
    except Exception as e:
        logger.error(f"Startup failed: {e}")
        raise


# ── general endpoints ─────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

@app.get("/healthz", response_model=HealthResponse)
async def health_check():
    global rag_system, model_manager
    if rag_system is None:
        return HealthResponse(status="error", rag_system_ready=False, vector_store_status="not_initialized", model_loaded=False)
    try:
        rag_system.vector_store.get_collection_info()
        vs_status = "healthy"
    except Exception:
        vs_status = "unhealthy"
    loaded = model_manager.is_loaded() if model_manager else False
    return HealthResponse(status="ok", rag_system_ready=True, vector_store_status=vs_status, model_loaded=loaded)


# ── model management ─────────────────────────────────────────────

@app.get("/models")
async def list_models():
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    return model_manager.list_models()

@app.post("/models/register")
async def register_model(request: RegisterModelRequest):
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    try:
        result = model_manager.register_model(request.name, request.gguf_path)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/models/{model_id}")
async def unregister_model(model_id: str):
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    model_manager.unregister_model(model_id)
    return {"status": "removed"}

@app.post("/models/{model_id}/load")
async def load_model(model_id: str):
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    try:
        return model_manager.load_model(model_id)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/unload")
async def unload_model():
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    model_manager.unload_model()
    return {"status": "unloaded"}

@app.get("/models/active")
async def get_active_model():
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    return model_manager.get_active_model()

@app.post("/models/{model_id}/default")
async def set_default_model(model_id: str):
    global model_manager
    if not model_manager:
        raise HTTPException(status_code=503, detail="System not initialized")
    model_manager.set_default_model(model_id)
    return {"status": "default_set"}


# ── query ─────────────────────────────────────────────────────────

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    global rag_system, memory_store, model_manager
    if rag_system is None or memory_store is None:
        raise HTTPException(status_code=503, detail="System not initialized")
    if not model_manager or not model_manager.is_loaded():
        raise HTTPException(status_code=400, detail="No model loaded — load a model first")

    session_id = request.session_id
    active = model_manager.get_active_model()

    if session_id:
        title = request.question[:50] + ("..." if len(request.question) > 50 else "")
        memory_store.create_session(session_id, title=title, model_id=active.get("id"))
        memory_store.add_message(session_id, "user", request.question)

    chat_history = memory_store.get_session_history(session_id) if session_id else []

    try:
        result = rag_system.query(
            request.question,
            top_k=request.top_k,
            chat_history=chat_history,
        )

        if result.get("error"):
            return QueryResponse(question=request.question, answer="", error=result["answer"])

        if session_id:
            memory_store.add_message(
                session_id, "assistant", result["answer"],
                model_id=active.get("id"), model_name=active.get("name")
            )

        return QueryResponse(
            question=result["question"],
            answer=result["answer"],
            context=result.get("context"),
            retrieval_metadata=result.get("retrieval_metadata"),
            generation_metadata=result.get("generation_metadata"),
            model_id=result.get("model_id"),
            model_name=result.get("model_name"),
            retrieved_chunks=result.get("retrieved_chunks", 0),
        )
    except Exception as e:
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── document ingestion ────────────────────────────────────────────

@app.post("/ingest", response_model=IngestionResponse)
async def ingest_documents(files: List[UploadFile] = File(...)):
    global rag_system
    if rag_system is None:
        raise HTTPException(status_code=503, detail="RAG system not initialized")
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    allowed = {".pdf", ".docx", ".html", ".txt", ".pptx", ".ppt"}
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in allowed:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    try:
        temp_paths = []
        for file in files:
            suffix = Path(file.filename).suffix
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            tmp.write(await file.read())
            tmp.close()
            temp_paths.append(Path(tmp.name))

        result = rag_system.ingest_documents(temp_paths)

        for p in temp_paths:
            try: p.unlink()
            except Exception: pass

        return IngestionResponse(
            processed_documents=result["processed_documents"],
            total_chunks=result["total_chunks"],
            errors=result["errors"],
            vector_store_info=result.get("vector_store_info"),
        )
    except Exception as e:
        logger.error(f"Ingestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── sessions ──────────────────────────────────────────────────────

@app.get("/sessions")
async def list_sessions():
    global memory_store
    if memory_store is None:
        raise HTTPException(status_code=503, detail="Memory store not initialized")
    return memory_store.list_sessions()

@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    global memory_store
    if memory_store is None:
        raise HTTPException(status_code=503, detail="Memory store not initialized")
    return memory_store.get_session_history(session_id)


# ── config ────────────────────────────────────────────────────────

@app.get("/config")
async def get_config():
    try:
        return load_config()
    except Exception as e:
        logger.error(f"Config error: {e}")
        raise HTTPException(status_code=500, detail="Failed to load configuration")


# ── file browser (for model/document selection) ───────────────────

@app.get("/setup/browse")
async def browse_filesystem(path: str = ""):
    try:
        if not path:
            path = os.path.expanduser("~")

        target = Path(path).resolve()
        if not target.exists():
            raise HTTPException(status_code=404, detail="Path not found")
        if not target.is_dir():
            raise HTTPException(status_code=400, detail="Not a directory")

        items = []
        try:
            for entry in sorted(target.iterdir(), key=lambda e: (not e.is_dir(), e.name.lower())):
                try:
                    items.append({
                        "name": entry.name,
                        "path": str(entry),
                        "is_dir": entry.is_dir(),
                        "size": entry.stat().st_size if entry.is_file() else None,
                        "ext": entry.suffix.lower() if entry.is_file() else None,
                    })
                except PermissionError:
                    continue
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied")

        parent = str(target.parent) if target.parent != target else None
        drives = [f"{d}:\\" for d in string.ascii_uppercase if os.path.exists(f"{d}:\\")] if os.name == "nt" else []

        return {"current": str(target), "parent": parent, "drives": drives, "items": items}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Browse error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("app.api.main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
