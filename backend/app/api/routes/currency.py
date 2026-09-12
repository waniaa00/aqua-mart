from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.schemas.currency import CurrencyRatesResponse
from app.services import currency_service

router = APIRouter(prefix="/currency", tags=["currency"])


@router.get("/rates", response_model=CurrencyRatesResponse)
async def get_rates_route(db: AsyncSession = Depends(get_db)) -> CurrencyRatesResponse:
    return await currency_service.get_rates(db)
