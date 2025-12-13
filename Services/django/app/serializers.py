__all__ = ["UserSerializer"]

from rest_framework import serializers

from app.models import User


class UserSerializer(serializers.ModelSerializer):
	class Meta:
		model = User
		fields = (
			"username",
			"first_name",
			"last_name",
			"email",
			"is_online",
			"ethereum_address",
			"infura_api_key",
		)
