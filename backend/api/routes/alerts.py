from fastapi import APIRouter, Depends, HTTPException, status
from db.client import get_supabase
from api.deps import get_current_user
from models.alert import AlertCreate, AlertUpdate

router = APIRouter()

@router.post("", status_code=201)
def create_alert(body: AlertCreate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").insert({
        "user_id": user_id,
        "filters": body.filters,
        "email": body.email,
    }).execute()
    return result.data[0]

@router.get("")
def list_alerts(user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").select("*").eq("user_id", user_id).execute()
    return result.data

@router.patch("/{alert_id}")
def update_alert(alert_id: str, body: AlertUpdate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    updates = body.model_dump(exclude_none=True)
    result = sb.table("alerts").update(updates).eq("id", alert_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result.data[0]

@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("alerts").delete().eq("id", alert_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Alert not found")
