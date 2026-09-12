const supabase = require('../config/supabase');
const { serializePrescription } = require('../utils/serializers');
const { transcribePrescriptionAudio } = require('../utils/geminiClient');

// POST /api/prescriptions  (multipart/form-data, field name: "audio")
// Organization Admin records a doctor's dictation (AI Module — see
// prescriptionRoutes.js); Gemini transcribes + structures it, then we save
// the record.
const createFromAudio = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No audio file was received.' });
  }
  if (!req.user.orgId) {
    return res.status(400).json({ success: false, error: 'Only organization members can create prescriptions.' });
  }

  let structured;
  try {
    structured = await transcribePrescriptionAudio(req.file.buffer, req.file.mimetype);
  } catch (err) {
    console.error('Gemini transcription error:', err.message);
    return res.status(502).json({
      success: false,
      error: err.message || 'AI transcription failed. Please try again.'
    });
  }

  const { data: saved, error } = await supabase
    .from('prescriptions')
    .insert({
      org_id: req.user.orgId,
      created_by: req.user.id,
      patient_name: structured.patientName,
      medicines: structured.medicines,
      advice: structured.advice,
      raw_transcript: structured.rawTranscript,
      audio_mime_type: req.file.mimetype
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ success: false, error: 'Transcribed successfully but could not save the record.' });
  }

  return res.json({ success: true, prescription: serializePrescription(saved) });
};

// GET /api/prescriptions (OrgAdmin only — see prescriptionRoutes.js)
// Every prescription logged in the organization.
const getPrescriptions = async (req, res) => {
  if (!req.user.orgId) {
    return res.json({ success: true, prescriptions: [] });
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('org_id', req.user.orgId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ success: false, error: 'Could not fetch prescriptions.' });
  return res.json({ success: true, prescriptions: data.map(serializePrescription) });
};

module.exports = { createFromAudio, getPrescriptions };
