#!/bin/bash
# Script to pull required models into the Ollama container

set -e

# Default models
LLM_MODEL=${1:-"llama3"}

echo "Waiting for Ollama service to start..."
# Give it a few seconds to ensure the API is fully up
sleep 5

echo "Pulling $LLM_MODEL..."
docker exec -it ollama ollama run $LLM_MODEL "Return 'Done'"

echo "Model $LLM_MODEL is ready to use!"
