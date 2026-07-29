import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Loader2, Info } from 'lucide-react';
import { supabase } from '../utils/supabase';

const STAGES = [
  "New",
  "Contacted",
  "Meeting Scheduled",
  "Offer Made",
  "Won",
  "Lost"
];

export default function SettingsView() {
  const [activeStage, setActiveStage] = useState(STAGES[0]);
  const [templates, setTemplates] = useState<Record<string, { subject: string, body: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('email_templates').select('*');
      if (error) {
        console.error("Error fetching templates:", error);
        return;
      }
      const mapped: Record<string, { subject: string, body: string }> = {};
      data?.forEach(t => {
        mapped[t.stage] = { subject: t.subject, body: t.body };
      });
      setTemplates(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (val: string) => {
    setTemplates(prev => ({
      ...prev,
      [activeStage]: {
        ...prev[activeStage],
        subject: val
      }
    }));
  };

  const handleBodyChange = (val: string) => {
    setTemplates(prev => ({
      ...prev,
      [activeStage]: {
        ...prev[activeStage],
        body: val
      }
    }));
  };

  const saveTemplate = async () => {
    const currentTemplate = templates[activeStage];
    if (!currentTemplate) return;
    
    try {
      setSaving(true);
      setSaveMessage(null);
      const { error } = await supabase
        .from('email_templates')
        .upsert({
          stage: activeStage,
          subject: currentTemplate.subject,
          body: currentTemplate.body
        }, { onConflict: 'stage' });
        
      if (error) throw error;
      
      setSaveMessage("Template saved successfully.");
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving template:", error);
      setSaveMessage(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const currentSubject = templates[activeStage]?.subject || '';
  const currentBody = templates[activeStage]?.body || '';

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-zinc-400 text-sm mt-1">Manage global configuration and automation templates.</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden flex flex-col md:flex-row">
          <div className="w-full md:w-64 border-r border-white/5 bg-zinc-900/30 p-4">
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-4">Pipeline Stages</h3>
            <div className="space-y-1">
              {STAGES.map(stage => (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeStage === stage 
                    ? 'bg-white/10 text-white shadow-inner border border-white/5' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                  }`}
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{activeStage} Email Template</h3>
              <button 
                onClick={saveTemplate}
                disabled={loading || saving}
                className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Template
              </button>
            </div>
            
            {saveMessage && (
              <div className={`p-3 rounded-lg text-sm border ${saveMessage.includes('Error') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {saveMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Subject Line</label>
                <input
                  type="text"
                  value={currentSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  placeholder={`Subject for ${activeStage} leads...`}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-500 uppercase font-mono tracking-widest mb-2">Email Body (HTML supported)</label>
                <textarea
                  value={currentBody}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  placeholder={`Write the email template for ${activeStage} leads...`}
                  rows={8}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-500 transition-all text-white placeholder-zinc-600 font-mono resize-none"
                />
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
              <Info className="text-blue-400 shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-blue-200">
                <p className="font-semibold text-blue-300 mb-1">Available Variables</p>
                <p className="text-blue-200/80 mb-2">You can use these variables in both the subject and body. They will be replaced with real data when sending.</p>
                <ul className="list-disc pl-4 space-y-1 font-mono text-xs">
                  <li>{`{{lead_name}}`} - The lead's full name</li>
                  <li>{`{{company}}`} - The lead's company name</li>
                  <li>{`{{sender_name}}`} - Your name (or the assigned account executive)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
