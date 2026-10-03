"""Firebase-backed community issue reporting and route integration."""

from datetime import datetime, timezone
import math
import os
from typing import Dict, Iterable, List, Optional, Tuple

from firebase_admin import db as rtdb


ISSUE_TYPES = {
    "road_blockage", "accident", "road_damage", "construction",
    "waterlogging", "traffic_obstruction", "fallen_tree", "garbage",
    "fire", "smoke", "dust", "smell", "other",
}
SEVERITIES = {"low", "medium", "high", "critical"}
STATUSES = {"active", "resolved", "expired"}
VERIFICATION_RADIUS_METERS = float(os.getenv("COMMUNITY_VERIFICATION_RADIUS_METERS", "300"))
ROUTE_CORRIDOR_METERS = float(os.getenv("COMMUNITY_ROUTE_CORRIDOR_METERS", "150"))
MAX_REPORT_AGE_HOURS = float(os.getenv("COMMUNITY_REPORT_MAX_AGE_HOURS", "168"))


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def validate_coordinates(lat, lon) -> Tuple[Optional[float], Optional[float], Optional[str]]:
    try:
        lat_value, lon_value = float(lat), float(lon)
    except (TypeError, ValueError):
        return None, None, "Valid latitude and longitude are required"
    if not -90 <= lat_value <= 90:
        return None, None, "Latitude must be between -90 and 90"
    if not -180 <= lon_value <= 180:
        return None, None, "Longitude must be between -180 and 180"
    return lat_value, lon_value, None


def haversine_meters(lat1, lon1, lat2, lon2) -> float:
    radius = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    value = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(min(1, value)))


def _timestamp(report: Dict) -> str:
    return report.get("createdAt") or report.get("timestamp") or ""


def _is_active(report: Dict, now: Optional[datetime] = None) -> bool:
    if report.get("status", "active") not in {"active", "unresolved"}:
        return False
    if not _timestamp(report):
        return True
    try:
        created = datetime.fromisoformat(_timestamp(report).replace("Z", "+00:00"))
        current = now or datetime.now(timezone.utc)
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return (current - created).total_seconds() <= MAX_REPORT_AGE_HOURS * 3600
    except (TypeError, ValueError):
        return True


def _effective_status(report: Dict) -> str:
    status = "active" if report.get("status") == "unresolved" else report.get("status", "active")
    return "expired" if status == "active" and not _is_active(report) else status


def _safe_report(report_id: str, report: Dict) -> Dict:
    feedback = report.get("feedback", {})
    yes_count = int(report.get("yesCount", sum(1 for item in feedback.values() if item.get("response") == "yes")))
    no_count = int(report.get("noCount", sum(1 for item in feedback.values() if item.get("response") == "no")))
    return {
        "id": report_id,
        "type": report.get("type", "other"),
        "title": report.get("title") or report.get("type", "Community issue").replace("_", " ").title(),
        "description": report.get("description", ""),
        "city": report.get("city", ""),
        "lat": float(report["lat"]),
        "lon": float(report["lon"]),
        "address": report.get("address", ""),
        "severity": report.get("severity", "medium"),
        "status": _effective_status(report),
        "reportedBy": {"name": (report.get("reportedBy") or {}).get("name") or "Community member"},
        "createdAt": _timestamp(report),
        "updatedAt": report.get("updatedAt") or _timestamp(report),
        "yesCount": yes_count,
        "noCount": no_count,
    }


