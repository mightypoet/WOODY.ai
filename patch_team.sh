awk '
/const \[newMember, setNewMember\]/ {
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
/const handleAddMember = async/,/};/ {
  if ($0 ~ /const handleAddMember = async/) {
    print "  const handleAddMember = async (e: React.FormEvent) => {"
    print "    e.preventDefault();"
    print "    if (!newMember.name || !newMember.email) return;"
    print ""
    print "    setIsSubmitting(true);"
    print "    try {"
    print "      await dbService.set(\"users\", newMember.email, {"
    print "        id: newMember.email,"
    print "        name: newMember.name,"
    print "        email: newMember.email,"
    print "        role: newMember.role,"
    print "        createdAt: new Date().toISOString()"
    print "      });"
    print ""
    print "      const res = await fetch(\"/api/send-email\", {"
    print "        method: \"POST\","
    print "        headers: { \"Content-Type\": \"application/json\" },"
    print "        body: JSON.stringify({"
    print "          to: newMember.email,"
    print "          subject: \"Welcome to the Team!\","
    print "          html: \"<p>Hi \" + newMember.name + \",</p><p>You have been added to the team as a \" + newMember.role.replace(\"__{{1}}\", \" \") + \". Welcome aboard!</p>\""
    print "        })"
    print "      });"
    print ""
    print "      if (!res.ok) {"
    print "        const errorData = await res.json().catch(() => ({}));"
    print "        throw new Error(errorData.error || \"Failed to send email notification\");"
    print "      }"
    print ""
    print "      setNewMember({ name: \"\", email: \"\", role: \"team_member\" });"
    print "      setIsModalOpen(false);"
    print "      showToast(\"Member added successfully!\");"
    print "    } catch (error: any) {"
    print "      console.error(error);"
    print "      showToast(error.message || \"Failed to add member\");"
    print "    } finally {"
    print "      setIsSubmitting(false);"
    print "    }"
    print "  };"
    skip = 1
  } else if ($0 ~ /};/) {
    if (skip) {
      skip = 0
    } else {
      print $0
    }
  } else if (!skip) {
    print $0
  }
  next
}
/<\/Modal>/ {
  if (found == 0) {
    print $0
    print "      {/* Toast Notification */}"
    print "      {toastMessage && ("
    print "        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 z-[9999] ${toastMessage.includes(\"Failed\") ? \"bg-red-900/90 border-red-800 text-white\" : \"bg-zinc-800 text-white border-zinc-700\"}`}>"
    print "          <div className={`w-2 h-2 rounded-full ${toastMessage.includes(\"Failed\") ? \"bg-red-400\" : \"bg-green-500\"}`}></div>"
    print "          {toastMessage}"
    print "        </div>"
    print "      )}"
    found = 1
    next
  }
}
{ print }
' src/components/TeamManagement.tsx > tmp.tsx && mv tmp.tsx src/components/TeamManagement.tsx
