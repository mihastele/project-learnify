from .base import *

DEBUG = True
ALLOWED_HOSTS = ["*"]

DATABASES["default"].update({  # type: ignore[index]
    "ENGINE": "django.db.backends.sqlite3",
    "NAME": BASE_DIR / "db.sqlite3",
    "USER": "",
    "PASSWORD": "",
    "HOST": "",
    "PORT": "",
})
