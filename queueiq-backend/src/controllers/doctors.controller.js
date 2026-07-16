const supabase = require('../config/supabase');

// Get all doctors for a specific organization
async function getDoctorsByOrg(req, res) {
  const { orgId } = req.params;

  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_available', true);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json({ doctors: data });
}

module.exports = { getDoctorsByOrg };