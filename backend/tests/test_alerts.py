import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.main import app
from api.deps import get_current_user

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test.jwt.token"}
USER_ID = "user-uuid-123"
SAMPLE_ALERT = {
    "id": "alert-uuid", "user_id": USER_ID,
    "filters": {"state": "FL", "type": "tax_deed"},
    "email": "user@example.com", "active": True,
}

@patch("api.routes.alerts.get_supabase")
def test_create_alert(mock_sb):
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    mock = MagicMock()
    mock.table.return_value.insert.return_value.execute.return_value.data = [SAMPLE_ALERT]
    mock_sb.return_value = mock

    resp = client.post("/alerts", json={"filters": {"state": "FL"}, "email": "user@example.com"}, headers=AUTH_HEADERS)
    app.dependency_overrides.clear()
    assert resp.status_code == 201

@patch("api.routes.alerts.get_supabase")
def test_toggle_alert(mock_sb):
    app.dependency_overrides[get_current_user] = lambda: USER_ID
    mock = MagicMock()
    updated = {**SAMPLE_ALERT, "active": False}
    mock.table.return_value.update.return_value.eq.return_value.eq.return_value.execute.return_value.data = [updated]
    mock_sb.return_value = mock

    resp = client.patch("/alerts/alert-uuid", json={"active": False}, headers=AUTH_HEADERS)
    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["active"] is False
