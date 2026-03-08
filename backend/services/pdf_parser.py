"""
CampusCoPilot – PDF Parser Service
Primary: Azure Document Intelligence (OCR, handwritten notes, complex layouts).
Fallback: PyPDF2 (free, local — used when Azure DI keys are not set).
"""

from __future__ import annotations
import logging
import re
from pathlib import Path
from typing import List, Tuple

from PyPDF2 import PdfReader

from backend.config import AZURE_DI_ENDPOINT, AZURE_DI_KEY

logger = logging.getLogger("campuscopilot.pdf_parser")


def _use_azure_di() -> bool:
    return bool(AZURE_DI_ENDPOINT and AZURE_DI_KEY)


def extract_text_from_pdf(file_path: str | Path) -> Tuple[str, int]:
    """
    Extract text from a PDF.
    Uses Azure Document Intelligence when configured, else falls back to PyPDF2.
    """
    if _use_azure_di():
        try:
            return _extract_with_azure_di(file_path)
        except Exception as exc:
            logger.warning("Azure Document Intelligence failed, falling back to PyPDF2: %s", exc)

    return _extract_with_pypdf2(file_path)


def _extract_with_azure_di(file_path: str | Path, content_type: str = "application/pdf") -> Tuple[str, int]:
    """Use Azure Document Intelligence (Form Recognizer) to extract text + OCR."""
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
    from azure.core.credentials import AzureKeyCredential

    client = DocumentIntelligenceClient(
        endpoint=AZURE_DI_ENDPOINT,
        credential=AzureKeyCredential(AZURE_DI_KEY),
    )

    with open(str(file_path), "rb") as f:
        poller = client.begin_analyze_document(
            "prebuilt-read",
            body=f,
            content_type="application/octet-stream", # Let Azure detect it, or use octet-stream for binary files
        )
    result = poller.result()

    full_text = result.content or ""
    page_count = len(result.pages) if result.pages else 0
    logger.info("Azure DI extracted %d pages, %d chars", page_count, len(full_text))
    return full_text, page_count


def _extract_with_pypdf2(file_path: str | Path) -> Tuple[str, int]:
    """Local fallback using PyPDF2."""
    reader = PdfReader(str(file_path))
    pages: List[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        pages.append(text)
    full_text = "\n\n".join(pages)
    return full_text, len(reader.pages)


def scan_document(file_path: str | Path) -> str:
    """Generic OCR function for images and PDFs."""
    ext = Path(file_path).suffix.lower()
    if _use_azure_di():
        try:
            text, _ = _extract_with_azure_di(file_path)
            return text
        except Exception as exc:
            logger.warning("Azure Document Intelligence failed: %s", exc)
            if ext in [".jpeg", ".jpg", ".png", ".bmp", ".tiff"]:
                raise RuntimeError("Failed to process image OCR. Ensure Azure Document Intelligence is configured properly.") from exc

    if ext == ".pdf":
        text, _ = _extract_with_pypdf2(file_path)
        return text
    else:
        raise ValueError("Local extraction fallback (PyPDF2) only supports PDFs. Azure DI required for images.")


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """
    Split text into overlapping chunks for vector-store indexing.
    Uses sentence-aware splitting when possible.
    """
    # Split on double newlines first, then further split long blocks
    paragraphs = re.split(r"\n{2,}", text)
    chunks: List[str] = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        if len(current) + len(para) + 1 <= chunk_size:
            current = f"{current}\n{para}" if current else para
        else:
            if current:
                chunks.append(current)
            # If single paragraph exceeds chunk_size, split by sentences
            if len(para) > chunk_size:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                buf = ""
                for sent in sentences:
                    if len(buf) + len(sent) + 1 <= chunk_size:
                        buf = f"{buf} {sent}" if buf else sent
                    else:
                        if buf:
                            chunks.append(buf)
                        buf = sent
                if buf:
                    current = buf
                else:
                    current = ""
            else:
                current = para

    if current:
        chunks.append(current)

    # Add overlapping context between chunks
    if overlap and len(chunks) > 1:
        overlapped: List[str] = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:]
            overlapped.append(prev_tail + " " + chunks[i])
        return overlapped

    return chunks


def extract_topics_heuristic(text: str) -> List[str]:
    """
    A lightweight heuristic to pull topic-like headings from syllabus text.
    Falls back gracefully – the Llama model does the real extraction.
    """
    patterns = [
        # Numbered headings: "1. Introduction to …", "Module 3: …"
        r"(?:^|\n)\s*(?:Module|Unit|Chapter|Topic|Lecture|Week)?\s*\d+[\.\:\)]\s*(.+)",
        # ALL CAPS headings
        r"(?:^|\n)\s*([A-Z][A-Z\s]{4,}[A-Z])\s*(?:\n|$)",
        # Roman numeral headings
        r"(?:^|\n)\s*(?:[IVXLC]+)[\.\)]\s*(.+)",        # LaTeX section/subsection headings: \section*{Title}, \subsection{Title}
        r"\\(?:sub)*section\*?\{([^}]+)\}",    ]
    topics: List[str] = []
    for pat in patterns:
        for m in re.finditer(pat, text):
            candidate = m.group(1).strip()
            if 3 < len(candidate) < 120:
                topics.append(candidate)

    # Deduplicate while preserving order
    seen: set = set()
    unique: List[str] = []
    for t in topics:
        key = t.lower()
        if key not in seen:
            seen.add(key)
            unique.append(t)
    return unique
