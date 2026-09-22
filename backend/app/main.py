from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title="Pet Fish Shop Backend API", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    api_router = APIRouter(prefix="/api/v1")

    from app.api.routes import (  # noqa: PLC0415
        admin,
        admin_customers,
        admin_orders,
        admin_promotions,
        appointments,
        auth,
        cart,
        categories,
        currency,
        health,
        notifications,
        orders,
        products,
        reviews,
        services,
        users,
        wishlist,
    )

    api_router.include_router(health.router, tags=["health"])
    api_router.include_router(auth.router)
    api_router.include_router(users.router)
    api_router.include_router(products.router)
    api_router.include_router(categories.router)
    api_router.include_router(currency.router)
    api_router.include_router(cart.router)
    api_router.include_router(orders.router)
    api_router.include_router(wishlist.router)
    api_router.include_router(admin_orders.router)
    api_router.include_router(services.router)
    api_router.include_router(appointments.router)
    api_router.include_router(reviews.router)
    api_router.include_router(admin_promotions.router)
    api_router.include_router(notifications.router)
    api_router.include_router(admin.router)
    api_router.include_router(admin_customers.router)

    app.include_router(api_router)

    return app


app = create_app()
