"""
Create user:
POST http://127.0.0.1:8000/api/v1/auth/users/ {"username": "admin", "password": "123"}

Get user info:
headers -> Authorization -> Token d91dacef1757b45259d45372359d4f7c91a856c2
GET http://127.0.0.1:8000/api/v1/auth/users/me/

Get token and authorize (--> {"auth_token":"d91dacef1757b45259d45372359d4f7c91a856c2"}):
POST http://127.0.0.1:8000/api/v1/token/token/login/ {"username": "admin", "password": "123"}

Logout:
headers -> Authorization -> Token d91dacef1757b45259d45372359d4f7c91a856c2
POST http://127.0.0.1:8000/api/v1/token/token/logout/
"""

__all__ = ["urlpatterns"]


from django.urls import include, path, re_path

from app.views import TokenCreateView, TokenDestroyView

urlpatterns = []

auth_urlpatterns = [
	path("auth/", include("djoser.urls")),
	re_path(r"^token/login/?$", TokenCreateView.as_view(), name="login"),
	re_path(r"^token/logout/?$", TokenDestroyView.as_view(), name="logout"),
]

urlpatterns += auth_urlpatterns
