"""
Tests for FastAPI backend — uses mongomock for isolated DB testing
Run: pytest tests/ -v
"""
import pytest
import sys
import os
import io
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from httpx import AsyncClient, ASGITransport


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
async def client():
    """
    Async test client. Mocks MongoDB so tests run without a live database.
    """
    from main import app

    # Build a mock collection that behaves like Motor
    mock_reports = []
    mock_queries = []

    async def mock_reports_find(*args, **kwargs):
        class FakeCursor:
            def sort(self, *a, **kw): return self
            def limit(self, *a): return self
            def __aiter__(self): return self
            _idx = 0
            async def __anext__(self_inner):
                if self_inner._idx >= len(mock_reports):
                    raise StopAsyncIteration
                doc = mock_reports[self_inner._idx]
                self_inner._idx += 1
                return doc
        return FakeCursor()

    async def mock_insert_one(doc):
        from bson import ObjectId
        oid = ObjectId()
        doc["_id"] = oid
        mock_reports.append(doc)
        result = MagicMock()
        result.inserted_id = oid
        return result

    async def mock_find_one(query):
        from bson import ObjectId
        oid = query.get("_id")
        for r in mock_reports:
            if r.get("_id") == oid:
                return r
        return None

    async def mock_delete_one(query):
        from bson import ObjectId
        oid = query.get("_id")
        for i, r in enumerate(mock_reports):
            if r.get("_id") == oid:
                mock_reports.pop(i)
                return MagicMock(deleted_count=1)
        return MagicMock(deleted_count=0)

    async def mock_update_one(*args, **kwargs):
        return MagicMock()

    async def mock_q_insert(doc):
        mock_queries.append(doc)
        result = MagicMock()
        from bson import ObjectId
        result.inserted_id = ObjectId()
        return result

    async def mock_q_find(*args, **kwargs):
        class FakeQCursor:
            def sort(self, *a, **kw): return self
            def limit(self, *a): return self
            def __aiter__(self): return self
            _idx = 0
            async def __anext__(self_inner):
                if self_inner._idx >= len(mock_queries):
                    raise StopAsyncIteration
                doc = mock_queries[self_inner._idx]
                self_inner._idx += 1
                return dict(doc, _id=str(doc.get("_id", "test")))
        return FakeQCursor()

    mock_reports_col = MagicMock()
    mock_reports_col.find = MagicMock(return_value=None)
    mock_reports_col.find.return_value = MagicMock(
        sort=lambda *a, **k: MagicMock(
            limit=lambda *a: _AsyncIteratorFromList(mock_reports)
        )
    )
    mock_reports_col.insert_one = mock_insert_one
    mock_reports_col.find_one = mock_find_one
    mock_reports_col.delete_one = mock_delete_one
    mock_reports_col.update_one = mock_update_one

    mock_queries_col = MagicMock()
    mock_queries_col.insert_one = mock_q_insert
    mock_queries_col.find = MagicMock(return_value=_AsyncIteratorFromList([]))

    with patch("services.db.get_reports_collection", return_value=mock_reports_col), \
         patch("services.db.get_queries_collection", return_value=mock_queries_col):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac


class _AsyncIteratorFromList:
    """Helper to turn a list into an async iterable with .sort().limit() chain."""
    def __init__(self, items):
        self._items = list(items)

    def sort(self, *a, **kw):
        return self

    def limit(self, n):
        self._items = self._items[:n]
        return self

    def __aiter__(self):
        self._idx = 0
        return self

    async def __anext__(self):
        if self._idx >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._idx]
        self._idx += 1
        return item


# ─── Health Tests ─────────────────────────────────────────────────────────────

async def test_health_returns_ok(client):
    """Health endpoint returns status=ok."""
    r = await client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
    assert "service" in data


async def test_root_returns_docs_link(client):
    """Root endpoint returns docs link."""
    r = await client.get("/")
    assert r.status_code == 200
    assert "docs" in r.json()


