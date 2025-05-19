from fastapi import APIRouter, Query
import httpx

router = APIRouter()

@router.get("/activities")
async def get_activities(access_token: str, per_page: int = 5):
    async with httpx.AsyncClient() as client:
        url = "https://www.strava.com/api/v3/athlete/activities"
        headers = {"Authorization": f"Bearer {access_token}"}
        response = await client.get(url, headers=headers, params={"per_page": per_page})
        return response.json()

@router.get("/streams/{activity_id}")
async def get_streams(activity_id: int, access_token: str):
    async with httpx.AsyncClient() as client:
        url = f"https://www.strava.com/api/v3/activities/{activity_id}/streams"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {"keys": "heartrate,time,latlng,distance,cadence", "key_by_type": "true"}
        response = await client.get(url, headers=headers, params=params)
        return response.json()
