require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const playersRoutes = require('./routes/players');
const matchesRoutes = require('./routes/matches');
const venuesRoutes = require('./routes/venues');
const aiRoutes = require('./routes/ai');
const usersRoutes = require('./routes/users');
const paymentsRoutes = require('./routes/payments');
const rankingsRoutes = require('./routes/rankings');
const friendsRoutes = require('./routes/friends');
const leaguesRoutes = require('./routes/leagues');
const ownersRoutes = require('./routes/owners');
const chatRoutes = require('./routes/chat');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/venues', venuesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/rankings', rankingsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/owners', ownersRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Fulvo API running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor Fulvo corriendo en http://localhost:${PORT}`);
});
