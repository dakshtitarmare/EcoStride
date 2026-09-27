"""
Test script to verify Firebase Realtime Database connectivity
Run this to diagnose the community message storage issue
"""

import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from backend.auth import initialize_firebase
from backend.services.community_message import CommunityMessageService
from datetime import datetime, timedelta
import json

def test_firebase_connection():
    """Test if Firebase is properly initialized"""
    print("\n" + "="*60)
    print("🔍 FIREBASE CONNECTIVITY TEST")
    print("="*60)
    
    try:
        print("\n✓ Initializing Firebase...")
        initialize_firebase()
        print("✓ Firebase initialized successfully!")
        
        # Test write
        print("\n📝 Testing write to Firebase...")
        service = CommunityMessageService()
        
        test_title = f"Test Message - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        test_content = "This is a test message to verify Firebase Realtime DB is working."
        test_expires = (datetime.now() + timedelta(days=7)).isoformat()
        
        success, result = service.create_message(test_title, test_content, test_expires)
        
        if success:
            print(f"✓ Message created successfully!")
            print(f"  Message ID: {result.get('messageId')}")
            message_id = result.get('messageId')
            
            # Test read
            print("\n📖 Testing read from Firebase...")
            messages = service.get_active_messages()
            
            if messages:
                print(f"✓ Retrieved {len(messages)} active messages from Firebase!")
                
                # Find our test message
                test_msg = next((m for m in messages if m['id'] == message_id), None)
                if test_msg:
                    print(f"\n✓ TEST MESSAGE FOUND IN FIREBASE:")
                    print(f"  Title: {test_msg['title']}")
                    print(f"  Content: {test_msg['content']}")
                    print(f"  Created: {test_msg['createdAt']}")
                    
                    # Clean up - delete test message
                    print("\n🧹 Cleaning up test message...")
                    del_success, del_result = service.delete_message(message_id)
                    if del_success:
                        print("✓ Test message deleted successfully")
                    
                    print("\n" + "="*60)
                    print("✅ FIREBASE IS WORKING CORRECTLY!")
                    print("="*60)
                    return True
                else:
                    print("❌ Test message not found in Firebase!")
            else:
                print("⚠️  No messages returned from Firebase (could be empty)")
        else:
            print(f"❌ Failed to create message: {result.get('error')}")
            print("\n" + "="*60)
            print("❌ FIREBASE WRITE FAILED - CHECK CONFIGURATION")
            print("="*60)
            return False
            
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\n" + "="*60)
        print("❌ FIREBASE NOT PROPERLY CONFIGURED")
        print("="*60)
        print("\nTROUBLESHOOTING STEPS:")
        print("1. Check if FIREBASE_CREDENTIALS environment variable is set")
        print("2. Check if eco-stride2026.json exists in project root")
        print("3. Check if FIREBASE_DATABASE_URL environment variable is set")
        print("4. Verify Firebase credentials have Realtime DB access")
        return False

if __name__ == "__main__":
    test_firebase_connection()
