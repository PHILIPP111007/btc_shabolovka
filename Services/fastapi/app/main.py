from typing import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.constants import API_PREFIX, DEVELOPMENT
from app.database import engine
from app.models import Token, User
from app.views import user, conversation

app = FastAPI(
	title="btc_shabolovka",
	version="1.0.0",
	contact={
		"name": "Roshchin Philipp",
		"url": "https://github.com/PHILIPP111007",
		"email": "r.phil@yandex.ru",
	},
	openapi_url="/docs/openapi.json",
)

app.openapi_version = "3.0.0"


#########################################
# Middleware ############################
#########################################

if DEVELOPMENT == "1":
	origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

	app.add_middleware(
		CORSMiddleware,
		allow_origins=origins,
		allow_credentials=True,  # Allow cookies to be included in cross-origin requests
		allow_methods=["*"],  # Allow all HTTP methods (GET, POST, PUT, DELETE, etc.)
		allow_headers=["*"],  # Allow all headers in cross-origin requests
	)


@app.middleware("http")
async def middleware_add_user_to_request(request: Request, call_next: Callable):
	"""Middleware to store user in request context"""

	token = request.headers.get("Authorization")
	request.state.user = None  # Устанавливаем по умолчанию

	if token and " " in token:
		token = token.split(" ", 1)[1]  # Remove "Bearer"

		async with AsyncSession(engine) as session:
			token_obj = await session.exec(select(Token).where(Token.key == token))
			token_obj = token_obj.first()
			if token_obj:
				user = await session.exec(
					select(User).where(User.id == token_obj.user_id)
				)
				user = user.one()
				if user:
					request.state.user = User(
						id=user.id,
						username=user.username,
						user_timezone=user.user_timezone,
					)

	response = await call_next(request)
	return response


app.include_router(user.router, prefix=API_PREFIX)
app.include_router(conversation.router, prefix=API_PREFIX)


if __name__ == "__main__":
	import uvicorn

	uvicorn.run(app, host="0.0.0.0", port=8080)
