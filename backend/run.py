#!/usr/bin/env python3
"""
Simple startup script for the RAG System.
Run this to start the FastAPI server locally.
"""

import uvicorn
from app.config.loader import load_config

if __name__ == "__main__":
    # Load configuration
    config = load_config()
    
    import os
    
    # Get server configuration
    host = os.getenv("RAG_API_HOST", "127.0.0.1")
    port = int(os.getenv("RAG_API_PORT", "8000"))
    log_level = "info"
    
    print(f"Starting RAG System API server...")
    print(f"Host: {host}")
    print(f"Port: {port}")
    print(f"API Documentation: http://{host}:{port}/docs")
    print(f"Health Check: http://{host}:{port}/healthz")
    print("Press Ctrl+C to stop the server")
    
    # Start the server
    uvicorn.run(
        "app.api.main:app",
        host=host,
        port=port,
        reload=True,
        log_level=log_level
    )
