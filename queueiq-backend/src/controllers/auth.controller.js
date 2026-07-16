const supabase = require('../config/supabase');

// Signup
async function register(req, res) {
  const { email, password, full_name, phone } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // Also create a row in your own `users` table with extra profile info
  const { error: profileError } = await supabase
    .from('users')
    .insert([{ full_name, phone, preferred_language: 'en' }]);

  if (profileError) {
    return res.status(400).json({ error: profileError.message });
  }

  res.status(201).json({ message: 'User registered successfully', user: data.user });
}

// Login
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: error.message });
  }

  res.json({
    message: 'Login successful',
    access_token: data.session.access_token,
    user: data.user,
  });
}

module.exports = { register, login };