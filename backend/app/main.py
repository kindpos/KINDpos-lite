"""
KINDpos FastAPI Application

The main entry point for the backend API.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

from app.api.routes.printing import print_queue
from app.printing.print_dispatcher import PrintDispatcher
from app.config import settings
from app.api.dependencies import init_ledger, close_ledger
from app.services.demo_seeder import seed_demo_data_if_empty
from app.api.routes import orders
from app.api.routes import system
from app.api.routes import menu
from app.api.routes import hardware
from app.api.routes import printing
from app.api.routes import payment_routes
from app.api.routes import config
from app.api.routes import staff
from app.api.routes.printing import print_queue


_dispatcher: PrintDispatcher = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _dispatcher

    print("Starting " + settings.app_name + " v" + settings.app_version)
    print("Terminal ID: " + settings.terminal_id)
    print("Database: " + settings.database_path)

    ledger = await init_ledger()
    print("Event Ledger initialized")

    await seed_demo_data_if_empty(ledger)

    await print_queue.connect()
    print("Print Queue initialized")

    _dispatcher = PrintDispatcher(print_queue)
    await _dispatcher.start()
    print("Print Dispatcher started")

    yield

    await _dispatcher.stop()
    await print_queue.close()
    await close_ledger()
    print("Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Nice. Dependable. Yours.",
    lifespan=lifespan,
)

# CORS middleware (allows frontend to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080", "http://localhost:8000", "http://127.0.0.1:8080", "http://localhost:63342"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(orders.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")
app.include_router(menu.router, prefix="/api/v1")
app.include_router(hardware.router, prefix="/api/v1")
app.include_router(printing.router, prefix="/api/v1")
app.include_router(payment_routes.router, prefix="/api/v1")
app.include_router(config.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")


# Serve frontend
frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'frontend')

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "terminal_id": settings.terminal_id,
    }

if os.path.exists(frontend_path):
    print(f'Serving frontend from: {frontend_path}')
    app.mount('/', StaticFiles(directory=frontend_path, html=True), name='frontend')
else:
    print(f'WARNING: Frontend not found at: {frontend_path}')