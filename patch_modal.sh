awk '
/<\/Modal>/ {
  if (found == 0) {
    found = 1
  }
}
/      <\/Modal>/ {
  if (found2 == 0) {
    print $0
    print ""
    print "      <Modal isOpen={isCreatingSheet} onClose={() => setIsCreatingSheet(false)} title=\"Create New Sheet\">"
    print "        <form onSubmit={handleCreateSheet} className=\"space-y-4\">"
    print "          <div>"
    print "            <label className=\"text-xs text-zinc-500 uppercase font-mono tracking-widest\">Sheet Name</label>"
    print "            <input"
    print "              required"
    print "              autoFocus"
    print "              type=\"text\""
    print "              value={newSheetName}"
    print "              onChange={e => setNewSheetName(e.target.value)}"
    print "              placeholder=\"e.g., Q3 Marketing Leads\""
    print "              className=\"w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all mt-1 text-white\""
    print "            />"
    print "          </div>"
    print "          <div className=\"flex justify-end gap-3 mt-6\">"
    print "            <button type=\"button\" onClick={() => setIsCreatingSheet(false)} className=\"px-4 py-2 text-sm text-zinc-400 hover:text-white\">Cancel</button>"
    print "            <button type=\"submit\" className=\"px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md\">"
    print "              Create Sheet"
    print "            </button>"
    print "          </div>"
    print "        </form>"
    print "      </Modal>"
    found2 = 1
    next
  }
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
