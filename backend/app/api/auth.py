import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.models import User
from ..core.security import get_password_hash, verify_password, create_access_token
from ..schemas.interview import (
    UserRegisterRequest,
    UserLoginRequest,
    UserResponse,
    TokenResponse,
    UserProfileUpdate
)
from .deps import get_current_user, get_current_user_strict

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["authentication"])
users_router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=TokenResponse)
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=request.email.lower().strip(),
        password_hash=get_password_hash(request.password),
        display_name=request.display_name.strip(),
        consent_recording=request.consent_recording,
        account_status="active"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/login", response_model=TokenResponse)
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(access_token=token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/logout")
def logout_user():
    return {"message": "Logged out successfully."}

@users_router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)

@users_router.patch("/me", response_model=UserResponse)
def update_profile(
    updates: UserProfileUpdate,
    user: User = Depends(get_current_user_strict),
    db: Session = Depends(get_db)
):
    if updates.display_name is not None:
        user.display_name = updates.display_name.strip()
    if updates.consent_recording is not None:
        user.consent_recording = updates.consent_recording
    if updates.privacy_preferences is not None:
        user.privacy_preferences = updates.privacy_preferences

    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

@users_router.delete("/me/recordings")
def delete_user_recordings(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from ..services.audio_storage import AudioStorageService
    from ..models.models import InterviewSession, Answer

    sessions = db.query(InterviewSession).filter(InterviewSession.user_id == user.id).all()
    deleted_count = 0
    for s in sessions:
        for ans in s.answers:
            if ans.audio_storage_key:
                AudioStorageService.delete_audio(ans.audio_storage_key)
                ans.audio_storage_key = None
                deleted_count += 1
    db.commit()
    return {"message": f"Successfully deleted {deleted_count} audio recording(s).", "deleted_count": deleted_count}

@users_router.delete("/me")
def delete_account(
    user: User = Depends(get_current_user_strict),
    db: Session = Depends(get_db)
):
    if user.email == "demo@ai-interview.com":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The default demo account cannot be deleted."
        )
    db.delete(user)
    db.commit()
    return {"message": "Account and all associated session data deleted successfully."}