class CommunityIssueService:
    def create_report(self, payload: Dict, user: Dict) -> Tuple[bool, Dict]:
        issue_type = str(payload.get("type") or "other").strip().lower()
        severity = str(payload.get("severity") or "medium").strip().lower()
        if issue_type not in ISSUE_TYPES:
            return False, {"error": "Invalid issue type"}
        if severity not in SEVERITIES:
            return False, {"error": "Invalid severity"}
        lat, lon, error = validate_coordinates(payload.get("lat"), payload.get("lon"))
        if error:
            return False, {"error": error}
        title = str(payload.get("title") or issue_type.replace("_", " ").title()).strip()
        description = str(payload.get("description") or "").strip()
        city = str(payload.get("city") or "").strip()
        if not city:
            return False, {"error": "city is required"}
        if len(title) > 160 or len(description) > 2000:
            return False, {"error": "title or description is too long"}

        timestamp = _now()
        report = {
            "type": issue_type,
            "title": title,
            "description": description,
            "city": city,
            "lat": lat,
            "lon": lon,
            "address": str(payload.get("address") or "").strip()[:300],
            "severity": severity,
            "status": "active",
            "reportedBy": {"uid": user["uid"], "name": user.get("name") or "Community member"},
            "createdAt": timestamp,
            "updatedAt": timestamp,
            "yesCount": 0,
            "noCount": 0,
        }
        report_ref = rtdb.reference("communityReports").push()
        report_ref.set(report)
        return True, {"reportId": report_ref.key, "report": _safe_report(report_ref.key, report)}

    def get_reports(self, filters: Optional[Dict] = None) -> List[Dict]:
        data = rtdb.reference("communityReports").get() or {}
        filters = filters or {}
        status = filters.get("status")
        city = filters.get("city")
        center_lat, center_lon = validate_coordinates(filters.get("lat"), filters.get("lon"))[:2]
        radius = float(filters.get("radius") or 0)
        reports = []
        for report_id, report in data.items():
            if not report:
                continue
            normalized_status = _effective_status(report)
            if status and normalized_status != status:
                continue
            if not status and normalized_status != "active":
                continue
            if city and str(report.get("city", "")).lower() != str(city).lower():
                continue
            try:
                safe = _safe_report(report_id, report)
            except (KeyError, TypeError, ValueError):
                continue
            if center_lat is not None and center_lon is not None and radius:
                distance = haversine_meters(center_lat, center_lon, safe["lat"], safe["lon"])
                if distance > radius:
                    continue
            reports.append(safe)
        return sorted(reports, key=lambda item: item["createdAt"], reverse=True)

    def submit_feedback(self, report_id: str, payload: Dict, user: Dict) -> Tuple[bool, Dict]:
        response = str(payload.get("response") or "").lower()
        if response not in {"yes", "no"}:
            return False, {"error": "response must be yes or no"}
        lat, lon, error = validate_coordinates(payload.get("lat"), payload.get("lon"))
        if error:
            return False, {"error": error}
        report_ref = rtdb.reference(f"communityReports/{report_id}")
        report = report_ref.get()
        if not report:
            return False, {"error": "Report not found"}
        if not _is_active(report):
            return False, {"error": "Only active reports can be verified"}
        distance = haversine_meters(lat, lon, float(report["lat"]), float(report["lon"]))
        if distance > VERIFICATION_RADIUS_METERS:
            return False, {"error": f"You must be within {int(VERIFICATION_RADIUS_METERS)} meters of the issue"}

        feedback_ref = rtdb.reference(f"communityReportFeedback/{report_id}/{user['uid']}")
        feedback_ref.set({"response": response, "lat": lat, "lon": lon, "distanceFromIssue": round(distance, 2), "createdAt": _now()})
        feedback = rtdb.reference(f"communityReportFeedback/{report_id}").get() or {}
        yes_count = sum(1 for item in feedback.values() if item.get("response") == "yes")
        no_count = sum(1 for item in feedback.values() if item.get("response") == "no")
        report_ref.update({"yesCount": yes_count, "noCount": no_count, "updatedAt": _now()})
        return True, {"yesCount": yes_count, "noCount": no_count, "distanceFromIssue": round(distance, 2)}

    def confidence(self, issue: Dict) -> float:
        yes_count, no_count = issue.get("yesCount", 0), issue.get("noCount", 0)
        total = yes_count + no_count
        agreement = (yes_count / total) if total else 0.25
        severity_bonus = {"low": 0.0, "medium": 0.05, "high": 0.1, "critical": 0.15}.get(issue.get("severity"), 0.05)
        return round(min(0.95, max(0.05, 0.25 + agreement * 0.55 + min(yes_count, 5) * 0.04 + severity_bonus)), 2)

    def enrich_routes(self, routes: Iterable[Dict]) -> List[Dict]:
        reports = self.get_reports({"status": "active"})
        enriched = []
        for route in routes:
            issues = []
            coordinates = (route.get("geometry") or {}).get("coordinates") or []
            for issue in reports:
                nearest = min(
                    (haversine_meters(issue["lat"], issue["lon"], point[1], point[0]) for point in coordinates if len(point) >= 2),
                    default=float("inf"),
                )
                if nearest <= ROUTE_CORRIDOR_METERS:
                    confidence = self.confidence(issue)
                    issues.append({
                        "id": issue["id"], "type": issue["type"], "severity": issue["severity"],
                        "lat": issue["lat"], "lon": issue["lon"], "distanceFromRoute": round(nearest, 2),
                        "yesCount": issue["yesCount"], "noCount": issue["noCount"],
                        "confidence": confidence, "status": issue["status"],
                    })
            issues.sort(key=lambda item: item["distanceFromRoute"])
            updated = dict(route)
            updated["communityIssues"] = issues
            updated["routeWarnings"] = [
                f"Community-reported {item['type'].replace('_', ' ')} near the route"
                for item in issues
            ]
            enriched.append(updated)
        return enriched
