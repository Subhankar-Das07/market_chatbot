"""
RAG (Retrieval-Augmented Generation) Service
Uses LangChain + OpenAI + FAISS for document Q&A.
Supports multi-turn conversation memory and token counting.
"""
import os
import json
import logging
import asyncio
from pathlib import Path
from typing import AsyncGenerator, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pymongo
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from utils.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Prompt ──────────────────────────────────────────────────────────────────
SYSTEM_TEMPLATE = """You are an elite AI Financial Analyst at an enterprise market intelligence firm.
Your role is to provide precise, data-grounded insights based strictly on the provided context.

CONTEXT FROM MARKET REPORTS:
{context}

RESPONSE GUIDELINES:
- Be analytical and concise. Use bullet points for multi-part answers.
- Use Markdown formatting (bold, italics, lists, tables).
- Cite specific data points or report sections when possible.
- If the context doesn't contain enough information, state that clearly and rely on your general financial knowledge only if safe and explicitly noting it.
- Format numbers with proper notation (e.g., $1.2B, 4.5%, Q3 2024).
"""


class RAGService:
    def __init__(self):
        self.embeddings = None
        self.vector_store = None
        self.llm = None
        self._initialized = False

    def _init_components(self):
        """Lazy initialization — only when API key is present."""
        if self._initialized:
            return True
        if not settings.GROQ_API_KEY:
            logger.error("GROQ_API_KEY not set in .env")
            return False
        try:
            # 100% Free local embeddings
            self.embeddings = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2"
            )
            # Free cloud LLM via Groq
            self.llm = ChatGroq(
                api_key=settings.GROQ_API_KEY,
                model_name=settings.GROQ_MODEL,
                temperature=0.1,
                max_retries=2,
                streaming=True,
            )
            
            # MongoDB Atlas Vector Search
            client = pymongo.MongoClient(settings.MONGODB_URI)
            collection = client[settings.MONGODB_DB]["vector_store"]
            
            self.vector_store = MongoDBAtlasVectorSearch(
                collection=collection,
                embedding=self.embeddings,
                index_name="vector_index",
            )
            
            self._initialized = True
            return True
        except Exception as e:
            logger.error(f"RAG init error: {e}")
            return False

    def count_tokens(self, text: str) -> int:
        """Count tokens using a simple word split for local fallback."""
        return len(text.split())

    # ── Indexing ─────────────────────────────────────────────────────────────

    async def index_document(self, text: str, metadata: dict) -> int:
        """Split text into chunks and add to FAISS vector store. Returns chunk count."""
        if not self._init_components():
            return 0
        try:
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=150,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            chunks = splitter.create_documents(
                [text],
                metadatas=[metadata] * 1,
            )
            for chunk in chunks:
                chunk.metadata = metadata

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, self.vector_store.add_documents, chunks)

            logger.info(f"Indexed {len(chunks)} chunks in Atlas for: {metadata.get('title')}")
            return len(chunks)
        except Exception as e:
            logger.error(f"Indexing error: {e}")
            return 0

    async def delete_document(self, report_id: str) -> bool:
        """Removes all chunks associated with a report_id directly from the MongoDB collection."""
        if not self._init_components() or self.vector_store is None:
            return False
            
        try:
            loop = asyncio.get_event_loop()
            collection = self.vector_store.collection
            result = await loop.run_in_executor(
                None, 
                collection.delete_many, 
                {"report_id": report_id}
            )
            logger.info(f"Deleted {result.deleted_count} chunks from Atlas for report_id: {report_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting from Atlas: {e}")
            return False

    async def generate_summary(self, report_id: str) -> str:
        """Retrieves first 4 chunks and generates a 3-bullet summary via Groq."""
        if not self._init_components() or self.vector_store is None:
            return "Summary generation unavailable."

        chunks_text = []
        try:
            loop = asyncio.get_event_loop()
            collection = self.vector_store.collection
            # Retrieve directly from MongoDB without vector search
            cursor = await loop.run_in_executor(None, lambda: list(collection.find({"report_id": report_id}).limit(4)))
            for doc in cursor:
                chunks_text.append(doc.get("text", ""))
        except Exception as e:
            logger.error(f"Failed to fetch chunks from Atlas for summary: {e}")

        if not chunks_text:
            return "No document content found to summarize."

        context = "\n\n".join(chunks_text)
        
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content="You are a financial analyst. Summarize the following text in exactly 3 bullet points."),
                HumanMessage(content=context)
            ]
            response = await self.llm.ainvoke(messages)
            return response.content
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return "Failed to generate summary."

    # ── Query (streaming) ────────────────────────────────────────────────────

    async def query_stream(
        self, 
        query_text: str, 
        chat_history: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream tokens from the RAG pipeline.
        chat_history: list of dicts with 'role' (user/assistant) and 'content'.
        Yields plain text chunks; final yield is sources and token count JSON.
        """
        if not self._init_components():
            yield "⚠️ Server Error: AI components failed to initialize. Is GROQ_API_KEY set in the environment?"
            return

        try:
            # 1. Retrieve Context
            docs = []
            if self.vector_store is not None:
                retriever = self.vector_store.as_retriever(
                    search_type="similarity",
                    search_kwargs={"k": 5},
                )
                docs = await asyncio.get_event_loop().run_in_executor(
                    None, retriever.invoke, query_text
                )

            context_str = "\n\n---\n\n".join(
                f"[{d.metadata.get('title', 'Document')}]\n{d.page_content}" for d in docs
            )
            sources = list({d.metadata.get("title", "Unknown") for d in docs})

            # 2. Build Messages
            messages = [
                SystemMessage(content=SYSTEM_TEMPLATE.format(context=context_str))
            ]
            
            # Add history (last 10 messages max to prevent context bloat)
            if chat_history:
                for msg in chat_history[-10:]:
                    if msg["role"] == "user":
                        messages.append(HumanMessage(content=msg["content"]))
                    elif msg["role"] == "assistant":
                        messages.append(AIMessage(content=msg["content"]))

            # Add current query
            messages.append(HumanMessage(content=query_text))

            # 3. Stream from OpenAI
            full_response = ""
            async for chunk in self.llm.astream(messages):
                token = chunk.content
                if token:
                    full_response += token
                    yield token

            # 4. Calculate Tokens
            prompt_text = "".join([m.content for m in messages])
            total_tokens = self.count_tokens(prompt_text) + self.count_tokens(full_response)

            # 5. Send Metadata
            metadata = {
                "sources": sources,
                "token_count": total_tokens
            }
            yield f"\n__METADATA__:{json.dumps(metadata)}"

        except Exception as e:
            logger.error(f"RAG query error: {e}")
            if "rate_limit" in str(e).lower():
                yield "⚠️ Groq rate limit reached. Please wait a moment and try again."
            else:
                yield f"⚠️ Analysis error: {str(e)[:200]}"


rag_service = RAGService()
