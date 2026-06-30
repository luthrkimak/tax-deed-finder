import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app

client = TestClient(app)

SAMPLE_AUCTION = {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "tax_deed",
    "status": "upcoming",
    "state": "FL",
    "county": "Orange",
    "address": "123 Main St, Orlando, FL",
    "min_bid": "45000.00",
    "source": "scrape",
}

def make_mock_supabase(data, count=1):
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.data = data
    mock.table.return_value.select.return_value.eq.return_value.range.return_value.execute.return_value.count = count
    return mock

@patch("api.routes.auctions.get_supabase")
def test_get_auctions_returns_list(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = [SAMPLE_AUCTION]
    result.count = 1

    # Build a chainable query mock: every filter method returns itself
    q = MagicMock()
    q.in_.return_value = q
    q.eq.return_value = q
    q.not_ = MagicMock()
    q.not_.in_.return_value = q
    q.gte.return_value = q
    q.lte.return_value = q
    q.order.return_value = q
    q.range.return_value = q
    q.execute.return_value = result
    mock_sb.table.return_value.select.return_value = q
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions")
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert body["total"] == 1

@patch("api.routes.auctions.get_supabase")
def test_get_auction_by_id(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = [SAMPLE_AUCTION]
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = result
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions/123e4567-e89b-12d3-a456-426614174000")
    assert response.status_code == 200
    assert response.json()["state"] == "FL"

@patch("api.routes.auctions.get_supabase")
def test_get_auction_not_found(mock_get_supabase):
    mock_sb = MagicMock()
    result = MagicMock()
    result.data = []
    mock_sb.table.return_value.select.return_value.eq.return_value.execute.return_value = result
    mock_get_supabase.return_value = mock_sb

    response = client.get("/auctions/nonexistent-id")
    assert response.status_code == 404