# ─── Chat Tests ───────────────────────────────────────────────────────────────

async def test_chat_rejects_empty_query(client):
    """Empty query_text must return HTTP 400."""
    r = await client.post("/api/chat", json={"query_text": "  ", "session_id": "s"})
    assert r.status_code == 400
    assert "empty" in r.json()["detail"].lower()


async def test_chat_rejects_oversized_query(client):
    """query_text > 2000 chars must return HTTP 400."""
    r = await client.post("/api/chat", json={"query_text": "A" * 2001, "session_id": "s"})
    assert r.status_code == 400


async def test_chat_returns_sse_stream(client):
    """A valid query must return text/event-stream."""
    r = await client.post(
        "/api/chat",
        json={"query_text": "What is the outlook for semiconductor stocks?", "session_id": "sess-1"},
        timeout=30,
    )
    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]


async def test_chat_stream_ends_with_done(client):
    """The SSE body must end with [DONE] sentinel."""
    r = await client.post(
        "/api/chat",
        json={"query_text": "Summarize tech sector risks.", "session_id": "sess-2"},
        timeout=30,
    )
    assert r.status_code == 200
    assert "[DONE]" in r.text


async def test_chat_mock_response_contains_content(client):
    """In demo mode the mock response must include meaningful text."""
    r = await client.post(
        "/api/chat",
        json={"query_text": "EU renewable energy trends", "session_id": "sess-3"},
        timeout=30,
    )
    assert r.status_code == 200
    # The mock response should have at least some SSE data lines
    assert "data:" in r.text


# ─── Reports Tests ────────────────────────────────────────────────────────────

async def test_reports_list_is_always_a_list(client):
    """GET /api/reports always returns a JSON array."""
    r = await client.get("/api/reports")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_upload_rejects_exe(client):
    """Uploading a non-allowed extension returns 400."""
    r = await client.post(
        "/api/reports/upload",
        files={"file": ("virus.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
    )
    assert r.status_code == 400
    assert "Unsupported" in r.json()["detail"]


async def test_upload_rejects_large_file(client):
    """Uploading a file bigger than 20MB returns 413."""
    big = b"x" * (21 * 1024 * 1024)
    r = await client.post(
        "/api/reports/upload",
        files={"file": ("big.txt", io.BytesIO(big), "text/plain")},
    )
    assert r.status_code == 413


async def test_upload_txt_succeeds(client):
    """A valid .txt upload returns 200 with _id and pending status."""
    content = (
        b"Q3 Technology Sector Report\n"
        b"Semiconductor demand is rising due to AI compute needs.\n"
        b"TSMC expects 3nm orders to grow by 18% next quarter.\n"
    )
    r = await client.post(
        "/api/reports/upload",
        files={"file": ("q3_tech_report.txt", io.BytesIO(content), "text/plain")},
    )
    assert r.status_code == 200
    data = r.json()
    assert "_id" in data
    assert data["embedding_status"] == "pending"
    assert "Technology" in data["sector"] or data["sector"] == "General"


async def test_delete_with_invalid_objectid(client):
    """Deleting with a non-ObjectId string returns 400."""
    r = await client.delete("/api/reports/not-valid-id")
    assert r.status_code == 400


async def test_delete_nonexistent_report(client):
    """Deleting an ObjectId that doesn't exist returns 404."""
    r = await client.delete("/api/reports/000000000000000000000000")
    assert r.status_code == 404


# ─── Queries Tests ────────────────────────────────────────────────────────────

async def test_query_history_returns_list(client):
    """GET /api/queries returns a list."""
    r = await client.get("/api/queries?limit=10")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


async def test_query_history_respects_limit(client):
    """Limit parameter is accepted."""
    r = await client.get("/api/queries?limit=5")
    assert r.status_code == 200
    # Should never return more than 5
    assert len(r.json()) <= 5
