from datetime import datetime
try:
    from firebase_admin import db
except ImportError:
    db = None

class UsageTrackingService:
    def __init__(self, limit=5):
        self.advanced_route_daily_limit = limit

    def _get_today_str(self):
        return datetime.now().strftime("%Y-%m-%d")

    def check_and_increment_usage(self, user_info):
        """
        Checks if the user can perform advanced route analysis.
        Returns: (can_proceed: bool, remaining: int)
        """
        if not user_info:
            return False, 0
            
        uid = user_info.get("uid")
        if not uid or not db:
            return False, 0

        try:
            user_ref = db.reference(f'users/{uid}')
            user_data = user_ref.get() or {}
            
            # Check plan
            plan = user_data.get('plan', 'free')
            if plan == 'premium':
                return True, -1 # Unlimited
                
            # Free plan limits
            today = self._get_today_str()
            usage = user_data.get('advancedRouteUsage', {})
            
            current_date = usage.get('date')
            count = usage.get('count', 0)
            
            if current_date != today:
                count = 0
                
            if count >= self.advanced_route_daily_limit:
                return False, 0
                
            # Increment
            count += 1
            user_ref.child('advancedRouteUsage').set({
                'date': today,
                'count': count
            })
            
            remaining = self.advanced_route_daily_limit - count
            return True, remaining
            
        except Exception as e:
            print(f"Usage tracking error: {e}")
            return False, 0
