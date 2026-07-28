awk '
/const \[isCreatingSheet, setIsCreatingSheet\] = useState\(false\);/ {
  print $0
  print "  const [isAssigningTeam, setIsAssigningTeam] = useState(false);"
  print "  const [allUsers, setAllUsers] = useState<User[]>([]);"
  print "  const [sheetMembers, setSheetMembers] = useState<string[]>([]);"
  print "  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);"
  next
}
{ print }
' src/components/CRMLeadPipeline.tsx > tmp.tsx && mv tmp.tsx src/components/CRMLeadPipeline.tsx
