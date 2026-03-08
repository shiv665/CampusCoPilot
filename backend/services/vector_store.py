"""
CampusCoPilot – Local Vector Store (ChromaDB)
Budget-friendly RAG: no Azure AI Search needed.
"""

from __future__ import annotations
from typing import Dict, List, Optional

import chromadb

from backend.config import CHROMA_PERSIST_DIR, CHROMA_COLLECTION


_client: Optional[chromadb.ClientAPI] = None


def _get_client() -> chromadb.ClientAPI:
    """Get or create a persistent ChromaDB client (works with chromadb>=0.4)."""
    global _client
    if _client is None:
        try:
            # chromadb >= 0.4 API
            _client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)
        except AttributeError:
            # Fallback for older chromadb versions
            _client = chromadb.Client(
                chromadb.Settings(
                    chroma_db_impl="duckdb+parquet",
                    persist_directory=CHROMA_PERSIST_DIR,
                    anonymized_telemetry=False,
                )
            )
    return _client


def get_or_create_collection(name: str = CHROMA_COLLECTION):
    """Return (or create) a ChromaDB collection."""
    client = _get_client()
    return client.get_or_create_collection(
        name=name or CHROMA_COLLECTION,
        metadata={"hnsw:space": "cosine"},
    )


def index_chunks(
    chunks: List[str],
    metadata_list: Optional[List[Dict]] = None,
    collection_name: Optional[str] = None,
) -> int:
    """
    Add text chunks to the vector store.
    Returns number of chunks indexed.
    """
    if not chunks:
        return 0
    collection = get_or_create_collection(collection_name)
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    metadatas = metadata_list or [{"index": i} for i in range(len(chunks))]
    collection.add(documents=chunks, ids=ids, metadatas=metadatas)
    return len(chunks)


def query_similar(
    query_text: str,
    n_results: int = 5,
    collection_name: Optional[str] = None,
) -> List[str]:
    """
    Retrieve the most relevant chunks for a query string.
    """
    collection = get_or_create_collection(collection_name)
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results,
    )
    # results["documents"] is [[str, ...]]
    return results["documents"][0] if results["documents"] else []


def reset_collection(collection_name: Optional[str] = None):
    """Delete all items in a collection (useful between uploads)."""
    client = _get_client()
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass
