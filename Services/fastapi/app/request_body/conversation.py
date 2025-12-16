from pydantic import BaseModel


class ConversationPOST(BaseModel):
	user: str
	room: str
	timestamp_start: str
	timestamp_end: str
	description: str
