from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import os
from typing import Optional

from app.database import get_db
from sqlalchemy.orm import Session
from app.models.user import User
import uuid
import requests
import hmac
import hashlib
import json

import logging

router = APIRouter()

logger = logging.getLogger(__name__)


class CheckoutRequest(BaseModel):
    plan: str
    email: Optional[str] = None
    upiId: Optional[str] = None


@router.post("/api/create-checkout-session")
async def create_checkout_session(req: CheckoutRequest, request: Request):
    """Create a Stripe Checkout Session and return its ID.

    If `STRIPE_SECRET_KEY` is not set, return a mock session id for local testing.
    """
    stripe_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe_key:
        # Mock response so frontend can proceed in local dev without Stripe key.
        return {"id": "mock_session_12345"}

    try:
        import stripe

        stripe.api_key = stripe_key
        # Choose price or product mapping based on `plan`.
        plan_key = (req.plan or "pro").strip().lower()
        price_lookup = {
            "pro": os.getenv("STRIPE_PRICE_PRO", "price_1ExamplePro"),
            "elite": os.getenv("STRIPE_PRICE_ELITE", "price_1ExampleElite"),
            "starter": os.getenv("STRIPE_PRICE_STARTER", "price_1ExampleStarter"),
        }
        price = price_lookup.get(plan_key, price_lookup.get("starter"))

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[{"price": price, "quantity": 1}],
            # frontend billing page expects `success` query parameter
            success_url=(str(request.base_url).rstrip("/") + "/billing?success=1"),
            cancel_url=(str(request.base_url).rstrip("/") + "/billing?success=0"),
            metadata={"email": req.email or "", "plan_tier": plan_key if plan_key in {"pro", "elite"} else "pro"},
        )
        return {"id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/stripe-webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe webhook endpoint to mark users as paid on successful checkout.

    - Verifies signature if `STRIPE_WEBHOOK_SECRET` is set.
    - On `checkout.session.completed` sets `user.plan = 'paid'` and `user.approved = True` when a matching user is found by email.
    """
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    stripe_key = os.getenv('STRIPE_SECRET_KEY')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')

    event = None
    if stripe_key:
        import stripe
        stripe.api_key = stripe_key
        try:
            if webhook_secret and sig_header:
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            else:
                # best-effort parsing without signature
                event = stripe.Event.construct_from(stripe.util.json.loads(payload), stripe.api_key)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Webhook error: {e}")
    else:
        # No stripe configured; attempt to parse JSON and accept mock events
        import json
        try:
            event = json.loads(payload.decode('utf-8'))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid payload: {e}")

    # Handle checkout completed
    etype = (event.get('type') if isinstance(event, dict) else getattr(event, 'type', None))
    data_obj = (event.get('data', {}).get('object') if isinstance(event, dict) else getattr(event, 'data', {}).get('object'))

    if etype == 'checkout.session.completed' and data_obj:
        # Try to get customer email from metadata or from customer_details
        email = ''
        try:
            email = (data_obj.get('metadata') or {}).get('email') or (data_obj.get('customer_details') or {}).get('email') or data_obj.get('customer_email')
        except Exception:
            email = ''

        try:
            plan_tier = ((data_obj.get('metadata') or {}).get('plan_tier') or 'pro').strip().lower()
        except Exception:
            plan_tier = 'pro'
        if plan_tier not in {'pro', 'elite'}:
            plan_tier = 'pro'

        if not email:
            return {"status": "ignored", "reason": "no email"}

        # Find user by email and mark paid
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.plan = 'paid'
            try:
                setattr(user, 'plan_tier', plan_tier)
            except Exception:
                pass
            # add approved column if present; otherwise ignore
            try:
                setattr(user, 'approved', True)
            except Exception:
                pass
            db.add(user)
            db.commit()
            return {"status": "ok", "user": user.email, "plan_tier": plan_tier}

        return {"status": "ignored", "reason": "user not found", "email": email}

    return {"status": "ignored", "event": etype}


class RazorpayOrderRequest(BaseModel):
    plan: str
    email: Optional[str] = None
    # amount in paise (optional). If provided, this amount will be used instead of plan mapping.
    amount: Optional[int] = None


@router.post("/api/create-razorpay-order")
async def create_razorpay_order(req: RazorpayOrderRequest, request: Request):
    """Create a Razorpay Order and return its id + key_id for frontend checkout.

    If `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET` are not set, a mock order id is returned
    so developers can test the flow locally.
    """
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    # map plan to amount in paise
    # Allow caller to override amount (amount should be in paise)
    if getattr(req, 'amount', None):
        try:
            amount = int(req.amount)
            if amount <= 0:
                raise ValueError('amount must be positive')
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid amount')
    else:
        plan_key = (req.plan or "pro").strip().lower()
        amount_map = {
            "pro": int(os.getenv("RAZORPAY_AMOUNT_PRO", "19900")),
            "elite": int(os.getenv("RAZORPAY_AMOUNT_ELITE", "49900")),
            "starter": int(os.getenv("RAZORPAY_AMOUNT_STARTER", "9900")),
        }
        amount = amount_map.get(plan_key, amount_map["pro"])

    if not key_id or not key_secret:
        # Return mock order for local dev
        return {"id": f"mock_razorpay_order_{uuid.uuid4().hex}", "key_id": os.getenv("NEXT_PUBLIC_RAZORPAY_KEY_ID", "rzp_test_mock"), "amount": amount}

    try:
        payload = {"amount": amount, "currency": "INR", "receipt": f"rcpt_{uuid.uuid4().hex}", "payment_capture": 1, "notes": {"email": req.email or ""}}
        resp = requests.post("https://api.razorpay.com/v1/orders", auth=(key_id, key_secret), json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {"id": data.get("id"), "key_id": key_id, "amount": amount}
    except requests.exceptions.RequestException as e:
        logger.exception("Razorpay order request failed")
        try:
            detail = f"request error: {e}"
        except Exception:
            detail = str(e)
        raise HTTPException(status_code=500, detail=detail)
    except Exception as e:
        logger.exception("Unexpected error creating razorpay order: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    email: Optional[str] = None


@router.post("/api/razorpay-verify")
async def razorpay_verify(req: RazorpayVerifyRequest, db: Session = Depends(get_db)):
    """Verify Razorpay payment signature from client-side checkout and mark user paid.

    The signature is HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    """
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_secret:
        # If not configured, accept mock verification for local dev
        if req.email:
            user = db.query(User).filter(User.email == req.email).first()
            if user:
                user.plan = 'paid'
                try:
                    setattr(user, 'plan_tier', 'pro')
                except Exception:
                    pass
                try:
                    setattr(user, 'approved', True)
                except Exception:
                    pass
                db.add(user)
                db.commit()
                return {"status": "ok", "mock": True}
        return {"status": "ignored", "mock": True}

    try:
        msg = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode('utf-8')
        computed = hmac.new(key_secret.encode('utf-8'), msg, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, req.razorpay_signature):
            raise HTTPException(status_code=400, detail="Invalid signature")

        # signature valid — mark user paid if email provided
        if req.email:
            user = db.query(User).filter(User.email == req.email).first()
            if user:
                user.plan = 'paid'
                try:
                    setattr(user, 'plan_tier', 'pro')
                except Exception:
                    pass
                try:
                    setattr(user, 'approved', True)
                except Exception:
                    pass
                db.add(user)
                db.commit()
                return {"status": "ok"}

        return {"status": "ok", "verified": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected error during razorpay verification: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


class PaymentLinkRequest(BaseModel):
    plan: str
    email: Optional[str] = None
    # optional override amount in paise
    amount: Optional[int] = None


@router.post("/api/create-razorpay-payment-link")
async def create_razorpay_payment_link(req: PaymentLinkRequest, request: Request):
    """Create a Razorpay Payment Link and return its id + short_url for QR generation.

    If keys are not configured, return a mock short_url so frontend can simulate flow.
    """
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")

    if getattr(req, 'amount', None):
        try:
            amount = int(req.amount)
            if amount <= 0:
                raise ValueError('amount must be positive')
        except Exception:
            raise HTTPException(status_code=400, detail='Invalid amount')
    else:
        plan_key = (req.plan or "pro").strip().lower()
        amount_map = {
            "pro": int(os.getenv("RAZORPAY_AMOUNT_PRO", "19900")),
            "elite": int(os.getenv("RAZORPAY_AMOUNT_ELITE", "49900")),
            "starter": int(os.getenv("RAZORPAY_AMOUNT_STARTER", "9900")),
        }
        amount = amount_map.get(plan_key, amount_map["pro"])

    if not key_id or not key_secret:
        return {"id": f"mock_link_{uuid.uuid4().hex}", "short_url": f"https://example.com/pay/mock/{uuid.uuid4().hex}", "amount": amount}

    try:
        payload = {
            "amount": amount,
            "currency": "INR",
            "accept_partial": False,
            "description": f"{plan_key} subscription",
            "customer": {"email": req.email or ""},
            "notify": {"sms": False, "email": False},
        }
        resp = requests.post("https://api.razorpay.com/v1/payment_links", auth=(key_id, key_secret), json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return {"id": data.get("id"), "short_url": data.get("short_url"), "amount": amount}
    except requests.exceptions.RequestException as e:
        logger.exception("Razorpay payment-link request failed")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error creating payment link: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/payment-link-status")
async def payment_link_status(link_id: str, db: Session = Depends(get_db)):
    """Return the status of a Razorpay payment link.

    If not configured, return mock status 'created' or 'paid' depending on query.
    """
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return {"id": link_id, "status": "created", "paid": False}

    try:
        resp = requests.get(f"https://api.razorpay.com/v1/payment_links/{link_id}", auth=(key_id, key_secret), timeout=10)
        resp.raise_for_status()
        data = resp.json()
        status = data.get("status")
        # payment_links include 'payments' array when paid
        payments = data.get("payments") or []
        paid = len(payments) > 0
        return {"id": link_id, "status": status, "paid": paid, "payments": payments}
    except requests.exceptions.RequestException as e:
        logger.exception("Razorpay payment-link status request failed")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error checking payment link status: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
