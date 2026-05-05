from datetime import datetime, timedelta
from app.database import SessionLocal

def seed():
    db = SessionLocal()
    try:
        from app.models.user import User
        from app.models.generated_prompts import GeneratedPrompt
        from app.models.chat import Chat
    except Exception as e:
        print('Failed to import models:', e)
        return

    now = datetime.utcnow()

    # create demo users (idempotent)
    users = []
    for email in ['alice@example.com', 'bob@example.com', 'carol@example.com']:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            users.append(existing)
        else:
            u = User(name=email.split('@')[0].title(), email=email, password='demo', plan='free')
            db.add(u)
            db.commit()
            db.refresh(u)
            users.append(u)

    # ensure at least one Requirement exists (generated_prompts.requirement_id FK)
    try:
        from app.models.requirements import Requirement
        req = db.query(Requirement).order_by(Requirement.id.asc()).first()
        if not req:
            req = Requirement(user_id=users[0].id if users else None, category_id=None, requirement_text='Demo requirement')
            db.add(req)
            db.commit()
            db.refresh(req)
        requirement_id = req.id
    except Exception:
        requirement_id = None

    # create generated prompts spread over last 45 days
    for i in range(1, 16):
        gp = GeneratedPrompt(
            user_id=users[i % len(users)].id if users else None,
            requirement_id=requirement_id,
            final_prompt=f"Demo prompt #{i}",
            ai_response=f"Demo AI response for prompt #{i}",
            created_at=now - timedelta(days=(i % 45))
        )
        db.add(gp)

    # create some chats
    for i in range(1, 8):
        ch = Chat(
            user_id=str(users[i % len(users)].id) if users else 'guest',
            prompt=f"Demo chat prompt {i}",
            response=f"Demo chat response {i}",
            messages=None,
            created_at=now - timedelta(days=(i % 10))
        )
        db.add(ch)

    db.commit()
    print('Seeded demo analytics data')

if __name__ == '__main__':
    seed()
