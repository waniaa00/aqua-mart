from datetime import datetime

from app.schemas.common import ORMModel


class NotificationResponse(ORMModel):
    id: str
    event_type: str
    payload: dict
    created_at: datetime
    delivered_at: datetime | None
