import os
import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
)
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.db import get_async_session, User, async_session_maker

SECRET = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Optional[Request] = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")

    async def create(
        self,
        user_create,
        safe: bool = False,
        request: Optional[Request] = None,
    ) -> User:
        # Check if this is the first user
        async with async_session_maker() as session:
            result = await session.execute(select(func.count(User.id)))
            user_count = result.scalar()
            is_first_user = user_count == 0

        # Create the user normally
        user = await super().create(user_create, safe, request)

        # If this is the first user, make them admin
        if is_first_user:
            async with async_session_maker() as session:
                result = await session.execute(select(User).where(User.id == user.id))
                db_user = result.scalar_one_or_none()
                if db_user:
                    db_user.is_admin = True
                    db_user.is_superuser = True
                    await session.commit()
                    await session.refresh(db_user)
                    print(f"First user {user.email} has been granted admin privileges.")

        return user

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
current_admin_user = fastapi_users.current_user(active=True, superuser=True)