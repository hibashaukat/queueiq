const supabase = require('../config/supabase');

// Get all organizations — supports sorting by rating 
async function getOrganizations(req, res) {
  const { category, city, sort } = req.query;

  let query = supabase.from('organizations').select('*');

  if (category) query = query.eq('category', category);
  if (city) query = query.eq('city', city);

  // Default sort  highest rated first
  query = query.order('avg_rating', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ organizations: data });
}

// Get a single organization by ID
async function getOrganizationById(req, res) {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return res.status(404).json({ error: 'Organization not found' });
  }

  res.json({ organization: data });
}

module.exports = { getOrganizations, getOrganizationById };