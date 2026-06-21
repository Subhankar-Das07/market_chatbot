"""
Document text extraction helpers.
Supports PDF (via PyMuPDF) and CSV/TXT.
"""
import csv
import io
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path: str, mime_type: str = "") -> str:
    """
    Extract raw text from a file path.
    Returns empty string on failure.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    try:
        if suffix == ".pdf":
            return _extract_pdf(file_path)
        elif suffix == ".csv":
            return _extract_csv(file_path)
        elif suffix in (".txt", ".md"):
            return path.read_text(encoding="utf-8", errors="replace")
        else:
            logger.warning(f"Unsupported file type: {suffix}")
            return ""
    except Exception as e:
        logger.error(f"Text extraction failed for {file_path}: {e}")
        return ""


def extract_text_from_url(url: str) -> str:
    """Extract text from a webpage using WebBaseLoader."""
    try:
        from langchain_community.document_loaders import WebBaseLoader
        loader = WebBaseLoader(url)
        docs = loader.load()
        return "\n\n".join([d.page_content for d in docs])
    except ImportError:
        logger.warning("WebBaseLoader requires beautifulsoup4.")
        return ""
    except Exception as e:
        logger.error(f"URL extraction failed for {url}: {e}")
        return ""


def _extract_pdf(file_path: str) -> str:
    try:
        import fitz  # PyMuPDF
        text_parts = []
        with fitz.open(file_path) as doc:
            for page in doc:
                text_parts.append(page.get_text())
        return "\n\n".join(text_parts)
    except ImportError:
        logger.warning("PyMuPDF not installed. PDF extraction unavailable.")
        return "[PDF text extraction requires PyMuPDF. Install: pip install pymupdf]"
    except Exception as e:
        logger.error(f"PDF extraction error: {e}")
        return ""


def _extract_csv(file_path: str) -> str:
    try:
        rows = []
        with open(file_path, newline="", encoding="utf-8", errors="replace") as f:
            reader = csv.reader(f)
            for row in reader:
                rows.append(", ".join(row))
        return "\n".join(rows)
    except Exception as e:
        logger.error(f"CSV extraction error: {e}")
        return ""


def detect_sector(text: str, filename: str) -> str:
    """Simple keyword-based sector detection."""
    text_lower = (text[:2000] + filename).lower()
    sectors = {
        "Technology": ["semiconductor", "software", "cloud", "ai", "tech", "saas"],
        "Finance":    ["bank", "finance", "credit", "yield", "bond", "equity", "fund"],
        "Energy":     ["oil", "gas", "renewable", "wind", "solar", "energy"],
        "Healthcare": ["pharma", "biotech", "clinical", "drug", "health", "medical"],
        "Auto":       ["automotive", "electric vehicle", "ev", "tesla", "supply chain auto"],
        "Real Estate":["reit", "real estate", "property", "mortgage"],
    }
    for sector, keywords in sectors.items():
        if any(kw in text_lower for kw in keywords):
            return sector
    return "General"
