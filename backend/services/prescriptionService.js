const supabase = require('../config/supabase');

const { serializePrescription } = require('../utils/serializers');
const { transcribePrescriptionAudio } = require('../utils/geminiClient');

const createFromAudio = async ({ user, file }) => {
  if (!file) {
    const error = new Error('No audio file was received.');
    error.statusCode = 400;
    throw error;
  }

  if (!user.orgId) {
    const error = new Error('Only organization members can create prescriptions.');
    error.statusCode = 400;
    throw error;
  }

  let structured;

  try {
    structured = await transcribePrescriptionAudio(
      file.buffer,
      file.mimetype
    );
  } catch (err) {
    console.error('Gemini transcription error:', err.message);

    const error = new Error(
      err.message || 'AI transcription failed. Please try again.'
    );

    error.statusCode = 502;
    throw error;
  }

  const { data: saved, error } = await supabase
    .from('prescriptions')
    .insert({
      org_id: user.orgId,
      created_by: user.id,
      patient_name: structured.patientName,
      medicines: structured.medicines,
      advice: structured.advice,
      raw_transcript: structured.rawTranscript,
      audio_mime_type: file.mimetype
    })
    .select()
    .single();

  if (error) {
    const saveError = new Error(
      'Transcribed successfully but could not save the record.'
    );

    saveError.statusCode = 500;
    throw saveError;
  }

  return serializePrescription(saved);
};

const getPrescriptions = async ({ user }) => {
  if (!user.orgId) {
    return [];
  }

  const { data, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('org_id', user.orgId)
    .order('created_at', { ascending: false });

  if (error) {
    const fetchError = new Error('Could not fetch prescriptions.');
    fetchError.statusCode = 500;
    throw fetchError;
  }

  return data.map(serializePrescription);
};

module.exports = {
  createFromAudio,
  getPrescriptions
};