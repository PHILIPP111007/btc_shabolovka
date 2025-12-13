from fastapi import APIRouter, Request
from sqlmodel import select

from app.database import SessionDep
from app.models import User

router = APIRouter(tags=["user"])


@router.get("/user/{username}/")
async def get_user(session: SessionDep, request: Request, username: str):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	query = await session.exec(select(User).where(User.id == request.state.user.id))
	query = query.first()
	if not query:
		return {"ok": False, "error": "Not found the global user."}

	user = {
		"id": query.id,
		"username": query.username,
		"email": query.email,
		"first_name": query.first_name,
		"last_name": query.last_name,
	}
	result = {"ok": True, "user": user}

	return result
