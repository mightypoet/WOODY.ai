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
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #4F46E5;">Woody AI Notification</h2>
              <p>${message}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">This is an automated message from Woody AI.</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to send email:', errorData.error);
      }
    } catch (error) {
      console.error('Error calling send-email API:', error);
    }
  }
};
