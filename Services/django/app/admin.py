from app.models import User, Conversation

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin


admin.site.register(User, UserAdmin)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
	pass
