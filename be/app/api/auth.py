from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserCreate, Token, UserLogin, UserOut, RoleOut, PermissionOut, RoleCreate, RoleUpdate, RefreshTokenRequest
from app.services.auth_service import register_user, authenticate_user, create_user_token, get_current_user_info, refresh_access_token
from app.core.permissions import get_current_active_user
from shared.logging import get_logger
from typing import List

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/signup", response_model=Token)
async def signup(user_in: UserCreate):
    try:
        user = await register_user(user_in)
        logger.info(f"Signup success for username='{user_in.username}'")
    except ValueError as e:
        logger.error(f"Signup failed for username='{user_in.username}': {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

    access_token, refresh_token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user_info}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await authenticate_user(user_in.username, user_in.password)
    if not user:
        logger.error(f"Login attempt with invalid username='{user_in.username}'")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    logger.info(f"Login success for username='{user_in.username}'")
    access_token, refresh_token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer", "user": user_info}

@router.post("/refresh", response_model=Token)
async def refresh_token(token_in: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    tokens = await refresh_access_token(token_in.refresh_token)
    if not tokens:
        logger.error("Failed to refresh token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    
    # Get user info from the new access token
    from jose import jwt
    from app.core.config import settings
    try:
        payload = jwt.decode(tokens["access_token"], settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("user_id")
        user_info = await get_current_user_info(user_id)
        return {"access_token": tokens["access_token"], "refresh_token": tokens["refresh_token"], "token_type": "bearer", "user": user_info}
    except Exception as e:
        logger.error(f"Error getting user info: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error refreshing token")

@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user
