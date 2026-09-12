import uuid

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.db.models.user import User, UserProfile


async def test_can_insert_user_and_hash_verify_password(db_session):
    hashed = hash_password("correct horse battery staple 1")
    assert verify_password("correct horse battery staple 1", hashed)
    assert not verify_password("wrong password", hashed)

    user = User(email="foundation@example.com", password_hash=hashed)
    user.profile = UserProfile(full_name="Foundation Test")
    db_session.add(user)
    await db_session.commit()

    assert isinstance(user.id, uuid.UUID)
    assert user.profile.full_name == "Foundation Test"


def test_jwt_round_trip():
    subject = uuid.uuid4()
    token = create_access_token(subject=subject, role="customer")
    payload = decode_access_token(token)
    assert payload["sub"] == str(subject)
    assert payload["role"] == "customer"
