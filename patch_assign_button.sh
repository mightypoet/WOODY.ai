awk '
/<Plus size={16} \/> Add Sheet/ {
  print $0
  print "        </button>"
  print "        {activeSheetId && user.role === \"admin\" && ("
  print "          <button"
  print "            onClick={() => handleOpenAssignModal()}"
  print "            className=\"px-3 py-2 flex items-center gap-2 text-sm font-medium rounded-xl bg-zinc-800 text-indigo-400 hover:text-white hover:bg-indigo-600 border border-zinc-700 whitespace-nowrap transition-colors ml-auto\""
  print "          >"
  print "            <UserPlus size={16} /> Assign Team"
  print "          </button>"
  print "        )}"
  skip = 1
  next
}
skip == 1 && /<\/button>/ {
  skip = 0
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
