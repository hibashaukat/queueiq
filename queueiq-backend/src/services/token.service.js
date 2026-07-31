const supabase = require('../config/supabase');

const EXPRESS_MAX_PER_DAY = 10;
const EMERGENCY_MAX_PER_DAY = 3;

// Count how many tokens of a type already exist today for this org
async function countTokensToday(organizationId, tokenType) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('tokens')
    .select('id, appointments!inner(organization_id)')
    .eq('token_type', tokenType)
    .eq('appointments.organization_id', organizationId)
    .gte('created_at', startOfDay.toISOString());

  if (error) throw new Error(error.message);
  return data.length;
}

// Calculate queue position
async function calculateQueuePosition(organizationId, tokenType) {
  const { data: existingTokens, error } = await supabase
    .from('tokens')
    .select('id, token_type, queue_position, appointments!inner(organization_id, status)')
    .eq('appointments.organization_id', organizationId)
    .eq('appointments.status', 'booked')
    .order('queue_position', { ascending: true });

  if (error) throw new Error(error.message);

  const currentQueueLength = existingTokens.length;

  if (tokenType === 'emergency') {
    // Emergency goes before everything, position 0, others shift conceptually
    return 0;
  }

  if (tokenType === 'express') {
    const normalCount = existingTokens.filter(t => t.token_type === 'normal').length;
    const expressSlot = Math.floor(normalCount / 3) + 1;
    return Math.min(expressSlot, currentQueueLength + 1);
  }

  // Normal, goes to the back of the queue
  return currentQueueLength + 1;
}

// Get org's token price for a given type
async function getTokenPrice(organizationId, tokenType) {
  const { data: org, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .single();

  if (error) throw new Error('Organization not found');

  // For MVP, assume a base price field exists, or default
  // pull actual normal_price from organizations table once added
  const basePrice = 800; 

  if (tokenType === 'express') return basePrice * 2;
  return basePrice; 
}

module.exports = {
  EXPRESS_MAX_PER_DAY,
  EMERGENCY_MAX_PER_DAY,
  countTokensToday,
  calculateQueuePosition,
  getTokenPrice,
};