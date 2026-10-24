import { useCallback, useEffect, useMemo, useState } from "react";
import { Moon, Sun, Upload } from "lucide-react";
import BillUploader from "./components/BillUploader.jsx";
import LiveSplitTable from "./components/LiveSplitTable.jsx";
import PersonSummaryCards from "./components/PersonSummaryCards.jsx";
import VoiceCommandBar from "./components/VoiceCommandBar.jsx";

const API_BASE = "/api";

export default function App() {
  const [billState, setBillState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [lastTranscript, setLastTranscript] = useState("");
  const [lastReply, setLastReply] = useState("");

  const itemsSubtotal = useMemo(() => {
    if (!billState) return 0;
    return billState.items.reduce((sum, item) => sum + item.total_price, 0);
  }, [billState]);

  const applyTheme = useCallback((enabled) => {
    document.documentElement.classList.toggle("dark", enabled);
  }, []);

  const toggleTheme = () => {
    setDarkMode((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  useEffect(() => {
    applyTheme(darkMode);
  }, [applyTheme, darkMode]);

  const handleBillLoaded = (state) => {
    setBillState(state);
    setError("");
    setLastTranscript("");
    setLastReply("");
  };

  const loadDemoBill = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/bill/demo`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to load demo bill");
      const data = await res.json();
      handleBillLoaded(data);
    } catch (err) {
      setError(err.message || "Demo load failed");
    } finally {
      setLoading(false);
    }
  };

  const onCommandResult = (payload) => {
    setBillState(payload.state);
    setLastTranscript(payload.transcript);
    setLastReply(payload.spoken_reply);
    if (payload.audio_base64) {
      const audio = new Audio(`data:audio/mp3;base64,${payload.audio_base64}`);
      audio.play().catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50/30 to-slate-100 dark:from-ink-900 dark:via-slate-900 dark:to-ink-800">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Hisab-Kitab AI
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Bol ke bill baanto — Powered by Sarvam AI
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadDemoBill}
              disabled={loading}
              className="rounded-lg bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-saffron-600 disabled:opacity-60"
            >
              Load Demo Bill
            </button>
            <BillUploader onBillLoaded={handleBillLoaded} disabled={loading} />
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-lg border border-slate-300 p-2 dark:border-slate-600"
              aria-label="Toggle theme"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {!billState ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-600 dark:bg-slate-900/40">
            <Upload className="mb-3 text-saffron-500" size={40} />
            <h2 className="text-lg font-semibold">Scan a receipt or load the demo</h2>
            <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">
              Upload a hostel canteen or cafe bill, then split items by voice in Hindi,
              Hinglish, Gujarati, or English.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <LiveSplitTable billState={billState} itemsSubtotal={itemsSubtotal} />
            <PersonSummaryCards billState={billState} />
          </div>
        )}
      </main>

      {billState && (
        <VoiceCommandBar
          sessionId={billState.session_id}
          onCommandResult={onCommandResult}
          lastTranscript={lastTranscript}
          lastReply={lastReply}
        />
      )}
    </div>
  );
}
