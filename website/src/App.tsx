import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { Landing } from "./pages/Landing";
import { Overview } from "./pages/Overview";
import { Incidents } from "./pages/Incidents";
import { IncidentDetail } from "./pages/IncidentDetail";
import { Events } from "./pages/Events";
import { Services } from "./pages/Services";
import { Simulation } from "./pages/Simulation";
import { Policy } from "./pages/Policy";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Overview />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="incidents/:id" element={<IncidentDetail />} />
        <Route path="events" element={<Events />} />
        <Route path="services" element={<Services />} />
        <Route path="simulation" element={<Simulation />} />
        <Route path="policy" element={<Policy />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
