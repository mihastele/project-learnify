from django.contrib import admin

from .models import ContentUnit, ContentVariant, Item, MediaResource, Tag


@admin.register(ContentUnit)
class ContentUnitAdmin(admin.ModelAdmin):
    list_display = ("title", "subject", "level", "license_type", "created_at")
    list_filter = ("subject", "level", "license_type")
    search_fields = ("title", "description")


@admin.register(ContentVariant)
class ContentVariantAdmin(admin.ModelAdmin):
    list_display = ("content_unit", "language_code", "script", "is_official_translation")
    list_filter = ("language_code", "is_official_translation")


@admin.register(MediaResource)
class MediaResourceAdmin(admin.ModelAdmin):
    list_display = ("content_unit", "type", "caption")
    list_filter = ("type",)


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = ("prompt_short", "item_type", "content_unit", "difficulty_initial")
    list_filter = ("item_type",)
    search_fields = ("prompt",)

    def prompt_short(self, obj: Item) -> str:
        return obj.prompt[:100]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name",)
