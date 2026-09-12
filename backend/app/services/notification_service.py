import logging
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.notification import Notification, NotificationEventType

logger = logging.getLogger("app.notifications")


async def record_event(
    db: AsyncSession,
    *,
    recipient_user_id: uuid.UUID | None,
    event_type: str,
    payload: dict,
    commit: bool = True,
) -> None:
    """Record a notification event as a best-effort side effect.

    Never raises into the caller's transaction (constitution §24) — a
    notification failure must not corrupt the core operation that triggered it.

    Pass `commit=False` when called mid another transaction (e.g. inside
    checkout's inventory reservation) so this doesn't prematurely commit work
    that must remain part of that larger all-or-nothing transaction; the
    caller's own eventual commit will persist this row too.
    """
    try:
        notification = Notification(
            recipient_user_id=recipient_user_id,
            event_type=NotificationEventType(event_type),
            payload=payload,
        )
        db.add(notification)
        if commit:
            await db.commit()
        else:
            await db.flush()
    except Exception:  # noqa: BLE001 — deliberately broad: notifications are best-effort
        logger.exception("Failed to record notification event %s", event_type)
        if commit:
            await db.rollback()


async def list_for_user(db: AsyncSession, user_id: uuid.UUID) -> list[Notification]:
    result = await db.execute(
        select(Notification)
        .where(Notification.recipient_user_id == user_id)
        .order_by(Notification.created_at.desc())
    )
    return list(result.scalars().all())


async def list_for_admins(db: AsyncSession, event_type: str | None = None) -> list[Notification]:
    query = select(Notification).where(Notification.recipient_user_id.is_(None))
    if event_type:
        query = query.where(Notification.event_type == NotificationEventType(event_type))
    result = await db.execute(query.order_by(Notification.created_at.desc()))
    return list(result.scalars().all())


async def mark_read(db: AsyncSession, notification_id: uuid.UUID, user_id: uuid.UUID) -> None:
    from datetime import datetime, timezone

    from app.core.exceptions import NotFoundError

    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id, Notification.recipient_user_id == user_id
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise NotFoundError("The requested notification was not found.")
    notification.delivered_at = datetime.now(timezone.utc)
    await db.commit()
