from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.user import UserCreate, Token, UserLogin, UserOut, RoleOut, PermissionOut, RoleCreate, RoleUpdate
from app.services.auth_service import register_user, authenticate_user, create_user_token, get_current_user_info
from app.core.permissions import get_current_active_user
from shared.logging import get_logger

router = APIRouter()
logger = get_logger("camera_ai_app")

@router.post("/signup", response_model=Token)
async def signup(user_in: UserCreate):
    try:
        user = await register_user(user_in)
        logger.info(f"Signup success for username='{user_in.username}'")
    except ValueError:
        logger.error(f"Signup attempt with existing username='{user_in.username}'")
        raise HTTPException(status_code=400, detail="User already exists")

    token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@router.post("/login", response_model=Token)
async def login(user_in: UserLogin):
    user = await authenticate_user(user_in.username, user_in.password)
    if not user:
        logger.error(f"Login attempt with invalid username='{user_in.username}'")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    logger.info(f"Login success for username='{user_in.username}'")
    token = create_user_token(user)
    user_info = await get_current_user_info(str(user["_id"]))
    return {"access_token": token, "token_type": "bearer", "user": user_info}

@router.get("/me", response_model=UserOut)
async def get_me(current_user: UserOut = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user
