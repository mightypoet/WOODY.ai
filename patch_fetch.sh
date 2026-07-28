awk '
/const fetchLeads/ {
  print "  const fetchSheets = async () => {"
  print "    try {"
  print "      const data = await dbService.list(\"sheets\");"
  print "      setSheets(data as Sheet[]);"
  print "      if (data.length > 0 && !activeSheetId) {"
  print "        setActiveSheetId(data[0].id);"
  print "      }"
  print "    } catch (e) {"
  print "      console.error(\"Sheets fetch error\", e);"
  print "    }"
  print "  };"
  print ""
  print $0
  next
}
/fetchLeads\(\);/ {
  print "    fetchSheets();"
  print $0
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
