awk '
/<div>/ {
  in_div = 1
  buffer = $0 "\n"
  next
}
in_div == 1 {
  buffer = buffer $0 "\n"
  if ($0 ~ /<label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Status<\/label>/) {
    print "              <div>"
    print "                <label className=\"text-xs text-zinc-500 uppercase font-mono tracking-widest\">Sheet</label>"
    print "                <select"
    print "                  value={editForm.sheet_id || \"\"}"
    print "                  onChange={e => setEditForm({ ...editForm, sheet_id: e.target.value || null })}"
    print "                  className=\"w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all mt-1 text-white\""
    print "                >"
    print "                  <option value=\"\">Main Board (No Sheet)</option>"
    print "                  {sheets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}"
    print "                </select>"
    print "              </div>"
    printf "%s", buffer
    in_div = 0
    next
  }
  if ($0 ~ /<\/div>/) {
    printf "%s", buffer
    in_div = 0
    next
  }
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
