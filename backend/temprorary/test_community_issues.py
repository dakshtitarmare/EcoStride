import unittest
from unittest.mock import patch

from backend.services.community_issues import (
    CommunityIssueService,
    haversine_meters,
    validate_coordinates,
)


class CommunityIssueTests(unittest.TestCase):
    def test_coordinate_validation(self):
        self.assertIsNone(validate_coordinates(18.52, 73.85)[2])
        self.assertIsNotNone(validate_coordinates(91, 73.85)[2])
        self.assertIsNotNone(validate_coordinates(18.52, 181)[2])

    def test_haversine_zero_distance(self):
        self.assertEqual(haversine_meters(18.52, 73.85, 18.52, 73.85), 0)

    def test_confidence_increases_with_yes_feedback(self):
        service = CommunityIssueService()
        low = service.confidence({"severity": "medium", "yesCount": 0, "noCount": 0})
        high = service.confidence({"severity": "medium", "yesCount": 4, "noCount": 0})
        self.assertGreater(high, low)

    @patch("backend.services.community_issues.rtdb.reference")
    def test_route_matching_ignores_resolved_reports(self, reference):
        reference.return_value.get.return_value = {
            "active-id": {
                "type": "road_blockage",
                "title": "Blocked",
                "description": "",
                "city": "Pune",
                "lat": 18.5201,
                "lon": 73.8501,
                "status": "active",
                "createdAt": "2026-10-03T10:00:00+00:00",
                "yesCount": 1,
                "noCount": 0,
            },
            "resolved-id": {
                "type": "accident",
                "city": "Pune",
                "lat": 18.5201,
                "lon": 73.8501,
                "status": "resolved",
                "createdAt": "2026-10-03T10:00:00+00:00",
            },
        }
        route = {"geometry": {"coordinates": [[73.85, 18.52], [73.851, 18.521]]}}
        result = CommunityIssueService().enrich_routes([route])[0]
        self.assertEqual([issue["id"] for issue in result["communityIssues"]], ["active-id"])


if __name__ == "__main__":
    unittest.main()
