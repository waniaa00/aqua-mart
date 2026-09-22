from sqlalchemy import select

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.models.user import User, UserRole


async def test_can_insert_user_and_hash_verify_password(db_session):
    hashed = hash_password("correctpass1")
    user = User(email="foundation@example.com", password_hash=hashed, role=UserRole.customer)
    db_session.add(user)
    await db_session.commit()

    result = await db_session.execute(select(User).where(User.email == "foundation@example.com"))
    stored = result.scalar_one()

    assert stored.email == "foundation@example.com"
    assert verify_password("correctpass1", stored.password_hash)
    assert not verify_password("wrongpass1", stored.password_hash)


async def test_jwt_round_trip():
    token = create_access_token(subject="some-user-id", role="customer")
    payload = decode_access_token(token)
    assert payload["sub"] == "some-user-id"
    assert payload["role"] == "customer"
