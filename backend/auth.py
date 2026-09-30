"""
Firebase Authentication Module
Handles Google Sign-in, user verification, and database operations
"""

import firebase_admin
from firebase_admin import credentials, db, auth
import os
import json
from datetime import datetime

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    if firebase_admin._apps:
        return firebase_admin.get_app()

    from config import FIREBASE_DATABASE_URL, FIREBASE_CREDENTIALS
    import glob
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(base_dir)

    # 1. Try environment variable FIREBASE_CREDENTIALS (JSON string or file path)
    firebase_credentials = os.getenv('FIREBASE_CREDENTIALS') or FIREBASE_CREDENTIALS
    cred = None

    if firebase_credentials:
        if not os.path.isabs(firebase_credentials):
            firebase_credentials = os.path.join(base_dir, firebase_credentials)
        if os.path.exists(firebase_credentials):
            cred = credentials.Certificate(firebase_credentials)
        else:
            try:
                creds_dict = json.loads(firebase_credentials)
                cred = credentials.Certificate(creds_dict)
            except Exception:
                pass

    # 2. Check explicit service account files in project directory
    if not cred:
        known_files = [
            os.path.join(base_dir, 'eco-stride2026-firebase-adminsdk-fbsvc-1f2810f333.json'),
            os.path.join(base_dir, 'eco-stride2026.json'),
            os.path.join(base_dir, 'Keys', 'eco-stride2026.json'),
            os.path.join(project_dir, 'eco-stride2026-firebase-adminsdk-fbsvc-1f2810f333.json'),
            os.path.join(project_dir, 'eco-stride2026.json'),
        ]
        # Also auto-discover any firebase-adminsdk json files
        known_files.extend(glob.glob(os.path.join(base_dir, '*firebase-adminsdk*.json')))
        known_files.extend(glob.glob(os.path.join(base_dir, 'eco-stride*.json')))
        known_files.extend(glob.glob(os.path.join(project_dir, '*firebase-adminsdk*.json')))
        known_files.extend(glob.glob(os.path.join(project_dir, 'eco-stride*.json')))

        for candidate in set(known_files):
            if os.path.exists(candidate):
                try:
                    cred = credentials.Certificate(candidate)
                    break
                except Exception as e:
                    print(f"Warning: Found credentials file {candidate} but failed to load: {e}")

    if not cred:
        raise FileNotFoundError(
            "Firebase credentials not found. "
            "Please provide eco-stride2026-firebase-adminsdk-fbsvc-1f2810f333.json or set FIREBASE_CREDENTIALS"
        )
    
    # Use database URL from config
    db_url = FIREBASE_DATABASE_URL or 'https://eco-stride2026-default-rtdb.firebaseio.com'
    
    app = firebase_admin.initialize_app(cred, {
        'databaseURL': db_url
    })
    ensure_default_admin()
    return app

def ensure_default_admin():
    """Ensure default admin credentials exist in RTDB if not present"""
    try:
        admin_ref = db.reference('admin')
        if not admin_ref.get():
            admin_data = {
                'username': 'admin',
                'password': 'securepassword',
                'role': 'superadmin',
                'created_at': datetime.now().isoformat()
            }
            admin_ref.child('admin1').set(admin_data)
            db.reference('admins/admin1').set(admin_data)
    except Exception as e:
        print(f"Notice: Could not check/seed default admin: {e}")

def verify_google_token(id_token):
    """
    Verify Google ID token and get user info
    Returns: dict with uid, email, name, or None if invalid
    """
    try:
        decoded_token = auth.verify_id_token(id_token)
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email'),
            'name': decoded_token.get('name'),
            'picture': decoded_token.get('picture')
        }
    except Exception as e:
        print(f"Token verification failed: {e}")
        return None

def user_exists(uid):
    """Check if user exists in database"""
    try:
        user_ref = db.reference(f'users/{uid}')
        return user_ref.get() is not None
    except Exception as e:
        print(f"Error checking user existence: {e}")
        return False

def get_user_data(uid):
    """Get user data from Firebase Realtime DB"""
    try:
        user_ref = db.reference(f'users/{uid}')
        return user_ref.get()
    except Exception as e:
        print(f"Error fetching user data: {e}")
        return None

def user_email_exists(email):
    """Check if another user with the same email already exists"""
    try:
        users_ref = db.reference('users')
        users = users_ref.get()
        
        if not users:
            return False
        
        for uid, user_data in users.items():
            if user_data and user_data.get('email', '').lower() == email.lower():
                return True
        return False
    except Exception as e:
        print(f"Error checking email existence: {e}")
        return False

def create_user(uid, email, name):
    """
    Create a new user in Firebase Realtime DB
    Returns: success status and message
    """
    try:
        # Check if email already exists
        if user_email_exists(email):
            return False, "Email already registered with another account"
        
        user_ref = db.reference(f'users/{uid}')
        user_ref.set({
            'uid': uid,
            'email': email,
            'name': name,
            'created_at': datetime.now().isoformat()
        })
        return True, "User created successfully"
    except Exception as e:
        print(f"Error creating user: {e}")
        return False, str(e)

def update_user_profile(uid, profile_data):
    """
    Update user profile with onboarding information
    
    Expected profile_data:
    {
        'name': str,
        'dob': str (YYYY-MM-DD),
        'age': int,
        'medical_conditions': list,
        'activity_level': str,
        'emergency_contact': str (optional),
        'allergies': str (optional),
        'profile_completed': bool
    }
    """
    try:
        user_ref = db.reference(f'users/{uid}')
        user_ref.update(profile_data)
        return True, "Profile updated successfully"
    except Exception as e:
        print(f"Error updating profile: {e}")
        return False, str(e)

def get_user_by_email(email):
    """Get user UID by email"""
    try:
        users_ref = db.reference('users')
        users = users_ref.get()
        
        if not users:
            return None
        
        for uid, user_data in users.items():
            if user_data and user_data.get('email', '').lower() == email.lower():
                return uid
        return None
    except Exception as e:
        print(f"Error getting user by email: {e}")
        return None
