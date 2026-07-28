awk '
/const fetchSheets = async/ {
  print "  const fetchSheets = async () => {"
  print "    try {"
  print "      let data = await dbService.list(\"sheets\");"
  print "      if (user.role !== \"admin\") {"
  print "        const members = await dbService.list(\"sheet_members\");"
  print "        const allowedSheetIds = members.filter((m: any) => m.user_id === user.id).map((m: any) => m.sheet_id);"
  print "        data = data.filter((s: any) => allowedSheetIds.includes(s.id));"
  print "      }"
  print "      setSheets(data as Sheet[]);"
  print "      if (data.length > 0 && !activeSheetId) {"
  print "        setActiveSheetId(data[0].id);"
  print "      }"
  print "    } catch (e) {"
  print "      console.error(\"Sheets fetch error\", e);"
  print "    }"
  print "  };"
  skip = 1
  next
}
skip == 1 && /};/ {
  skip = 0
  next
}
skip == 1 { next }
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
