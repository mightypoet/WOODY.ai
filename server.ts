import express from "express";
import path from "path";
import { Resend } from 'resend';

const app = express();
const PORT = 3000;

// Initialize Resend lazily
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "WOODY API is running",
    emailServiceConfigured: !!process.env.RESEND_API_KEY 
  });
});

app.post("/api/send-email", async (req, res) => {
  const { to, subject, html } = req.body;
  
  const resendClient = getResend();
  if (!resendClient) {
    return res.status(500).json({ error: "Email service not configured (RESEND_API_KEY missing)" });
  }

  try {
    const data = await resendClient.emails.send({
      from: 'Woody AI <onboarding@resend.dev>', // Standard Resend domain for testing
      to,
      subject,
      html,
    });
    
    if (data.error) {
      console.error("Resend API Error:", data.error);
      return res.status(400).json({ error: data.error.message });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production (Vercel), static files are handled by vercel.json rewrites
    // But we still serve them here as a fallback for other environments like Cloud Run
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen if NOT on Vercel (Vercel handles listening)
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
