from app.database import SessionLocal
from app.services.auth_service import hash_password, is_password_hashed
from sqlalchemy import text


def main() -> None:
    db = SessionLocal()
    try:
        updated = 0
        rows = db.execute(text("SELECT id, password FROM users")).fetchall()
        scanned = len(rows)

        for row in rows:
            current = row.password or ""
            if current and not is_password_hashed(current):
                db.execute(
                    text("UPDATE users SET password = :password WHERE id = :id"),
                    {"password": hash_password(current), "id": row.id},
                )
                updated += 1

        if updated > 0:
            db.commit()

        print({"scanned": scanned, "updated": updated})
    finally:
        db.close()


if __name__ == "__main__":
    main()
