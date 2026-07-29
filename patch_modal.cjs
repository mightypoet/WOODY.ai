const fs = require('fs');
const content = fs.readFileSync('src/components/CRMLeadPipeline.tsx', 'utf8');

const modalHTML = `
      <Modal isOpen={isSchedulingCall} onClose={() => setIsSchedulingCall(false)} title="Schedule Meeting">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Date</label>
            <input 
              type="date" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-700 transition-all text-white"
              value={scheduleForm.date}
              onChange={e => setScheduleForm(prev => ({...prev, date: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Time</label>
            <input 
              type="time" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-700 transition-all text-white"
              value={scheduleForm.time}
              onChange={e => setScheduleForm(prev => ({...prev, time: e.target.value}))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Duration (minutes)</label>
            <input 
              type="number" 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-700 transition-all text-white"
              value={scheduleForm.duration}
              onChange={e => setScheduleForm(prev => ({...prev, duration: parseInt(e.target.value)}))}
              min="15"
              step="15"
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <input 
              type="checkbox" 
              id="googleMeetToggle"
              checked={scheduleForm.addGoogleMeetLink}
              onChange={e => setScheduleForm(prev => ({...prev, addGoogleMeetLink: e.target.checked}))}
              className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-white focus:ring-0 focus:ring-offset-0"
            />
            <label htmlFor="googleMeetToggle" className="text-sm font-medium text-white">Add Google Meet Link</label>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button 
              onClick={() => setIsSchedulingCall(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={submitScheduleCall}
              className="bg-white text-black px-6 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-200 transition-colors"
            >
              Schedule
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

export default CRMLeadPipeline;
`;

const newContent = content.replace(/    <\/div>\n  \);\n\}\n*$/m, modalHTML);
fs.writeFileSync('src/components/CRMLeadPipeline.tsx', newContent);
