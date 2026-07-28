awk '
/const fetchLeads/ {
  print "  const handleCreateSheet = async (e: React.FormEvent) => {"
  print "    e.preventDefault();"
  print "    if (!newSheetName.trim()) return;"
  print "    try {"
  print "      const newId = await dbService.create(\"sheets\", { name: newSheetName });"
  print "      setIsCreatingSheet(false);"
  print "      setNewSheetName(\"\");"
  print "      await fetchSheets();"
  print "      setActiveSheetId(newId);"
  print "      showToast(\"Sheet created successfully!\");"
  print "    } catch (e: any) {"
  print "      console.error(e);"
  print "      showToast(e.message || \"Failed to create sheet\");"
  print "    }"
  print "  };"
  print ""
  print $0
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
