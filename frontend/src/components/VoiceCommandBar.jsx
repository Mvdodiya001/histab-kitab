import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Send } from "lucide-react";

const SAMPLE_CHIPS = [
  "Chai aur Maggi Rahul ke khate mein daal do",
  "Paneer Paratha Aman aur Priya mein barabar baant do",
  "Baaki sab Rahul, Aman aur Priya mein equal split kar do",
  "Sab kuch reset कर दो",
];

export default function VoiceCommandBar({
  sessionId,
  onCommandResult,
  lastTranscript,
  lastReply,
}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const sendText = async (commandText) => {
    const trimmed = commandText.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bill/${sessionId}/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error("Text command failed");
      const data = await res.json();
      onCommandResult(data);
      setText("");
    } catch (err) {
      alert(err.message || "Command failed");
    } finally {
      setBusy(false);
    }
  };

  const sendVoiceBlob = async (blob) => {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice.webm");
      const res = await fetch(`/api/bill/${sessionId}/voice`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Voice command failed");
      const data = await res.json();
      onCommandResult(data);
    } catch (err) {
      alert(err.message || "Voice failed");
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (busy || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) await sendVoiceBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Microphone permission is required for voice commands.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  return (
    <div className="sticky bottom-0 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mx-auto max-w-7xl space-y-3 px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {SAMPLE_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => sendText(chip)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:hover:bg-slate-800"
            >
              {chip}
            </button>
          ))}
        </div>

        {(lastTranscript || lastReply) && (
          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase text-slate-500">
                What Saaras STT heard
              </p>
              <p>{lastTranscript || "—"}</p>
            </div>
            <div className="rounded-xl bg-orange-50 px-3 py-2 text-sm dark:bg-orange-950/30">
              <p className="text-xs font-semibold uppercase text-slate-500">
                What Bulbul TTS spoke
              </p>
              <p className="font-medium">{lastReply || "—"}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ${
              recording
                ? "bg-red-500 hover:bg-red-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            } disabled:opacity-60`}
          >
            {recording ? <MicOff size={18} /> : <Mic size={18} />}
            {recording ? "Stop Recording" : "Hold to Record Voice"}
          </button>

          <div className="flex flex-1 gap-2">
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") sendText(text);
              }}
              placeholder="Type Hinglish command…"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm dark:border-slate-600 dark:bg-slate-800"
              disabled={busy}
            />
            <button
              type="button"
              onClick={() => sendText(text)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-saffron-500 px-4 py-3 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-60"
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
