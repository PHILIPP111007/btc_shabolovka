from django.contrib.auth.models import (
	AbstractBaseUser,
	PermissionsMixin,
	UserManager,
)
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class User(AbstractBaseUser, PermissionsMixin):
	username_validator = UnicodeUsernameValidator()

	username = models.CharField(
		_("username"),
		max_length=150,
		unique=True,
		help_text=_(
			"Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only."
		),
		validators=[username_validator],
		error_messages={
			"unique": _("A user with that username already exists."),
		},
	)
	first_name = models.CharField(_("first name"), max_length=150, blank=True)
	last_name = models.CharField(_("last name"), max_length=150, blank=True)
	email = models.EmailField(_("email address"), blank=True)
	date_joined = models.DateTimeField(_("date joined"), default=timezone.now)
	is_staff = models.BooleanField(
		_("staff status"),
		default=False,
		help_text=_("Designates whether the user can log into this admin site."),
	)
	is_active = models.BooleanField(
		_("active"),
		default=True,
		help_text=_(
			"Designates whether this user should be treated as active. "
			"Unselect this instead of deleting accounts."
		),
	)
	user_timezone = models.CharField(_("User timezone"), max_length=150, blank=True)

	objects = UserManager()

	EMAIL_FIELD = "email"
	USERNAME_FIELD = "username"


class Conversation(models.Model):
	user = models.CharField(max_length=150)
	room = models.CharField(max_length=150)
	timestamp_start = models.DateTimeField()
	timestamp_end = models.DateTimeField()
	description = models.CharField(max_length=150)
	date_created = models.DateTimeField(auto_now_add=True)
