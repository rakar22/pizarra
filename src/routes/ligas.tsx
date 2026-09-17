import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ligas")({
  component: LigasLayout,
});

function LigasLayout() {
  return <Outlet />;
}
