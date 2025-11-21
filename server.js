require('dotenv').config();
const http = require('http');
const express = require('express');
const { setupAuth, pca, SCOPES } = require('./auth');
const { emailListener, NOTIFICATION_TRACKER, GraphAuthProvider } = require('./subscriptions');
const { getEmailHandler } = require('./emailRetrieval');
const { classifyEmailHandler } = require('./classifier');
const { Client } = require('@microsoft/microsoft-graph-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup auth (session + routes)
setupAuth(app);
app.use(express.json());

// Webhook
app.post('/listen', emailListener);

// SSE
app.get('/events', (req, res) => {
  if (!req.session.account) return res.status(401).end();

  const userId = req.session.account.homeAccountId;
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();

  const sendPending = () => {
    const pending = NOTIFICATION_TRACKER.get(userId) || [];
    pending.forEach(n => res.write(`data: ${JSON.stringify(n)}\n\n`));
    NOTIFICATION_TRACKER.set(userId, []);
  };
  sendPending();

  const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
  req.on('close', () => {
    clearInterval(keepAlive);
    res.end();
  });
});

// Home
app.get('/', (req, res) => {
  if (!req.session.account) {
    return res.send(`
      <h2>Microsoft Graph + Real-Time Email Alerts</h2>
      <a href="/auth-request">Login with Microsoft</a>
    `);
  }

  const user = req.session.account;
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Email Alerts</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 2rem; background: #f4f4f4; }
          a { color: #1a0dab; text-decoration: none; }
          .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff;
                   padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.3);
                   z-index: 1000; max-width: 300px; animation: fadein 0.5s; }
          @keyframes fadein { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        </style>
      </head>
      <body>
        <h2>Hello, ${user.username}!</h2>
        <p>
          <a href="/profile">Profile</a> |
          <a href="/emails">Emails</a> |
          <a href="/logout">Logout</a>
        </p>
        <p><strong>New emails will appear as toasts below!</strong></p>

        <script>
          if (!!window.EventSource) {
            const es = new EventSource('/events');
            es.onmessage = e => {
              const data = JSON.parse(e.data);
              const toast = document.createElement('div');
              toast.className = 'toast';
              toast.innerHTML = '<strong>New Email:</strong> ' + data.subject;
              document.body.appendChild(toast);
              setTimeout(() => toast.remove(), 6000);
            };
          }
        </script>
      </body>
    </html>
  `);
});

// Profile
app.get('/profile', async (req, res) => {
  if (!req.session.account) return res.redirect('/');
  try {
    const authProvider = new GraphAuthProvider(pca, req.session.account, SCOPES);
    const graphClient = Client.initWithMiddleware({ authProvider });
    const profile = await graphClient.api('/me').get();
    res.send(`<pre>${JSON.stringify(profile, null, 2)}</pre><br><a href="/">Back</a>`);
  } catch (error) {
    res.status(500).send('Error: ' + JSON.stringify(error));
  }
});

// Emails
app.get('/emails', async (req, res) => {
  if (!req.session.account) return res.redirect('/');

  try {
    const authProvider = new GraphAuthProvider(pca, req.session.account, SCOPES);
    const graphClient = Client.initWithMiddleware({ authProvider });

    const messages = await graphClient
      .api('/me/mailFolders/inbox/messages/')
      .select('subject,body')
      .header('Prefer', 'outlook.body-content-type=text')
      .orderby('receivedDateTime desc')
      .get();

    const escapeHtml = (text) => String(text || '').replace(/[&<>"']/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    const list = messages.value.map(msg => `
      <div style="margin-bottom:1.5rem; padding:1rem; border:1px solid #eee; background:#f9f9f9;">
        <strong>${escapeHtml(msg.subject || '(no subject)')}</strong>
        <pre style="margin:0.5rem 0 0; white-space:pre-wrap; font-family:inherit; max-height:300px; overflow:auto;">
${escapeHtml(msg.body?.content || '(no body)')}
        </pre>
      </div>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Emails</title></head>
        <body style="font-family:system-ui,sans-serif;padding:2rem;background:#f4f4f4;">
          <h2>Your Emails</h2>
          ${list || '<p>No emails.</p>'}
          <p><a href="/">Back</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + JSON.stringify(error, null, 2));
  }
});

// Start Server
http.createServer(app).listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Login: http://localhost:${PORT}`);
  if (process.env.APP_URL) {
    console.log(`Webhook URL: ${process.env.NOTIFICATION_URL}`);
  }
});


// REAL ENDPOINT: /getEmail
app.post('/getEmail', async (req, res) => {
  const { userId, messageId } = req.body;

  if (!userId || !messageId) {
    return res.status(400).json({ error: 'Missing userId or messageId' });
  }

  // Fire-and-forget the actual work
  void getEmailHandler(userId, messageId);

  // Respond immediately
  res.json({ status: 'queued' });
});

app.post('/classifier', classifyEmailHandler);

