import {
  CloudRain,
  DivideSquare,
  Heart,
  HeartPulse,
  LayoutDashboard,
  Route,
  ShieldAlert,
  Users,
  Bell,
} from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", sub: "Live AQI" },
  { to: "/dashboard/forecast", icon: CloudRain, label: "Forecast", sub: "72-Hour" },
  { to: "/dashboard/routing", icon: Route, label: "Routing", sub: "Eco Routes" },
  { to: "/dashboard/policy", icon: ShieldAlert, label: "Policy", sub: "Simulation" },
  { to: "/dashboard/safe-zones", icon: Heart, label: "Safe Zones", sub: "Clean Areas" },
  { to: "/dashboard/health-advisory", icon: HeartPulse, label: "Health Advisory", sub: "Personalized" },
  { to: "/dashboard/compare", icon: DivideSquare, label: "Compare", sub: "Cities" },
  { to: "/dashboard/eco-drives", icon: Heart, label: "Eco Drives", sub: "Volunteer" },
  { to: "/dashboard/community", icon: Users, label: "Community", sub: "Reports" },
  { to: "/dashboard/alerts", icon: Bell, label: "Alerts", sub: "Notifications" },
];
