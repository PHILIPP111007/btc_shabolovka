from datetime import datetime, timedelta

from fastapi import APIRouter, Request
from sqlmodel import select, delete, or_, and_

from app.database import SessionDep
from app.models import Conversation
from app.constants import DATETIME_FORMAT
from app.request_body import ConversationPOST

router = APIRouter(tags=["conversation"])


@router.get("/get_conversation/")
async def get_conversation(
	session: SessionDep, request: Request, current_time: str | None
):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	try:
		current_time = datetime.strptime(current_time, "%Y-%m-%dT%H:%M")
		query = await session.exec(
			select(Conversation)
			.where(Conversation.timestamp_end >= current_time)
			.order_by(Conversation.date_created.desc())
		)
	except Exception:
		query = await session.exec(
			select(Conversation).order_by(Conversation.date_created.desc())
		)

	query = query.unique().all()
	if not query:
		return {"ok": False, "error": "Not found conversations."}

	conversations = []
	for item in query:
		timestamp_start = item.timestamp_start.strftime(DATETIME_FORMAT)
		timestamp_end = item.timestamp_end.strftime(DATETIME_FORMAT)

		how_much_time_is_left = item.timestamp_start - current_time
		days = how_much_time_is_left.days
		hours = how_much_time_is_left.seconds // 3600
		minutes = (how_much_time_is_left.seconds % 3600) // 60
		# Формируем строку с timedelta
		if days > 0:
			how_much_time_is_left_str = f"{days} дней {hours} часов {minutes} минут"
		elif hours > 0:
			how_much_time_is_left_str = f"{hours} часов {minutes} минут"
		elif minutes > 0:
			how_much_time_is_left_str = f"{minutes} минут"
		else:
			how_much_time_is_left_str = "Сейчас"
		total_minutes = (days * 24 * 60) + (hours * 60) + minutes

		how_long_will_the_conversation_last = item.timestamp_end - item.timestamp_start
		days = how_long_will_the_conversation_last.days
		hours = how_long_will_the_conversation_last.seconds // 3600
		minutes = (how_long_will_the_conversation_last.seconds % 3600) // 60
		# Формируем строку с timedelta
		if days > 0:
			how_long_will_the_conversation_last_str = (
				f"{days} дней {hours} часов {minutes} минут"
			)
		elif hours > 0:
			how_long_will_the_conversation_last_str = f"{hours} часов {minutes} минут"
		elif minutes > 0:
			how_long_will_the_conversation_last_str = f"{minutes} минут"
		else:
			how_long_will_the_conversation_last_str = "Сейчас"

		conversation = {
			"id": item.id,
			"user": item.user,
			"room": item.room,
			"timestamp_start": timestamp_start,
			"timestamp_end": timestamp_end,
			"how_much_time_is_left": how_much_time_is_left_str,
			"how_long_will_the_conversation_last": how_long_will_the_conversation_last_str,
			"total_minutes": total_minutes,
		}

		conversations.append(conversation)
	return {"ok": True, "conversations": conversations}


@router.get("/get_conversation_future_time/{room_name}/")
async def get_conversation_future_time(
	session: SessionDep, request: Request, room_name: str, current_time: str | None
):
	if not request.state.user:
		return {"ok": False, "error": "Can not authenticate."}

	current_time = datetime.strptime(current_time, "%Y-%m-%dT%H:%M")

	query = await session.exec(
		select(Conversation)
		.where(
			Conversation.room == room_name, Conversation.timestamp_start >= current_time
		)
		.order_by(Conversation.timestamp_start.asc())
	)

	query = query.unique().all()

	time_str = ""
	if len(query) > 0:
		next_event_time = query[0].timestamp_start

		# Вычисляем разницу во времени
		time_difference = next_event_time - current_time

		# Форматируем разницу в читаемый вид
		days = time_difference.days
		hours = time_difference.seconds // 3600
		minutes = (time_difference.seconds % 3600) // 60

		# Формируем строку с timedelta
		if days > 0:
			time_str = f"{days} дней {hours} часов {minutes} минут"
		elif hours > 0:
			time_str = f"{hours} часов {minutes} минут"
		elif minutes > 0:
			time_str = f"{minutes} минут"
		else:
			time_str = "Сейчас"
	else:
		time_str = "Бесконечно"

	return {"ok": True, "time": time_str}


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

		query = await session.exec(
			select(Conversation).where(
				Conversation.room == conversation.room,
				or_(
					# Случай 1: новое начало внутри существующего промежутка
					and_(
						Conversation.timestamp_start <= timestamp_start,
						Conversation.timestamp_end > timestamp_start,
					),
					# Случай 2: новый конец внутри существующего промежутка
					and_(
						Conversation.timestamp_start < timestamp_end,
						Conversation.timestamp_end >= timestamp_end,
					),
					# Случай 3: новый полностью содержит существующий
					and_(
						Conversation.timestamp_start >= timestamp_start,
						Conversation.timestamp_end <= timestamp_end,
					),
					# Случай 4: существующий полностью содержит новый
					and_(
						Conversation.timestamp_start <= timestamp_start,
						Conversation.timestamp_end >= timestamp_end,
					),
				),
			)
		)
		query = query.unique().all()

		if len(query) > 0:
			return {"ok": False, "error": "Пересечение временных промежутков!"}

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
