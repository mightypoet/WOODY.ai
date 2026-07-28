awk '
/^  return \(/ {
  print "  const activeLeads = activeSheetId ? leads.filter(l => l.sheet_id === activeSheetId) : leads.filter(l => !l.sheet_id);"
  print $0
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
