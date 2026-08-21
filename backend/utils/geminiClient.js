// Wraps Google's Gemini API (Generative Language API) to turn a doctor's spoken
// dictation (audio) directly into a structured prescription object.
// Docs: https://ai.google.dev/gemini-api/docs/audio

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

const PROMPT = `You are a clinical transcription assistant helping a doctor at a medical camp.
Listen to the attached audio of a doctor dictating a prescription and extract the information
into structured data. Rules:
- "patientName": the patient's name if mentioned, otherwise an empty string.
- "medicines": an array of { "name": the medicine name (include form e.g. Tab/Syrup if said), "dosage": the dosage/frequency exactly as dictated }.
- "advice": any general advice/instructions mentioned (e.g. rest, follow-up), otherwise an empty string.
- "rawTranscript": a plain text transcript of exactly what was said.
Return only the structured data, do not add any information that was not said in the audio.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    patientName: { type: 'STRING' },
    medicines: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          dosage: { type: 'STRING' }
        },
        required: ['name', 'dosage']
      }
    },
    advice: { type: 'STRING' },
    rawTranscript: { type: 'STRING' }
  },
  required: ['medicines', 'rawTranscript']
};

/**
 * @param {Buffer} audioBuffer - raw audio bytes
 * @param {string} mimeType - e.g. 'audio/webm', 'audio/wav', 'audio/ogg'
 * @returns {Promise<{patientName:string, medicines:Array, advice:string, rawTranscript:string}>}
 */
async function transcribePrescriptionAudio(audioBuffer, mimeType) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          {
            inline_data: {
              mime_type: mimeType || 'audio/webm',
              data: audioBuffer.toString('base64')
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API request failed.';
    throw new Error(message);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini did not return a transcription. The audio may be empty or unclear.');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error('Could not parse the AI response. Please try recording again.');
  }

  return {
    patientName: parsed.patientName || '',
    medicines: Array.isArray(parsed.medicines) ? parsed.medicines : [],
    advice: parsed.advice || '',
    rawTranscript: parsed.rawTranscript || ''
  };
}

module.exports = { transcribePrescriptionAudio };
