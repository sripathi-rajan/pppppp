import os
import sqlite3
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Literal
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr, constr

router = APIRouter(prefix="/api/auth", tags=["auth"])

# -- Configuration --
SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key-drivelegal-secure-key-32bytes")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
USERS_DB = os.path.join(DATA_DIR, "users.db")
os.makedirs(DATA_DIR, exist_ok=True)

# -- Database Init --
def init_db():
    conn = sqlite3.connect(USERS_DB)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            licenseNumber TEXT,
            vehicles TEXT,
            emergencyContact TEXT,
            emergencyContactName TEXT,
            createdAt TEXT NOT NULL
        )
    ''')
    
    # Existing columns
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN emergencyContact TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN emergencyContactName TEXT")
    except sqlite3.OperationalError:
        pass
        
    # New columns for Profile Completion
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN gender TEXT NOT NULL DEFAULT 'Prefer not to say'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN authProvider TEXT NOT NULL DEFAULT 'local'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN googleId TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN vehicleNumber TEXT")
    except sqlite3.OperationalError:
        pass

    conn.commit()
    conn.close()

init_db()

def get_db_connection():
    conn = sqlite3.connect(USERS_DB)
    conn.row_factory = sqlite3.Row
    return conn

# -- Models --
class VehicleModel(BaseModel):
    vehicleType: str
    vehicleNumber: str
    vehicleName: str
    vehicleModel: str
    rcBookUrl: Optional[str] = None

class RegisterRequest(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str
    licenseNumber: Optional[str] = None
    vehicles: List[VehicleModel] = []
    gender: Literal["Male", "Female", "Other", "Prefer not to say"] = "Prefer not to say"
    vehicleNumber: Optional[str] = None
    authProvider: Literal["local", "google"] = "local"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleAuthRequest(BaseModel):
    email: EmailStr
    name: str
    googleId: Optional[str] = None

class CompleteProfileRequest(BaseModel):
    name: str
    email: EmailStr
    googleId: str
    phone: str
    gender: Literal["Male", "Female", "Other", "Prefer not to say"]
    vehicleNumber: Optional[str] = None

# -- Helpers --
def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Dependency for extracting token from header
def get_current_user_email(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return email
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

# -- Endpoints --

@router.post("/register")
def register_user(req: RegisterRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # Check phone uniqueness
    cursor.execute("SELECT id FROM users WHERE phone = ?", (req.phone,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    hashed_password = get_password_hash(req.password)
    created_at = datetime.utcnow().isoformat()
    
    import json
    vehicles_json = json.dumps([v.dict() for v in req.vehicles])
    
    try:
        cursor.execute("""
            INSERT INTO users (name, phone, email, password, licenseNumber, vehicles, createdAt, gender, vehicleNumber, authProvider)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (req.name, req.phone, req.email, hashed_password, req.licenseNumber, vehicles_json, created_at, req.gender, req.vehicleNumber, req.authProvider))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Database error during registration")
        
    # Log them in immediately
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": req.email}, expires_delta=access_token_expires
    )
    
    conn.close()
    return {"message": "Registration Successful", "access_token": access_token, "token_type": "bearer"}

@router.post("/login")
def login_user(req: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(req.password, user['password']):
        raise HTTPException(status_code=400, detail="Invalid email or password")
        
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
def logout_user():
    return {"message": "Logged out successfully"}

@router.post("/google")
def google_auth(req: GoogleAuthRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT * FROM users WHERE email = ?", (req.email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        return {
            "require_profile_completion": True,
            "googleProfile": {
                "name": req.name,
                "email": req.email,
                "googleId": req.googleId or ""
            }
        }
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/complete-profile")
def complete_profile(req: CompleteProfileRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Final checks before creating
    cursor.execute("SELECT id FROM users WHERE email = ?", (req.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
        
    cursor.execute("SELECT id FROM users WHERE phone = ?", (req.phone,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Phone number already registered")
        
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits
    random_password = ''.join(secrets.choice(alphabet) for i in range(20))
    hashed_password = get_password_hash(random_password)
    created_at = datetime.utcnow().isoformat()
    
    try:
        cursor.execute("""
            INSERT INTO users (name, phone, email, password, licenseNumber, vehicles, createdAt, gender, vehicleNumber, authProvider, googleId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (req.name, req.phone, req.email, hashed_password, None, '[]', created_at, req.gender, req.vehicleNumber, 'google', req.googleId))
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail="Database error during Google registration")
        
    conn.close()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": req.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    licenseNumber: Optional[str] = None
    vehicles: Optional[List[VehicleModel]] = None
    emergencyContact: Optional[str] = None
    emergencyContactName: Optional[str] = None

@router.put("/update")
def update_profile(req: UpdateProfileRequest, email: str = Depends(get_current_user_email)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="User not found")
        
    name = req.name if req.name is not None else user['name']
    phone = req.phone if req.phone is not None else user['phone']
    license_number = req.licenseNumber if req.licenseNumber is not None else user['licenseNumber']
    
    current_ec = None
    try:
        current_ec = user['emergencyContact']
    except Exception:
        pass
        
    current_ec_name = None
    try:
        current_ec_name = user['emergencyContactName']
    except Exception:
        pass
        
    emergency_contact = req.emergencyContact if req.emergencyContact is not None else current_ec
    emergency_contact_name = req.emergencyContactName if req.emergencyContactName is not None else current_ec_name
    
    if req.vehicles is not None:
        import json
        vehicles_json = json.dumps([v.dict() for v in req.vehicles])
    else:
        vehicles_json = user['vehicles']
        
    cursor.execute("""
        UPDATE users
        SET name = ?, phone = ?, licenseNumber = ?, emergencyContact = ?, emergencyContactName = ?, vehicles = ?
        WHERE email = ?
    """, (name, phone, license_number, emergency_contact, emergency_contact_name, vehicles_json, email))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Profile updated successfully"}

@router.get("/me")
def get_user_profile(email: str = Depends(get_current_user_email)):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    import json
    vehicles = json.loads(user['vehicles']) if user['vehicles'] else []
    
    ec = None
    try:
        ec = user['emergencyContact']
    except Exception:
        pass
        
    ec_name = None
    try:
        ec_name = user['emergencyContactName']
    except Exception:
        pass
        
    gender = None
    vehicle_num = None
    try: gender = user['gender']
    except Exception: pass
    try: vehicle_num = user['vehicleNumber']
    except Exception: pass
        
    return {
        "_id": user['id'],
        "name": user['name'],
        "phone": user['phone'],
        "email": user['email'],
        "licenseNumber": user['licenseNumber'],
        "vehicles": vehicles,
        "emergencyContact": ec,
        "emergencyContactName": ec_name,
        "createdAt": user['createdAt'],
        "gender": gender,
        "vehicleNumber": vehicle_num
    }
