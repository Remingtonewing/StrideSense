# backendFiles/routers/auth.py

from fastapi import APIRouter
from fastapi.responses import RedirectResponse
import os
from dotenv import load_dotenv
import httpx

load_dotenv()

router = APIRouter()

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
REDIRECT_URI = os.getenv("STRAVA_REDIRECT_URI")

@router.get("/login")
def login():
    return RedirectResponse(
        f"https://www.strava.com/oauth/authorize"
        f"?client_id={CLIENT_ID}&response_type=code"
        f"&redirect_uri={REDIRECT_URI}"
        f"&approval_prompt=force&scope=activity:read_all"
    )

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
    access_token = token_data.get("access_token")


    return RedirectResponse(f"http://localhost:3000?access_token={access_token}")
