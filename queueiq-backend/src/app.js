const express = require('express');
const supabase = require('./config/supabase');
const authRoutes = require('./routes/auth.routes');
const orgsRoutes = require('./routes/orgs.routes');
const doctorsRoutes = require('./routes/doctors.routes');
const tokensRoutes = require('./routes/tokens.routes');

require('dotenv').config();
const app = express();

app.use(express.json()); 
app.use('/api/auth', authRoutes);
app.use('/api/organizations', orgsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/tokens', tokensRoutes);

app.get('/', (req, res) => {
  res.send('QueueIQ backend running');
});

app.get('/test-db', async (req, res) => {
  const { data, error } = await supabase.from('_test').select('*').limit(1);
  if (error && error.code !== 'PGRST205') {
    return res.status(500).json({ connected: false, error: error.message });
  }
  res.json({ connected: true, message: 'Supabase connected successfully' });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
