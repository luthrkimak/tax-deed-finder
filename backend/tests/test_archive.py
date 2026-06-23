from unittest.mock import MagicMock, patch, call
from datetime import date


@patch("scheduler.get_supabase")
def test_archive_past_auctions_updates_status(mock_get_supabase):
    mock_sb = MagicMock()
    mock_sb.table.return_value.update.return_value.lt.return_value.neq.return_value.execute.return_value.data = [
        {"id": "1"}, {"id": "2"}
    ]
    mock_get_supabase.return_value = mock_sb

    from scheduler import archive_past_auctions
    archive_past_auctions()

    mock_sb.table.assert_called_with("auctions")
    mock_sb.table.return_value.update.assert_called_with({"status": "archived"})


@patch("scheduler.get_supabase")
def test_archive_past_auctions_does_not_rearchive(mock_get_supabase):
    mock_sb = MagicMock()
    chain = mock_sb.table.return_value.update.return_value.lt.return_value.neq.return_value
    chain.execute.return_value.data = []
    mock_get_supabase.return_value = mock_sb

    from scheduler import archive_past_auctions
    archive_past_auctions()

    # neq("status", "archived") deve ter sido chamado
    mock_sb.table.return_value.update.return_value.lt.return_value.neq.assert_called_with("status", "archived")
