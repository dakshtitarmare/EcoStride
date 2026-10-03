import uuid
from datetime import datetime
from firebase_admin import db

class EcoDrivesService:
    def __init__(self):
        # Base references
        self.events_ref = db.reference('events')
        self.organizers_ref = db.reference('organizers')
        self.participants_ref = db.reference('eventParticipants')
        
    def _now_iso(self):
        return datetime.now().isoformat()

    # --- Public / User Methods ---
    def get_all_events(self, status_filter=None, city=None, event_type=None):
        try:
            events_data = self.events_ref.get() or {}
            result = []
            
            for event_id, event in events_data.items():
                if status_filter and event.get('status') != status_filter:
                    continue
                if city and event.get('location', {}).get('city') != city:
                    pass
                if event_type and event.get('type') != event_type:
                    continue
                    
                result.append(event)
                
            result.sort(key=lambda x: (x.get('date', ''), x.get('startTime', '')), reverse=False)
            return True, result
        except Exception as e:
            return False, str(e)

    def get_event(self, event_id):
        try:
            event = self.events_ref.child(event_id).get()
            if not event:
                return False, 'Event not found'
            return True, event
        except Exception as e:
            return False, str(e)

    def request_to_join(self, event_id, user_data):
        try:
            uid = user_data.get('uid')
            event = self.events_ref.child(event_id).get()
            if not event:
                return False, 'Event not found'
            
            part_ref = self.participants_ref.child(event_id).child(uid)
            existing = part_ref.get()
            if existing:
                return False, 'Already joined'
                
            participant = {
                'userId': uid,
                'userName': user_data.get('name', 'Unknown User'),
                'userEmail': user_data.get('email', ''),
                'joinedAt': self._now_iso(),
                'status': 'joined' # Auto-accept for hackathon
            }
            part_ref.set(participant)
            
            current_count = event.get('participantCount', 0)
            self.events_ref.child(event_id).update({
                'participantCount': current_count + 1
            })
            
            return True, 'Successfully joined the drive'
        except Exception as e:
            return False, str(e)

    def get_join_status(self, event_id, uid):
        try:
            participant = self.participants_ref.child(event_id).child(uid).get()
            if participant:
                return True, {'joined': True, 'requestStatus': participant.get('status')}
            return True, {'joined': False}
        except Exception as e:
            return False, str(e)

    def cancel_join_request(self, event_id, uid):
        try:
            part_ref = self.participants_ref.child(event_id).child(uid)
            if not part_ref.get():
                return False, 'Not joined'
                
            part_ref.delete()
            
            event = self.events_ref.child(event_id).get()
            if event:
                current_count = event.get('participantCount', 0)
                new_count = max(0, current_count - 1)
                self.events_ref.child(event_id).update({'participantCount': new_count})
                
            return True, 'Join request cancelled'
        except Exception as e:
            return False, str(e)


    # --- Organizer Methods ---
    def get_organizer(self, uid):
        try:
            return self.organizers_ref.child(uid).get()
        except:
            return None

    def apply_organizer(self, user_data, application_data):
        try:
            uid = user_data.get('uid')
            existing = self.get_organizer(uid)
            if existing:
                return False, 'Already an organizer'
                
            org_data = {
                'uid': uid,
                'name': application_data.get('name', user_data.get('name', 'Organizer')),
                'email': user_data.get('email'),
                'type': application_data.get('type', 'individual'),
                'description': application_data.get('description', ''),
                'phone': application_data.get('phone', ''),
                'status': 'approved',
                'createdAt': self._now_iso()
            }
            self.organizers_ref.child(uid).set(org_data)
            return True, org_data
        except Exception as e:
            return False, str(e)

    def create_event(self, organizer, event_data):
        try:
            event_id = str(uuid.uuid4())
            
            new_event = {
                'id': event_id,
                'title': event_data.get('title', ''),
                'type': event_data.get('type', 'Other'),
                'motive': event_data.get('motive', ''),
                'description': event_data.get('description', ''),
                
                'organizerId': organizer.get('uid'),
                'organizerName': organizer.get('name'),
                'organizerType': organizer.get('type'),
                
                'date': event_data.get('date', ''),
                'startTime': event_data.get('startTime', ''),
                'endTime': event_data.get('endTime', ''),
                
                'location': {
                    'name': event_data.get('locationName', ''),
                    'address': event_data.get('address', ''),
                    'lat': float(event_data.get('lat', 0)),
                    'lon': float(event_data.get('lon', 0)),
                },
                
                'status': 'upcoming',
                'createdAt': self._now_iso(),
                'updatedAt': self._now_iso(),
                'participantCount': 0
            }
            
            self.events_ref.child(event_id).set(new_event)
            return True, new_event
        except Exception as e:
            return False, str(e)

    def get_organizer_events(self, organizer_id):
        try:
            events_data = self.events_ref.get() or {}
            result = [v for k, v in events_data.items() if v.get('organizerId') == organizer_id]
            result.sort(key=lambda x: (x.get('date', ''), x.get('startTime', '')), reverse=True)
            return True, result
        except Exception as e:
            return False, str(e)

    def update_event(self, organizer_id, event_id, event_data):
        try:
            event = self.events_ref.child(event_id).get()
            if not event:
                return False, 'Event not found'
            
            if event.get('organizerId') != organizer_id:
                return False, 'Unauthorized'
                
            update_data = {
                'title': event_data.get('title', event.get('title')),
                'type': event_data.get('type', event.get('type')),
                'motive': event_data.get('motive', event.get('motive')),
                'description': event_data.get('description', event.get('description')),
                'date': event_data.get('date', event.get('date')),
                'startTime': event_data.get('startTime', event.get('startTime')),
                'endTime': event_data.get('endTime', event.get('endTime')),
                'location': {
                    'name': event_data.get('locationName', event.get('location', {}).get('name')),
                    'address': event_data.get('address', event.get('location', {}).get('address')),
                    'lat': float(event_data.get('lat', event.get('location', {}).get('lat'))),
                    'lon': float(event_data.get('lon', event.get('location', {}).get('lon'))),
                },
                'updatedAt': self._now_iso()
            }
            
            self.events_ref.child(event_id).update(update_data)
            return True, 'Event updated'
        except Exception as e:
            return False, str(e)

    def cancel_event(self, organizer_id, event_id):
        try:
            event = self.events_ref.child(event_id).get()
            if not event:
                return False, 'Event not found'
            
            if event.get('organizerId') != organizer_id:
                return False, 'Unauthorized'
                
            self.events_ref.child(event_id).update({
                'status': 'cancelled',
                'updatedAt': self._now_iso()
            })
            return True, 'Event cancelled'
        except Exception as e:
            return False, str(e)

    def get_event_participants(self, organizer_id, event_id):
        try:
            event = self.events_ref.child(event_id).get()
            if not event:
                return False, 'Event not found'
                
            if event.get('organizerId') != organizer_id:
                return False, 'Unauthorized'
                
            participants = self.participants_ref.child(event_id).get() or {}
            return True, list(participants.values())
        except Exception as e:
            return False, str(e)
