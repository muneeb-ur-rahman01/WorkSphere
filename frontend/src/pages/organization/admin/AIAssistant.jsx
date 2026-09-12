import React, { useContext, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContext';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { SUBSCRIPTION_PLANS } from '../../../Config/constant';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2, Sparkles, User } from 'lucide-react';

// AI Module — moved here from the Staff/Intern portal (see
// backend/routes/prescriptionRoutes.js, now OrgAdmin-only, and
// frontend/src/pages/organization/staff/StaffDashboard.jsx where this UI
// used to live). Functionality is unchanged: record a doctor's dictation,
// Gemini transcribes + structures it into a prescription record.
const AIAssistant = () => {
  const { currentUser, transcribePrescription, organizations, prescriptions } = useContext(AppContext);

  if (currentUser.role !== 'OrgAdmin') {
    return <Navigate to="/staff/dashboard" replace />;
  }

  const myOrg = organizations.find((o) => o.id === currentUser.orgId);
  const subscription = myOrg?.subscription || null;
  const planKey = myOrg?.subPlan && SUBSCRIPTION_PLANS[myOrg.subPlan] ? myOrg.subPlan : 'Basic';
  const aiFeatureAvailable = subscription?.subscriptionStatus === 'Active' && SUBSCRIPTION_PLANS[planKey]?.aiFeatures;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingError, setRecordingError] = useState('');
  const [structuredPrescription, setStructuredPrescription] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleStartVoiceRecording = async () => {
    setRecordingError('');
    setStructuredPrescription(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const preferredMimeType = ['audio/webm', 'audio/ogg', 'audio/mp4'].find(
        (type) => window.MediaRecorder && MediaRecorder.isTypeSupported(type)
      );

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        clearInterval(timerRef.current);
        setElapsedSeconds(0);

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType });

        if (audioBlob.size < 500) {
          setRecordingError('Recording was too short. Please try again.');
          return;
        }

        setIsProcessing(true);
        const res = await transcribePrescription(audioBlob);
        setIsProcessing(false);

        if (res.success) {
          setStructuredPrescription(res.prescription);
        } else {
          setRecordingError(res.error || 'AI transcription failed. Please try again.');
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      setRecordingError('Microphone access was denied or is unavailable. Please allow mic permissions and try again.');
    }
  };

  const handleStopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <DashboardLayout>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black flex items-center gap-2">
          <Sparkles size={26} className="text-indigo-600" /> AI Module
        </h1>
        <p className="text-gray-600 mt-2">
          Dictate a prescription and let AI transcribe and structure it automatically.
        </p>
      </div>

      {/* Voice Card */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-lg shadow-indigo-100/40 p-6 max-w-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg p-1.5">
            <Mic size={16} />
          </div>
          <h2 className="text-lg font-semibold">AI Clinical Voice Assistant</h2>
        </div>

        {!aiFeatureAvailable ? (
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700">
            AI voice dictation is a <strong>Premium plan</strong> feature. Upgrade your organization's
            subscription from the Billing section to unlock it.
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? handleStopVoiceRecording : handleStartVoiceRecording}
              disabled={isProcessing}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition disabled:opacity-60 disabled:cursor-not-allowed shadow-lg ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-gradient-to-br from-indigo-600 to-purple-600 hover:scale-105'
              }`}
            >
              {isProcessing ? (
                <Loader2 size={22} className="animate-spin" />
              ) : isRecording ? (
                <Square size={20} />
              ) : (
                <Mic size={22} />
              )}
            </button>

            <div>
              <p className="font-medium">
                {isProcessing
                  ? 'Transcribing with AI...'
                  : isRecording
                    ? `Listening... ${formatElapsed(elapsedSeconds)} (tap to stop)`
                    : 'Tap to start recording'}
              </p>
              <p className="text-xs text-gray-500">Dictate a prescription and let AI structure it automatically</p>
            </div>
          </div>
        )}

        {recordingError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {recordingError}
          </div>
        )}
      </div>

      {/* Latest AI output */}
      {structuredPrescription && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-5 max-w-xl">
          <h2 className="text-green-700 font-semibold mb-3 flex items-center gap-2">
            <CheckCircle2 size={18} /> AI Generated Prescription
          </h2>
          <div className="text-sm space-y-2 text-gray-700">
            <p>Patient: <span className="font-medium">{structuredPrescription.patientName || 'Not mentioned'}</span></p>
            <div>
              <p className="font-medium mt-2">Medicines:</p>
              {structuredPrescription.medicines.length > 0 ? (
                <ul className="list-disc ml-5 text-gray-600">
                  {structuredPrescription.medicines.map((m, i) => (
                    <li key={i}>{m.name} — {m.dosage}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-xs mt-1">No medicines detected.</p>
              )}
            </div>
            {structuredPrescription.advice && (
              <p className="mt-2">Advice: <span className="text-gray-600">{structuredPrescription.advice}</span></p>
            )}
            {structuredPrescription.rawTranscript && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="font-medium text-xs text-gray-500 mb-1">Full Transcript</p>
                <p className="text-xs text-gray-500 italic">"{structuredPrescription.rawTranscript}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full org history */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-black mb-4">Prescription History</h2>
        {prescriptions.length === 0 ? (
          <p className="text-gray-400 text-sm">No AI-generated prescriptions recorded yet.</p>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {prescriptions.map((p) => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="font-semibold text-black flex items-center gap-1.5">
                  <User size={14} /> {p.patientName || 'Unnamed patient'}
                </p>
                {p.medicines?.length > 0 && (
                  <ul className="list-disc ml-5 text-sm text-gray-600 mt-1">
                    {p.medicines.map((m, i) => <li key={i}>{m.name} — {m.dosage}</li>)}
                  </ul>
                )}
                <p className="text-[11px] text-gray-400 mt-2">{new Date(p.createdAt).toLocaleString('en-GB')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default AIAssistant;
