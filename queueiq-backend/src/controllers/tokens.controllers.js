const supabase = require('../config/supabase');
const {
  EXPRESS_MAX_PER_DAY,
  EMERGENCY_MAX_PER_DAY,
  countTokensToday,
  calculateQueuePosition,
  getTokenPrice,
} = require('../services/token.service');

async function bookToken(req, res) {
  const { user_id, organization_id, doctor_id, slot_time, token_type } = req.body;

  if (!user_id || !organization_id || !slot_time || !token_type) {
    return res.status(400).json({ error: 'user_id, organization_id, slot_time, and token_type are required' });
  }

  if (!['normal', 'express', 'emergency'].includes(token_type)) {
    return res.status(400).json({ error: 'token_type must be normal, express, or emergency' });
  }

  try {
    // Enforce daily limits
    if (token_type === 'express') {
      const count = await countTokensToday(organization_id, 'express');
      if (count >= EXPRESS_MAX_PER_DAY) {
        return res.status(409).json({ error: `Express token limit reached for today (${EXPRESS_MAX_PER_DAY} max)` });
      }
    }

    if (token_type === 'emergency') {
      const count = await countTokensToday(organization_id, 'emergency');
      if (count >= EMERGENCY_MAX_PER_DAY) {
        return res.status(409).json({ error: `Emergency slots full for today (${EMERGENCY_MAX_PER_DAY} max)` });
      }
    }

    // Create the appointment first
    const { data: appointment, error: apptError } = await supabase
      .from('appointments')
      .insert([{ user_id, organization_id, doctor_id, slot_time, status: 'booked' }])
      .select()
      .single();

    if (apptError) throw new Error(apptError.message);

    // Calculate price and queue position
    const price = await getTokenPrice(organization_id, token_type);
    const queuePosition = await calculateQueuePosition(organization_id, token_type);

    // Create the token
    const { data: token, error: tokenError } = await supabase
      .from('tokens')
      .insert([{
        appointment_id: appointment.id,
        token_type,
        price,
        queue_position: queuePosition,
      }])
      .select()
      .single();

    if (tokenError) throw new Error(tokenError.message);

    res.status(201).json({
      message: 'Token booked successfully',
      appointment,
      token,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { bookToken };