awk '
/<\/header>/ {
  print $0
  print "      {/* Sheets Tabs */}"
  print "      <div className=\"flex items-center gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar\">"
  print "        <button"
  print "          onClick={() => setActiveSheetId(null)}"
  print "          className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${!activeSheetId ? \"bg-indigo-600 text-white\" : \"bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800\"}`}"
  print "        >"
  print "          Main Board"
  print "        </button>"
  print "        {sheets.map(sheet => ("
  print "          <button"
  print "            key={sheet.id}"
  print "            onClick={() => setActiveSheetId(sheet.id)}"
  print "            className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors ${activeSheetId === sheet.id ? \"bg-indigo-600 text-white\" : \"bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800\"}`}"
  print "          >"
  print "            {sheet.name}"
  print "          </button>"
  print "        ))}"
  print "        <button"
  print "          onClick={() => setIsCreatingSheet(true)}"
  print "          className=\"px-3 py-2 flex items-center gap-2 text-sm font-medium rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-dashed border-zinc-700 whitespace-nowrap transition-colors\""
  print "        >"
  print "          <Plus size={16} /> Add Sheet"
  print "        </button>"
  print "      </div>"
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
