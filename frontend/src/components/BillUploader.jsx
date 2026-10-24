import { useRef } from "react";
import { Camera } from "lucide-react";

export default function BillUploader({ onBillLoaded, disabled }) {
  const inputRef = useRef(null);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/bill/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("OCR upload failed");
      const data = await res.json();
      onBillLoaded(data);
    } catch (err) {
      alert(err.message || "Upload failed");
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        <Camera size={16} />
        Scan Receipt (OCR)
      </button>
    </>
  );
}
