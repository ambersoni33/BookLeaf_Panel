import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import authorsRouter from './routes/authors.js';
import ticketsRouter from './routes/tickets.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend integration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/tickets', ticketsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'BookLeaf Publishing Assessment Backend',
    timestamp: new Date().toISOString()
  });
});

// Root friendly greeting
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; padding: 40px; line-height: 1.6; max-width: 600px; margin: auto;">
      <h2 style="color: #047857;">🌿 BookLeaf Publishing Backend API is Running</h2>
      <p>Endpoints available:</p>
      <ul>
        <li><code>POST /api/auth/login</code> - Email based login (admin & authors)</li>
        <li><code>GET /api/auth/demo-users</code> - Quick switch author/admin list</li>
        <li><code>GET /api/authors</code> - Admin author list with sales & royalties</li>
        <li><code>GET /api/authors/:id</code> - Detailed author view & books</li>
        <li><code>GET /api/tickets</code> - Author/Admin tickets & chat history</li>
        <li><code>POST /api/tickets</code> - Create ticket</li>
        <li><code>POST /api/tickets/:id/messages</code> - Send ticket chat message</li>
      </ul>
    </div>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 BookLeaf Backend server listening on http://localhost:${PORT}`);
  console.log(`🔑 OpenAI Key: ${process.env.OPENAI_API_KEY ? 'Configured (' + process.env.OPENAI_API_KEY.substring(0, 10) + '...)' : 'MISSING'}`);
});
