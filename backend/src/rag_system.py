import logging
from typing import List, Dict, Any, Optional
from pathlib import Path

from src.document_processing.factory import DocumentProcessorFactory
from src.chunking.factory import ChunkerFactory
from src.embedding.sentence_transformer import SentenceTransformerEmbedder
from src.vector_store.factory import VectorStoreFactory
from src.retrieval.factory import RetrieverFactory
from src.generation.factory import GeneratorFactory
from src.evaluation.factory import EvaluationFactory
from src.evaluation.base import RAGEvaluationInput

logger = logging.getLogger(__name__)


class RAGSystem:
    """Complete RAG system integrating all components."""
    
    def __init__(self, config: Dict[str, Any], model_manager=None):
        self.config = config
        
        self.doc_processor = DocumentProcessorFactory()
        self.chunker_factory = ChunkerFactory(config.get('chunking', {}))
        
        raw_embedding_config = dict(config.get('embedding', {}))
        raw_embedding_config.setdefault('model_name', raw_embedding_config.pop('default_model', 'all-MiniLM-L6-v2'))

        allowed_embedder_keys = {'model_name', 'batch_size', 'device', 'normalize_embeddings', 'show_progress'}
        embedding_config = {k: v for k, v in raw_embedding_config.items() if k in allowed_embedder_keys}

        self.embedder = SentenceTransformerEmbedder(**embedding_config)
        
        vector_store_factory = VectorStoreFactory(config.get('vector_store', {}))
        self.vector_store = vector_store_factory.get_default_store()
        
        retriever_factory = RetrieverFactory(config.get('retrieval', {}))
        self.retriever = retriever_factory.get_default_retriever(
            self.vector_store, self.embedder
        )
        
        self.generator_factory = GeneratorFactory(
            config.get('generation', {}), model_manager=model_manager
        )
        self.generator = self.generator_factory.get_default_generator()
        
        evaluation_factory = EvaluationFactory(config.get('evaluation', {}))
        self.evaluator = evaluation_factory.create_evaluator()
        
        logger.info("RAG system initialized successfully")
    
    def ingest_documents(self, file_paths: List[Path]) -> Dict[str, Any]:
        """
        Ingest documents into the RAG system.
        
        Args:
            file_paths: List of document file paths
            
        Returns:
            Ingestion summary
        """
        logger.info(f"Starting ingestion of {len(file_paths)} documents")
        
        processed_docs = 0
        total_chunks = 0
        errors = []
        
        for file_path in file_paths:
            try:
                # Process document
                document = self.doc_processor.process_document(file_path)
                if not document:
                    errors.append(f"Failed to process {file_path}")
                    continue
                
                # Chunk document
                chunks = self.chunker_factory.chunk_document(document)
                if not chunks:
                    errors.append(f"No chunks created for {file_path}")
                    continue
                
                # Generate embeddings
                embeddings = self.embedder.embed_chunks(chunks)
                
                # Store in vector database
                self.vector_store.add_embeddings(embeddings)
                
                processed_docs += 1
                total_chunks += len(chunks)
                
                logger.info(f"Processed {file_path}: {len(chunks)} chunks")
                
            except Exception as e:
                error_msg = f"Error processing {file_path}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        summary = {
            "processed_documents": processed_docs,
            "total_chunks": total_chunks,
            "errors": errors,
            "vector_store_info": self.vector_store.get_collection_info()
        }
        
        logger.info(f"Ingestion complete: {processed_docs} documents, {total_chunks} chunks")
        return summary
    
    def query(self, question: str, top_k: int = 5, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        try:
            retrieval_result = self.retriever.retrieve(question, top_k=top_k)
            context = retrieval_result.get_context()
            generation_result = self.generator.generate(question, context, chat_history=chat_history)
            
            return {
                "question": question,
                "answer": generation_result.response,
                "context": context,
                "retrieval_metadata": retrieval_result.metadata,
                "generation_metadata": generation_result.metadata,
                "model_id": generation_result.metadata.get("model_id"),
                "model_name": generation_result.metadata.get("model"),
                "retrieved_chunks": len(retrieval_result.results)
            }
            
        except Exception as e:
            logger.error(f"Error processing query '{question}': {str(e)}")
            return {
                "question": question,
                "answer": f"Error processing query: {str(e)}",
                "error": True
            }
    
    def evaluate(
        self, 
        test_data: List[Dict[str, str]], 
        experiment_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluate the RAG system performance.
        
        Args:
            test_data: List of test cases with 'query' and optionally 'expected_answer'
            experiment_name: Optional experiment name
            
        Returns:
            Evaluation results
        """
        logger.info(f"Starting evaluation with {len(test_data)} test cases")
        
        # Prepare evaluation inputs
        evaluation_inputs = []
        
        for test_case in test_data:
            query = test_case['query']
            expected_answer = test_case.get('expected_answer')
            
            # Get system response
            result = self.query(query)
            
            # Create evaluation input
            eval_input = RAGEvaluationInput(
                query=query,
                expected_answer=expected_answer,
                retrieved_context=result.get('context'),
                generated_answer=result.get('answer'),
                metadata={
                    'retrieval_metadata': result.get('retrieval_metadata'),
                    'generation_metadata': result.get('generation_metadata')
                }
            )
            evaluation_inputs.append(eval_input)
        
        # Run evaluation
        return self.evaluator.evaluate_batch(evaluation_inputs, experiment_name)

