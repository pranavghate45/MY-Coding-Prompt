import os
import smtplib
from email.message import EmailMessage
from threading import Thread
from queue import Queue, Empty
from typing import Optional
from time import sleep


_email_queue: Optional[Queue] = None


def _start_worker():
    global _email_queue
    if _email_queue is not None:
        return
    _email_queue = Queue()

    def worker():
        while True:
            try:
                item = _email_queue.get(timeout=1)
            except Empty:
                continue
            to_email, subject, body = item
            try:
                _send_smtp_email(to_email, subject, body)
            except Exception:
                # swallow exceptions; in real system we'd log and retry
                pass
            finally:
                _email_queue.task_done()

    t = Thread(target=worker, daemon=True)
    t.start()


def enqueue_email(to_email: str, subject: str, body: str):
    """Put an email onto the background queue (best-effort)."""
    global _email_queue
    if _email_queue is None:
        _start_worker()
    _email_queue.put((to_email, subject, body))


def _send_smtp_email(to_email: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT", "0") or 0)
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASS")
    from_addr = os.getenv("EMAIL_FROM") or user

    if not host or not port:
        # SMTP not configured
        return False

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email
    msg.set_content(body)

    if user and password:
        with smtplib.SMTP(host, port, timeout=10) as s:
            s.starttls()
            s.login(user, password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=10) as s:
            s.send_message(msg)
    return True


def send_invite_email(to_email: str, subject: str, body: str) -> bool:
    """Compatibility wrapper — enqueue the email and return quickly."""
    try:
        enqueue_email(to_email, subject, body)
        return True
    except Exception:
        return False
