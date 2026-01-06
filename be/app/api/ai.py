from fastapi import APIRouter


router = APIRouter()

global_state_ai: bool = False

@router.post("/test-ai")
async def test_ai():
    global global_state_ai
    global_state_ai = not global_state_ai
    return {global_state_ai}