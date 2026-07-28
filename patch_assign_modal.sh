awk '
/<\/Modal>/ {
  if (found == 0) {
    found = 1
  } else if (found == 1) {
    print $0
    print ""
    print "      <Modal isOpen={isAssigningTeam} onClose={() => setIsAssigningTeam(false)} title=\"Assign Team to Sheet\">"
    print "        <div className=\"space-y-4\">"
    print "          <p className=\"text-sm text-zinc-400\">Select the users who should have access to this sheet.</p>"
    print "          <div className=\"max-h-[300px] overflow-y-auto space-y-2 custom-scrollbar\">"
    print "            {allUsers.length === 0 ? ("
    print "              <div className=\"text-sm text-zinc-500 py-4 text-center\">No users found.</div>"
    print "            ) : ("
    print "              allUsers.map(u => ("
    print "                <label key={u.id} className=\"flex items-center gap-3 p-3 rounded-xl border border-zinc-800 hover:bg-zinc-800/50 cursor-pointer transition-colors\">"
    print "                  <input"
    print "                    type=\"checkbox\""
    print "                    checked={sheetMembers.includes(u.id)}"
    print "                    onChange={(e) => {"
    print "                      if (e.target.checked) {"
    print "                        setSheetMembers([...sheetMembers, u.id]);"
    print "                      } else {"
    print "                        setSheetMembers(sheetMembers.filter(id => id !== u.id));"
    print "                      }"
    print "                    }}"
    print "                    className=\"w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-indigo-500 focus:ring-indigo-500/20\""
    print "                  />"
    print "                  <div>"
    print "                    <div className=\"text-sm font-medium text-white\">{u.name}</div>"
    print "                    <div className=\"text-xs text-zinc-500\">{u.email} &bull; {u.role}</div>"
    print "                  </div>"
    print "                </label>"
    print "              ))"
    print "            )}"
    print "          </div>"
    print "          <div className=\"flex justify-end gap-3 mt-6\">"
    print "            <button type=\"button\" onClick={() => setIsAssigningTeam(false)} className=\"px-4 py-2 text-sm text-zinc-400 hover:text-white\">Cancel</button>"
    print "            <button"
    print "              onClick={handleSaveMembers}"
    print "              disabled={isUpdatingMembers}"
    print "              className=\"px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-md disabled:opacity-50\""
    print "            >"
    print "              {isUpdatingMembers ? \"Saving...\" : \"Save Team\"}"
    print "            </button>"
    print "          </div>"
    print "        </div>"
    print "      </Modal>"
    found = 2
    next
  }
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
