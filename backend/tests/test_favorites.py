import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app
from api.deps import get_current_user

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test.jwt.token"}
USER_ID = "user-uuid-123"

@patch("api.routes.favorites.get_supabase")
def test_create_favorite(mock_sb):
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "fav-uuid", "user_id": USER_ID, "auction_id": "auc-uuid", "notes": None
    }]
    mock_sb.return_value = mock

    resp = client.post("/favorites", json={"auction_id": "auc-uuid"}, headers=AUTH_HEADERS)
    app.dependency_overrides.clear()
    assert resp.status_code == 201

@patch("api.routes.favorites.get_supabase")
def test_list_favorites(mock_sb):
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    mock = MagicMock()
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.return_value = mock

    resp = client.get("/favorites", headers=AUTH_HEADERS)
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@patch("api.routes.favorites.get_supabase")
def test_delete_favorite(mock_sb):
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    mock = MagicMock()
    mock.table.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "fav-uuid"}]
    mock_sb.return_value = mock

    resp = client.delete("/favorites/fav-uuid", headers=AUTH_HEADERS)
    app.dependency_overrides.clear()
    assert resp.status_code == 204
