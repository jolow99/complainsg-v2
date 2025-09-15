from fastapi_users import schemas

class UserRead(schemas.BaseUser):
    is_admin: bool

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    is_admin: bool | None = None