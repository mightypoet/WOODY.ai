import React, { useState } from "react";
import Modal from "../Modal";
import { dbService } from "../../services/dbService";

export default function DailyActivityModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: () => void }) {
  const [repName, setRepName] = useState("");
  const [dials, setDials] = useState<number | "">("");
  const [dms, setDms] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repName || dials === "" || dms === "") return;
    
    setLoading(true);
    try {
      await dbService.create("daily_activities", {
        rep_name: repName,
        date: new Date().toISOString().split("T")[0],
        dials: Number(dials),
        dms: Number(dms),
        createdAt: new Date().toISOString()
      });
      setRepName("");
      setDials("");
      setDms("");
      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Error saving activity");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Daily Activity">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Rep Name</label>
          <input
            type="text"
            required
            value={repName}
            onChange={e => setRepName(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all mt-1 text-white"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Dials</label>
            <input
              type="number"
              required
              min="0"
              value={dials}
              onChange={e => setDials(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all mt-1 text-white"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">DMs Sent</label>
            <input
              type="number"
              required
              min="0"
              value={dms}
              onChange={e => setDms(Number(e.target.value))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all mt-1 text-white"
            />
          </div>
        </div>
        <div className="pt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors">
            {loading ? "Saving..." : "Save Activity"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
