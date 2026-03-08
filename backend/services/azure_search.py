"""
CampusCoPilot – Azure AI Search Service
Uses Azure AI Search for RAG when configured, falls back to local ChromaDB.
"""

from __future__ import annotations
import logging
from typing import List, Optional

from backend.config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_INDEX, AZURE_SEARCH_KEY

logger = logging.getLogger("campuscopilot.azure_search")


def _use_azure_search() -> bool:
    return bool(AZURE_SEARCH_ENDPOINT and AZURE_SEARCH_KEY)


def index_documents(chunks: List[str], metadata_list: List[dict], collection_name: str = "") -> int:
    """Index text chunks. Routes to Azure Search or ChromaDB."""
    if _use_azure_search():
        try:
            return _index_azure(chunks, metadata_list)
        except Exception as exc:
            logger.warning("Azure AI Search indexing failed, falling back to ChromaDB: %s", exc)
    return _index_chromadb(chunks, metadata_list, collection_name)


def search_similar(query: str, n_results: int = 3, collection_name: str = "") -> List[str]:
    """Semantic search. Routes to Azure Search or ChromaDB."""
    if _use_azure_search():
        try:
            return _search_azure(query, n_results)
        except Exception as exc:
            logger.warning("Azure AI Search query failed, falling back to ChromaDB: %s", exc)
    return _search_chromadb(query, n_results, collection_name)


def reset_index(collection_name: str = ""):
    """Clear search index. Routes to Azure Search or ChromaDB."""
    if _use_azure_search():
        try:
            _reset_azure()
            return
        except Exception as exc:
            logger.warning("Azure AI Search reset failed: %s", exc)
    _reset_chromadb(collection_name)


# ── Azure AI Search implementation ───────────────────────────────────

def _index_azure(chunks: List[str], metadata_list: List[dict]) -> int:
    from azure.core.credentials import AzureKeyCredential
    from azure.search.documents import SearchClient

    client = SearchClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        index_name=AZURE_SEARCH_INDEX,
        credential=AzureKeyCredential(AZURE_SEARCH_KEY),
    )
    documents = []
    for i, (chunk, meta) in enumerate(zip(chunks, metadata_list)):
        documents.append({
            "id": f"chunk_{i}",
            "content": chunk,
            "source": meta.get("source", ""),
            "chunk_idx": str(meta.get("chunk_idx", i)),
        })
    # Upload in batches of 1000
    for batch_start in range(0, len(documents), 1000):
        batch = documents[batch_start:batch_start + 1000]
        client.upload_documents(documents=batch)
    logger.info("Azure AI Search: indexed %d documents", len(documents))
    return len(documents)


def _search_azure(query: str, n_results: int) -> List[str]:
    from azure.core.credentials import AzureKeyCredential
    from azure.search.documents import SearchClient

    client = SearchClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        index_name=AZURE_SEARCH_INDEX,
        credential=AzureKeyCredential(AZURE_SEARCH_KEY),
    )
    results = client.search(search_text=query, top=n_results, select=["content"])
    return [r["content"] for r in results]


def _reset_azure():
    from azure.core.credentials import AzureKeyCredential
    from azure.search.documents import SearchClient

    client = SearchClient(
        endpoint=AZURE_SEARCH_ENDPOINT,
        index_name=AZURE_SEARCH_INDEX,
        credential=AzureKeyCredential(AZURE_SEARCH_KEY),
    )
    # Delete all documents by searching and removing
    results = client.search(search_text="*", top=1000, select=["id"])
    ids = [{"id": r["id"]} for r in results]
    if ids:
        client.delete_documents(documents=ids)
        logger.info("Azure AI Search: deleted %d documents", len(ids))


# ── ChromaDB fallback implementation ─────────────────────────────────

def _index_chromadb(chunks: List[str], metadata_list: List[dict], collection_name: str) -> int:
    from backend.services.vector_store import index_chunks
    return index_chunks(chunks, metadata_list, collection_name or None)


def _search_chromadb(query: str, n_results: int, collection_name: str) -> List[str]:
    from backend.services.vector_store import query_similar
    return query_similar(query, n_results, collection_name or None)


def _reset_chromadb(collection_name: str):
    from backend.services.vector_store import reset_collection
    reset_collection(collection_name or None)
