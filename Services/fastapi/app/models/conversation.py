__all__ = ["Conversation"]


from datetime import datetime
from sqlmodel import Field, SQLModel


class Conversation(SQLModel, table=True):
	__tablename__ = "app_conversation"

	id: int = Field(primary_key=True)
	user: str
	room: str
	timestamp_start: datetime
	timestamp_end: datetime
	date_created: datetime = Field(default_factory=lambda: datetime.now())
