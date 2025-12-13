from datetime import datetime

from fastapi import APIRouter, Request
from sqlmodel import select, delete

from app.database import SessionDep
from app.models import Conversation
from app.constants import DATETIME_FORMAT
from app.request_body import ConversationPOST

router = APIRouter(tags=["conversation"])


@router.get("/get_conversation/")
async def get_conversation(session: SessionDep, request: Request):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	query = await session.exec(
		select(Conversation).order_by(Conversation.date_created.desc())
	)
	query = query.unique().all()
	if not query:
		return {"ok": False, "error": "Not found conversations."}

	conversations = []
	for conversation in query:
		timestamp_start = conversation.timestamp_start.strftime(DATETIME_FORMAT)
		timestamp_end = conversation.timestamp_end.strftime(DATETIME_FORMAT)

		conversation = {
			"id": conversation.id,
			"user": conversation.user,
			"room": conversation.room,
			"timestamp_start": timestamp_start,
			"timestamp_end": timestamp_end,
		}

		conversations.append(conversation)
	return {"ok": True, "conversations": conversations}


@router.post("/add_conversation/")
async def add_conversation(
	session: SessionDep, request: Request, conversation: ConversationPOST
):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	try:
		timestamp_start = datetime.strptime(
			conversation.timestamp_start, "%Y-%m-%dT%H:%M"
		)
		timestamp_end = datetime.strptime(conversation.timestamp_end, "%Y-%m-%dT%H:%M")

		conversation_obj = Conversation(
			user=request.state.user.username,
			room=conversation.room,
			timestamp_start=timestamp_start,
			timestamp_end=timestamp_end,
		)
		session.add(conversation_obj)
		await session.commit()
	except Exception:
		pass

	return {"ok": True}


@router.delete("/delete_conversation/{conversation_id}/")
async def delete_conversation(
	session: SessionDep, request: Request, conversation_id: int
):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	await session.exec(delete(Conversation).where(Conversation.id == conversation_id))
	await session.commit()
	return {"ok": True}
