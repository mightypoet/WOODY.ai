import { dbService } from './dbService';
import { User } from '../types';

export const notificationService = {
  async sendNotification(userId: string, message: string, type: string = 'info') {
    try {
      // 1. Create Firestore notification
      await dbService.create('notifications', {
        userId,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString()
      });

      // 2. Fetch user email to send email notification
      const user = await dbService.get('users', userId) as unknown as User | null;
      if (user && user.email) {
        await this.sendEmail(user.email, `New Notification: ${type}`, message);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  },

  async sendEmail(to: string, subject: string, message: string) {
    try {
      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: import.meta.env.VITE_EMAILJS_SERVICE_ID,
          template_id: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
          user_id: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
          template_params: {
            to_email: to,
            subject: subject,
            message: message,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to send email:", errorText);
      }
    } catch (error) {
      console.error("Error sending email via EmailJS:", error);
    }
  }
};
