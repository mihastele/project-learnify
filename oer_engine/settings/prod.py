from .base import *

# Production overrides — read secrets from environment.
# DEBUG is already False in base.
# Set SECRET_KEY, DB credentials, ALLOWED_HOSTS via env vars.
SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "").split(",")
