from fastapi import FastAPI
from auth import router as auth_router
from strava import router as strava_router

app = FastAPI()

app.include_router(auth_router)
app.include_router(strava_router)
