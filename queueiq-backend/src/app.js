const express = require('express');
const supabase = require('./config/supabase');
const authRoutes = require('./routes/auth.routes');

require('dotenv').config();

const app = express();

// needed to parse JSON request bodies 
app.use(express.json()); 
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('QueueIQ backend running');
});

// Route to test Supabase connection via browser/Postman
app.get('/test-db', async (req, res) => {
  const { data, error } = await supabase.from('_test').select('*').limit(1);

  if (error && error.code !== 'PGRST205') {
    return res.status(500).json({ connected: false, error: error.message });
  }

  res.json({ connected: true, message: 'Supabase connected successfully' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

(async () => {
  const { error } = await supabase.from('_test').select('*').limit(1);
  if (error && error.code !== 'PGRST205') {
    console.error('Supabase connection failed:', error.message);
  } else {
    console.log('Supabase connected successfully');
  }
})();
