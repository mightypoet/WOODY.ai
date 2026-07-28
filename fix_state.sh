awk '
/const \[newMember, setNewMember\]/ {
  print $0
  next
}
/const \[toastMessage, setToastMessage\]/ {
  next
}
/const \[isSubmitting, setIsSubmitting\]/ {
  next
}
/const showToast = / {
  skip_toast = 1
  next
}
skip_toast == 1 && /};/ {
  skip_toast = 0
  next
}
skip_toast == 1 { next }
/role: \x27team_member\x27 as UserRole/ {
  print $0
  next
}
/  }\);/ {
  print $0
  print "  const [toastMessage, setToastMessage] = useState<string | null>(null);"
  print "  const [isSubmitting, setIsSubmitting] = useState(false);"
  print ""
  print "  const showToast = (msg: string) => {"
  print "    setToastMessage(msg);"
  print "    setTimeout(() => setToastMessage(null), 3000);"
  print "  };"
  next
}
{ print }
' src/components/TeamManagement.tsx > tmp.tsx && mv tmp.tsx src/components/TeamManagement.tsx
