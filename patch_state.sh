awk '
/const \[viewMode/ {
  print $0
  print "  const [sheets, setSheets] = useState<Sheet[]>([]);"
  print "  const [activeSheetId, setActiveSheetId] = useState<string | null>(null);"
  print "  const [isCreatingSheet, setIsCreatingSheet] = useState(false);"
  print "  const [newSheetName, setNewSheetName] = useState(\"\");"
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
