import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// Legacy route — consent is integrated into the questionnaire review step.
export const Route = createFileRoute("/consent")({
  component: ConsentRedirect,
});

function ConsentRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: "/questionnaire", replace: true });
  }, [navigate]);
  return null;
}
