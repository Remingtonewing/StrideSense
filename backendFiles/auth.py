import os
from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
import httpx

load_dotenv(dotenv_path=".env")

router = APIRouter()

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")

@router.get("/login")
def login():
    url = (
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={CLIENT_ID}&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&approval_prompt=force&scope=activity:read_all"
    )
    return RedirectResponse(url)

@router.get("/callback")
async def callback(code: str):
    async with httpx.AsyncClient() as client:
        response = await client.post("https://www.strava.com/oauth/token", data={
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code"
        })

        token_data = response.json()
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_at": token_data.get("expires_at"),
            "athlete": token_data.get("athlete")
        }
