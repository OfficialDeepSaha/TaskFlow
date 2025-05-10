import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to dashboard
    navigate("/dashboard");
  }, [navigate]);

  // Return an empty div instead of null to satisfy JSX.Element return type
  return <div></div>;
}
