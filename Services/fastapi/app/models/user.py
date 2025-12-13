__all__ = ["User"]


from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
	__tablename__ = "app_user"

	id: int = Field(primary_key=True)
	username: str
	email: str
	first_name: str
	last_name: str
	user_timezone: str

	# Relations
	tokens: list["Token"] = Relationship(back_populates="user")
