import { DailyEntryDashboard } from "@/components/daily-entry-dashboard";
import { obtenerEntradas } from "@/lib/data";

export default async function Home() {
  const entries = await obtenerEntradas();
  const initialEntries = entries.map((entry) => ({
    ...entry,
    fecha: entry.fecha.toISOString(),
  }));

  return <DailyEntryDashboard initialEntries={initialEntries} />;
}
