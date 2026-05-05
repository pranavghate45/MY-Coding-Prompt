from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth_routes
from app.routes import requirement_routes
from app.routes import question_routes
from app.routes import answer_routes
from app.routes import chat_routes
from app.routes import department_routes
from app.routes import role_routes
from app.routes import user_routes
from app.routes import ai_routes
from app.routes import admin_routes
from app.routers import payment_routes
from app.routers import onboarding_routes
from fastapi.openapi.utils import get_openapi

app = FastAPI(title="My Prompt API")

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="My Prompt API",
        version="1.0.0",
        description="API with JWT Authentication",
        routes=app.routes,
    )

    # ✅ Add Bearer Auth
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    openapi_schema["security"] = [
        {"BearerAuth": []}
    ]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi

# ------------------ CORS FIX ------------------

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*"   # ✅ allow all (for development)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------ ROUTERS ------------------

app.include_router(auth_routes.router, prefix="/auth", tags=["Auth"])  # ✅ better structure
app.include_router(requirement_routes.router)
app.include_router(question_routes.router)
app.include_router(answer_routes.router)
app.include_router(chat_routes.router)
app.include_router(department_routes.router)
app.include_router(role_routes.router)
app.include_router(user_routes.router)
app.include_router(ai_routes.router, prefix="/ai", tags=["AI"])
app.include_router(admin_routes.router, prefix="/admin", tags=["Admin"])  # ✅ important
app.include_router(payment_routes.router)
app.include_router(onboarding_routes.router)


# ------------------ ROOT ------------------

@app.get("/")
def root():
    return {"message": "My Prompt Backend Running"}