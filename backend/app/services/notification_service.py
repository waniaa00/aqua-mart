import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.notification import Notification, NotificationEventType
from app.db.models.order import Order
from app.schemas.common import PaginatedResponse
from app.schemas.notification import NotificationResponse
from app.utils.pagination import clean_page_params, total_pages as compute_total_pages

logger = logging.getLogger(__name__)


async def _record_event(db: AsyncSession, recipient_user_id: uuid.UUID | None, event_type: NotificationEventType, payload: dict) -> None:
    # Best-effort: a notification failure must never roll back or block the
    # triggering business transaction (constitution §24; contracts/notifications.md).
    try:
        db.add(Notification(recipient_user_id=recipient_user_id, event_type=event_type, payload=payload))
        await db.commit()
    except Exception:
        logger.exception("Failed to record notification event %s", event_type)
        await db.rollback()


async def notify_order_status_changed(db: AsyncSession, order: Order) -> None:
    await _record_event(
        db, order.user_id, NotificationEventType.order_status_changed,
        {"order_id": str(order.id), "status": order.status.value},
    )


async def notify_appointment_confirmed(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
    await _record_event(db, user_id, NotificationEventType.appointment_confirmed, {"appointment_id": str(appointment_id)})


async def notify_appointment_cancelled(db: AsyncSession, user_id: uuid.UUID, appointment_id: uuid.UUID) -> None:
    await _record_event(db, user_id, NotificationEventType.appointment_cancelled, {"appointment_id": str(appointment_id)})


async def notify_low_stock(db: AsyncSession, product_id: uuid.UUID, stock_quantity: int) -> None:
    await _record_event(
        db, None, NotificationEventType.low_stock_alert, {"product_id": str(product_id), "stock_quantity": stock_quantity}
    )


async def list_notifications_for_user(db: AsyncSession, user_id: uuid.UUID, page: int, limit: int) -> PaginatedResponse[NotificationResponse]:
    params = clean_page_params(page, limit)
    total_items = (await db.execute(select(func.count()).select_from(Notification).where(Notification.recipient_user_id == user_id))).scalar_one()
    result = await db.execute(
        select(Notification).where(Notification.recipient_user_id == user_id).order_by(Notification.created_at.desc()).offset(params.offset).limit(params.limit)
    )
    items = [NotificationResponse.model_validate(n) for n in result.scalars().all()]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))


async def mark_read(db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
    from datetime import datetime, timezone

    from app.core.exceptions import NotFoundError

    result = await db.execute(
        select(Notification).where(Notification.id == notification_id, Notification.recipient_user_id == user_id)
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise NotFoundError("Notification not found.")
    notification.delivered_at = datetime.now(timezone.utc)
    await db.commit()


async def list_notifications_admin(db: AsyncSession, event_type: str | None, page: int, limit: int) -> PaginatedResponse[NotificationResponse]:
    params = clean_page_params(page, limit)
    query = select(Notification).where(Notification.recipient_user_id.is_(None))
    if event_type:
        query = query.where(Notification.event_type == NotificationEventType(event_type))
    total_items = (await db.execute(select(func.count()).select_from(query.with_only_columns(Notification.id).subquery()))).scalar_one()
    result = await db.execute(query.order_by(Notification.created_at.desc()).offset(params.offset).limit(params.limit))
    items = [NotificationResponse.model_validate(n) for n in result.scalars().all()]
    return PaginatedResponse(items=items, page=params.page, limit=params.limit, total_items=total_items, total_pages=compute_total_pages(total_items, params.limit))
