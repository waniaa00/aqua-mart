from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.products import router as products_router
from app.api.routes.categories import router as categories_router
from app.api.routes.cart import router as cart_router
from app.api.routes.orders import router as orders_router
from app.api.routes.wishlist import router as wishlist_router
from app.api.routes.admin_orders import router as admin_orders_router
from app.api.routes.currency import router as currency_router
from app.api.routes.services import router as services_router
from app.api.routes.appointments import router as appointments_router
from app.api.routes.admin_appointments import router as admin_appointments_router
from app.api.routes.reviews import router as reviews_router
from app.api.routes.admin_promotions import router as admin_promotions_router
from app.api.routes.admin import router as admin_dashboard_router
from app.api.routes.notifications import router as notifications_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Pet Fish Shop API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(health_router, prefix="/api/v1")
    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(users_router, prefix="/api/v1")
    app.include_router(products_router, prefix="/api/v1")
    app.include_router(categories_router, prefix="/api/v1")
    app.include_router(cart_router, prefix="/api/v1")
    app.include_router(orders_router, prefix="/api/v1")
    app.include_router(wishlist_router, prefix="/api/v1")
    app.include_router(admin_orders_router, prefix="/api/v1")
    app.include_router(currency_router, prefix="/api/v1")
    app.include_router(services_router, prefix="/api/v1")
    app.include_router(appointments_router, prefix="/api/v1")
    app.include_router(admin_appointments_router, prefix="/api/v1")
    app.include_router(reviews_router, prefix="/api/v1")
    app.include_router(admin_promotions_router, prefix="/api/v1")
    app.include_router(admin_dashboard_router, prefix="/api/v1")
    app.include_router(notifications_router, prefix="/api/v1")

    return app


app = create_app()
