cat << 'INNER' > src/components/TeamManagement.tsx
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { notificationService } from '../services/notificationService';
import { Users, Plus, Mail, Shield, Trash2, Loader2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Modal from './Modal';

export default function TeamManagement({ user }: { user: User }) {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: 'team_member' as UserRole
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const unsub = dbService.subscribe('users', (data) => {
      setMembers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMember.name || !newMember.email) return;

    setIsSubmitting(true);
    try {
      await dbService.set("users", newMember.email, {
        id: newMember.email,
        name: newMember.name,
        email: newMember.email,
        role: newMember.role,
        createdAt: new Date().toISOString()
      });

      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: newMember.email,
          subject: "Welcome to the Team!",
          html: "<p>Hi " + newMember.name + ",</p><p>You have been added to the team as a " + newMember.role.replace('_', ' ') + ". Welcome aboard!</p>"
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send email notification");
      }

      setNewMember({ name: "", email: "", role: "team_member" });
      setIsModalOpen(false);
      showToast("Member added successfully!");
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Failed to add member");
    } finally {
      setIsSubmitting(false);
    }
  };

INNER
awk 'NR > 74' src/components/TeamManagement.tsx.bak >> src/components/TeamManagement.tsx || true
