from fastapi import APIRouter, Depends, HTTPException, status
from db.client import get_supabase
from api.deps import get_current_user
from models.favorite import FavoriteCreate

router = APIRouter()

@router.post("", status_code=201)
def create_favorite(body: FavoriteCreate, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").insert({
        "user_id": user_id,
        "auction_id": body.auction_id,
        "notes": body.notes,
    }).execute()
    return result.data[0]

@router.get("")
def list_favorites(user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").select("*, auctions(*)").eq("user_id", user_id).execute()
    return result.data

@router.delete("/{favorite_id}", status_code=204)
def delete_favorite(favorite_id: str, user_id: str = Depends(get_current_user)):
    sb = get_supabase()
    result = sb.table("favorites").delete().eq("id", favorite_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Favorite not found")
