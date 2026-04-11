/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Mic, 
  CheckCircle2, 
  Check,
  Play, 
  Square, 
  ChevronRight, 
  HelpCircle, 
  Video, 
  Info,
  AlertCircle,
  ArrowRight,
  Clock,
  User as UserIcon,
  Briefcase,
  ChevronUp,
  ChevronDown,
  X,
  MicOff,
  VideoOff,
  RotateCcw,
  Loader2,
  Monitor,
  LogOut,
  LogIn
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  setDoc, 
  getDoc, 
  serverTimestamp,
  addDoc,
  collection,
  handleFirestoreError,
  OperationType
} from './firebase';
import { doc } from 'firebase/firestore';
import type { User } from './firebase';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) {
          displayMessage = `Firebase Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
        }
      } catch (e) {
        displayMessage = this.state.error?.message || displayMessage;
      }

      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Application Error</h1>
          <p className="text-zinc-600 mb-8 max-w-md mx-auto">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Types & Constants ---
type Step = 'OVERVIEW' | 'SETUP' | 'INTRO' | 'INTERVIEW' | 'DONE';

const JOB_DETAILS = {
  company: "TechCorp Inc.",
  title: "Senior Product Designer",
  location: "Austin, Texas",
  experience: "6-8 years",
  deadline: "March 24, 2026 • 11:00 AM PST"
};

const QUESTIONS = [
  { 
    id: 1, 
    text: "자기소개를 부탁드립니다.", 
    video: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 60 
  },
  { 
    id: 2, 
    text: "본인의 가장 큰 강점은 무엇인가요?", 
    video: "https://www.w3schools.com/html/movie.mp4",
    duration: 90
  },
];

// --- Components ---

const Header = ({ currentStep, user, onLogin, onLogout }: { currentStep: Step, user: User | null, onLogin: () => void, onLogout: () => void }) => {
  const steps = [
    { id: 'OVERVIEW', label: 'Overview', num: 1 },
    { id: 'SETUP', label: 'Setup', num: 2 },
    { id: 'INTERVIEW', label: 'Interview', num: 3 },
    { id: 'DONE', label: 'Review', num: 4 },
  ];

  const currentIdx = steps.findIndex(s => s.id === currentStep || (s.id === 'INTERVIEW' && currentStep === 'INTRO'));

  return (
    <header className="relative bg-white z-50">
      <div className="flex items-center justify-between px-8 py-3 h-16 border-b">
        <div className="flex items-center gap-8">
          <img 
            src="https://storage.googleapis.com/mlp-v2-dev-3f31.appspot.com/projects/azqwnezevolny44rsia5np/assets/input_file_0.png" 
            alt="Hiralo.ai Logo" 
            className="h-10 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          
          <nav className="hidden md:flex items-center gap-3">
            {steps.map((s, idx) => {
              const isActive = currentStep === s.id || (s.id === 'INTERVIEW' && currentStep === 'INTRO');
              const isCompleted = idx < currentIdx;
              
              return (
                <React.Fragment key={s.id}>
                  <div 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-blue-200' 
                        : 'bg-white text-zinc-400 border-zinc-100'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive 
                        ? 'bg-blue-600 text-white' 
                        : isCompleted 
                          ? 'bg-zinc-400 text-white' 
                          : 'bg-zinc-100 text-zinc-400'
                    }`}>
                      {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                    </div>
                    <span className={isActive ? 'text-zinc-900' : 'text-zinc-400'}>{s.label}</span>
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-8 h-[1px] bg-zinc-100" />
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-900">{user.displayName}</p>
                <p className="text-[10px] text-zinc-500">{user.email}</p>
              </div>
              <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-200" referrerPolicy="no-referrer" />
              <button 
                onClick={onLogout}
                className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              <LogIn className="w-4 h-4" />
              Login
            </button>
          )}
          <div className="w-[1px] h-6 bg-zinc-200 mx-2" />
          <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors">
            <HelpCircle className="w-4 h-4" />
            Help
          </button>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="h-1 bg-zinc-100 w-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / steps.length) * 100}%` }}
          className="h-full bg-blue-600"
        />
      </div>
    </header>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [step, setStep] = useState<Step>('OVERVIEW');
  const [currentQ, setCurrentQ] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [timer, setTimer] = useState(60);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [retakesLeft, setRetakesLeft] = useState(3);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);

  const [setupVideoEnded, setSetupVideoEnded] = useState(false);
  const [setupVideoTime, setSetupVideoTime] = useState(0);

  const [interviewResponses, setInterviewResponses] = useState<{questionId: number, videoUrl: string, timestamp: any}[]>([]);

  const userVideoRef = useRef<HTMLVideoElement>(null);
  const aiVideoRef = useRef<HTMLVideoElement>(null);
  const setupVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Create/Update user doc
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: 'user',
              createdAt: serverTimestamp()
            });
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStep('OVERVIEW');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const getSetupSubtitle = (time: number) => {
    if (time > 0 && time < 4.5) {
      return "Before we dive into the questions, let’s take a moment to ensure your equipment is working perfectly.";
    }
    if (time >= 4.5 && time < 8.5) {
      return "Please check your camera, microphone, and audio before we begin.";
    }
    return "";
  };

  // M-02: Permission Request & Device Enumeration
  useEffect(() => {
    if (step === 'SETUP') {
      // Only start if not already active
      if (stream && stream.active && stream.getVideoTracks().length > 0) return;
      
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter(d => d.kind === 'audioinput');
      const video = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audio);
      setVideoDevices(video);
      
      if (audio.length && !selectedAudioId) setSelectedAudioId(audio[0].deviceId);
      if (video.length && !selectedVideoId) setSelectedVideoId(video[0].deviceId);
    } catch (err) {
      console.error("Error enumerating devices:", err);
    }
  };

  const startCamera = async (audioId?: string, videoId?: string) => {
    setError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support camera/microphone access. Please use a modern browser like Chrome.");
      return;
    }

    try {
      // Stop existing tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const vId = videoId || selectedVideoId;
      const aId = audioId || selectedAudioId;

      let mediaStream: MediaStream;

      const constraints: MediaStreamConstraints = {
        video: vId ? { deviceId: { ideal: vId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: aId ? { deviceId: { ideal: aId } } : true
      };

      try {
        console.log("Attempting media access", constraints);
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err1: any) {
        console.warn("Primary attempt failed, trying fallback:", err1.name || err1);
        
        // If permission is explicitly denied, we must stop
        if (err1.name === 'NotAllowedError' || err1.name === 'PermissionDeniedError') {
          throw err1;
        }

        try {
          // Fallback: Minimal constraints
          mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        } catch (err2: any) {
          console.error("All media access attempts failed:", err2);
          throw err2;
        }
      }

      setStream(mediaStream);
      
      // Enumerate devices to get labels
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audio = devices.filter(d => d.kind === 'audioinput');
      const video = devices.filter(d => d.kind === 'videoinput');
      setAudioDevices(audio);
      setVideoDevices(video);
      
      if (audio.length && !selectedAudioId) setSelectedAudioId(audio[0].deviceId);
      if (video.length && !selectedVideoId) setSelectedVideoId(video[0].deviceId);
    } catch (err: any) {
      console.error("Camera/Mic access error:", err);
      
      let msg = "Camera and microphone permissions are required.";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = "Permission denied. Please click the 'Lock' icon in your browser's address bar and set Camera/Microphone to 'Allow'.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = "No camera or microphone detected. Please connect your hardware and try again.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = "Your hardware is already in use by another app (like Zoom or Teams). Please close it and retry.";
      } else if (err.name === 'OverconstrainedError') {
        msg = "The requested camera resolution is not supported by your device.";
      }
      
      setError(msg);
    }
  };

  // Switch device on selection
  const handleDeviceChange = async (kind: 'audio' | 'video', deviceId: string) => {
    if (kind === 'audio') {
      setSelectedAudioId(deviceId);
      await startCamera(deviceId, selectedVideoId);
      setShowAudioMenu(false);
    } else {
      setSelectedVideoId(deviceId);
      await startCamera(selectedAudioId, deviceId);
      setShowVideoMenu(false);
    }
  };

  // M-05: Recording Logic
  const toggleRecording = () => {
    if (!isRecording && stream) {
      setIsRecording(true);
      setTimer(QUESTIONS[currentQ].duration);
      
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = recorder;
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        setIsSaving(true);
        // Simulate saving delay
        setTimeout(() => {
          setIsSaving(false);
          setRecordedVideoUrl(url);
        }, 1500);
      };
      
      recorder.start();
    } else {
      stopRecording();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0 && isRecording) {
      stopRecording();
    }
    return () => clearInterval(interval);
  }, [isRecording, timer]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Setup video preview when stream changes
  useEffect(() => {
    if (userVideoRef.current && stream) {
      userVideoRef.current.srcObject = stream;
    }
  }, [stream, step]);

  // AI Video Progress
  useEffect(() => {
    const video = aiVideoRef.current;
    if (!video) return;

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setVideoProgress(progress);
    };

    video.addEventListener('timeupdate', updateProgress);
    return () => video.removeEventListener('timeupdate', updateProgress);
  }, [step, currentQ]);

  const nextStep = async () => {
    // Save response locally
    if (recordedVideoUrl) {
      setInterviewResponses(prev => [
        ...prev, 
        { questionId: QUESTIONS[currentQ].id, videoUrl: recordedVideoUrl, timestamp: new Date().toISOString() }
      ]);
    }

    setRecordedVideoUrl(null);
    setRetakesLeft(3);
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(prev => prev + 1);
      setTimer(QUESTIONS[currentQ + 1].duration);
    } else {
      // Final Submission to Firestore
      if (user) {
        setIsSaving(true);
        try {
          await addDoc(collection(db, 'interviews'), {
            userId: user.uid,
            jobTitle: JOB_DETAILS.title,
            company: JOB_DETAILS.company,
            status: 'completed',
            responses: [...interviewResponses, { questionId: QUESTIONS[currentQ].id, videoUrl: recordedVideoUrl || '', timestamp: new Date().toISOString() }],
            submittedAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, 'interviews');
        } finally {
          setIsSaving(false);
        }
      }
      setStep('DONE');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-[800px] max-h-[800px] bg-zinc-50 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col overflow-hidden">
        <Header 
          currentStep={step} 
          user={user} 
          onLogin={handleLogin} 
          onLogout={handleLogout} 
        />

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* --- OVERVIEW --- */}
          {step === 'OVERVIEW' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-12 min-h-full"
            >
              {/* Sidebar */}
              <div className="lg:col-span-4 bg-blue-50/30 border-r border-zinc-200 p-8 space-y-6 overflow-y-auto">
                <div className="space-y-3">
                  <h2 className="font-display font-semibold text-xl text-zinc-900">About Your Interview</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    Please review the job details below to ensure you are proceeding with the correct position. Once confirmed, follow the guide on the right to begin.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Job Details</h3>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <Briefcase className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-zinc-400">Company</p>
                          <p className="text-sm font-semibold text-zinc-900">{JOB_DETAILS.company}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <UserIcon className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-zinc-400">Job Title</p>
                          <p className="text-sm font-semibold text-zinc-900">{JOB_DETAILS.title}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-4 h-4 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-400">Location</p>
                          <p className="text-sm font-semibold text-zinc-900">{JOB_DETAILS.location}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-zinc-400">Experience</p>
                          <p className="text-sm font-semibold text-zinc-900">{JOB_DETAILS.experience}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Interview Window</h3>
                    <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
                      <p className="font-semibold text-xs text-zinc-900">{JOB_DETAILS.deadline}</p>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-3/4" />
                      </div>
                      <p className="text-[10px] text-zinc-400 italic">2 hours remaining</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-8 p-8 space-y-6 bg-white overflow-y-auto">
                <div className="space-y-1">
                  <h1 className="text-2xl font-display font-semibold text-zinc-900">How it Works</h1>
                  <p className="text-sm text-zinc-500">Follow these four steps to complete your session. Please ensure you are in a quiet space before beginning.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { 
                      num: '01', 
                      title: 'Device Setup', 
                      desc: "Enable camera and microphone access. We'll perform a quick diagnostic to ensure a stable connection",
                      icon: <Camera className="w-5 h-5 text-blue-500" />
                    },
                    { 
                      num: '02', 
                      title: 'AI Interviewer', 
                      desc: 'Our virtual interviewer will guide you through the session. You can listen to the questions or read them on-screen as you go',
                      icon: <HelpCircle className="w-5 h-5 text-blue-500" />
                    },
                    { 
                      num: '03', 
                      title: 'Record Answers', 
                      desc: 'Share your insights. You have two additional attempts per question to ensure you are satisfied with your answer.',
                      icon: <Video className="w-5 h-5 text-blue-500" />
                    },
                    { 
                      num: '04', 
                      title: 'Submit & Done', 
                      desc: 'Review your recordings and finalize your session. Once submitted, your interview will be shared with the hiring team.',
                      icon: <CheckCircle2 className="w-5 h-5 text-blue-500" />
                    },
                  ].map((item) => (
                    <div key={item.num} className="p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow space-y-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-zinc-400"><span className="text-blue-600">{item.num}</span> {item.title}</p>
                        <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                      <AlertCircle className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-zinc-700">
                        Your interview responses are encrypted, stored securely, and shared exclusively with the hiring team.
                      </p>
                      <button className="text-[10px] text-blue-600 font-medium hover:underline">Read our privacy policy →</button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-zinc-300 bg-white transition-all checked:border-blue-600 checked:bg-blue-600" 
                      />
                      <CheckCircle2 className="absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100" />
                    </div>
                    <span className="text-xs text-zinc-600 font-medium group-hover:text-zinc-900 transition-colors">
                      I have read and understood the interview process and privacy notice
                    </span>
                  </label>
                </div>

                <div className="flex flex-col items-end pt-2 gap-3">
                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs font-medium bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </div>
                  )}
                  <button 
                    onClick={() => {
                      if (!user) {
                        handleLogin();
                        return;
                      }
                      setStep('SETUP');
                    }}
                    disabled={!agreed || isLoading}
                    className={`px-16 py-3 rounded-xl font-semibold text-base transition-all shadow-lg ${
                      agreed && !isLoading
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100' 
                        : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Connecting...
                      </div>
                    ) : !user ? 'Login to Start' : 'Next'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- SETUP --- */}
          {step === 'SETUP' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-2 h-full overflow-hidden"
            >
              {/* Left: Setup Video & Preview */}
              <div className="relative h-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                <video 
                  ref={setupVideoRef}
                  autoPlay 
                  playsInline 
                  src="https://storage.googleapis.com/mlp-v2-dev-3f31.appspot.com/projects/azqwnezevolny44rsia5np/assets/input_file_1.mp4"
                  onEnded={() => setSetupVideoEnded(true)}
                  onTimeUpdate={(e) => setSetupVideoTime(e.currentTarget.currentTime)}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Subtitles Overlay (Image Style) */}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-8 z-20">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Device Setup</p>
                  <p className="text-white text-lg font-semibold leading-tight">
                    {getSetupSubtitle(setupVideoTime) || "Before we dive into the questions, let's take a moment to ensure your equipment is working perfectly."}
                  </p>
                </div>

                {/* Replay Button */}
                {setupVideoEnded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-30">
                    <button 
                      onClick={() => {
                        if (setupVideoRef.current) {
                          setupVideoRef.current.currentTime = 0;
                          setupVideoRef.current.play();
                          setSetupVideoEnded(false);
                        }
                      }}
                      className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-all group"
                    >
                      <Play className="w-10 h-10 text-white fill-white group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                )}

                {/* Small Camera Preview Overlay */}
                <div className="absolute top-6 right-6 w-48 aspect-video bg-zinc-800 rounded-xl border border-white/20 shadow-2xl overflow-hidden z-40">
                  {stream?.getVideoTracks().length ? (
                    <video 
                      autoPlay 
                      playsInline 
                      muted 
                      ref={userVideoRef}
                      className="w-full h-full object-cover mirror-mode"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Camera className="w-6 h-6 text-zinc-600" />
                      <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">No Signal</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Setup Controls */}
              <div className="p-12 bg-white flex flex-col justify-between overflow-y-auto">
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-display font-bold text-zinc-900 mb-2">Check your setup</h1>
                    <p className="text-zinc-500 text-sm">Both camera and microphone must be ready to continue.</p>
                    
                    {error && (
                      <div className="mt-6 space-y-4">
                        <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-sm font-bold">Connection Error</p>
                            <p className="text-xs leading-relaxed">{error}</p>
                            <button 
                              onClick={() => startCamera()}
                              className="mt-2 text-xs font-bold underline underline-offset-4 hover:text-red-700 transition-colors"
                            >
                              Try connecting again
                            </button>
                          </div>
                        </div>

                        {(error.includes("Permission denied") || error.includes("NotAllowedError")) && (
                          <div className="p-6 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">How to fix this in Chrome:</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">1</div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Click the <span className="text-blue-400 font-bold">Lock icon</span> next to the URL</p>
                              </div>
                              <div className="space-y-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">2</div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Toggle <span className="text-blue-400 font-bold">Camera & Mic</span> to "On"</p>
                              </div>
                              <div className="space-y-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">3</div>
                                <p className="text-[10px] text-zinc-400 leading-tight">Click <span className="text-blue-400 font-bold">Try again</span> above</p>
                              </div>
                            </div>
                            <div className="pt-2 border-t border-white/5">
                              <p className="text-[9px] text-zinc-500 italic">Note: If you don't see the lock icon, check your browser's site settings.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Microphone Card */}
                    <div className="p-6 rounded-2xl border border-zinc-100 bg-zinc-50/30 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Mic className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-zinc-900 text-base">Microphone</h3>
                        <p className="text-xs text-zinc-500">Enable microphone to record audio responses</p>
                      </div>
                      {stream?.getAudioTracks().length ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <div className="w-6 h-6 border-2 border-zinc-200 rounded-full" />
                      )}
                    </div>

                    {/* Camera Card */}
                    <div className="p-6 rounded-2xl border border-zinc-100 bg-zinc-50/30 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Camera className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-zinc-900 text-base">Camera</h3>
                        <p className="text-xs text-zinc-500">Enable camera to record video responses</p>
                      </div>
                      {stream?.getVideoTracks().length ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                      ) : (
                        <div className="w-6 h-6 border-2 border-zinc-200 rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Having Trouble Card */}
                  <div className="p-8 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-4">
                    <div className="flex items-center gap-3 text-blue-600">
                      <Info className="w-5 h-5" />
                      <h4 className="font-bold text-zinc-900">Having trouble?</h4>
                    </div>
                    <ul className="space-y-3">
                      {[
                        "Reload the page to refresh your connection and try again",
                        "Review browser permissions to ensure camera and microphone access are \"Allowed\"",
                        "Close other applications (like Zoom, Teams, or Skype) that may be using your hardware",
                        "Check your internet to ensure a stable and active connection"
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-zinc-600 leading-relaxed">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 mt-2 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-8">
                  <button 
                    onClick={() => setStep('OVERVIEW')}
                    className="text-zinc-500 font-bold hover:text-zinc-900 transition-colors px-6"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (stream?.getVideoTracks().length && stream?.getAudioTracks().length) {
                        setStep('INTRO');
                      } else {
                        startCamera();
                      }
                    }}
                    className="px-16 py-4 bg-blue-300 hover:bg-blue-400 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-100"
                  >
                    Next
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- INTERVIEW / INTRO --- */}
          {(step === 'INTRO' || step === 'INTERVIEW') && (
            <motion.div 
              key="interview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-2 h-full overflow-hidden"
            >
              {/* Left: AI Interviewer */}
              <div className="relative h-full bg-zinc-100 overflow-hidden group">
                {/* Progress Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-200 z-20">
                  <motion.div 
                    className="h-full bg-blue-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${videoProgress}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>

                <div className="w-full h-full relative">
                  <video 
                    ref={aiVideoRef}
                    key={currentQ} 
                    autoPlay 
                    playsInline
                    onEnded={() => {
                      if (step === 'INTRO') {
                        setStep('INTERVIEW');
                      }
                    }}
                    className="w-full h-full object-cover"
                  >
                    <source src={QUESTIONS[currentQ].video} type="video/mp4" />
                  </video>
                  
                  {/* Play Button Overlay (PRD Style) */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                      <Play className="w-8 h-8 text-blue-600 fill-current ml-1" />
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-12 left-12 right-12 p-8 bg-black/60 backdrop-blur-md rounded-3xl text-white border border-white/10 shadow-2xl">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
                    {step === 'INTRO' ? 'Introduction' : `Question ${QUESTIONS[currentQ].id} of 10`}
                  </p>
                  <p className="text-xl font-medium leading-relaxed">
                    {step === 'INTRO' 
                      ? "Whenever you're ready, let's take a deep breath and begin." 
                      : QUESTIONS[currentQ].text}
                  </p>
                </div>
              </div>

              {/* Right: User Camera & Controls */}
              <div className="relative h-full bg-zinc-900 flex flex-col">
                <div className="flex-1 relative overflow-hidden">
                  {recordedVideoUrl ? (
                    <video 
                      src={recordedVideoUrl}
                      autoPlay 
                      loop
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  ) : isVideoOn ? (
                    <video 
                      ref={userVideoRef} 
                      autoPlay 
                      muted 
                      playsInline
                      className="w-full h-full object-cover scale-x-[-1]" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                      <VideoOff className="w-20 h-20 text-zinc-600" />
                    </div>
                  )}

                  {/* Overlays */}
                  {isRecording && (
                    <>
                      <div className="absolute top-6 left-6">
                        <div className="px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-xl text-sm font-semibold flex items-center gap-2 border border-white/10">
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                          Recording
                        </div>
                      </div>
                      <div className="absolute top-6 right-6">
                        <div className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-mono font-semibold shadow-lg">
                          00:{timer < 10 ? `0${timer}` : timer}
                        </div>
                      </div>
                    </>
                  )}

                  {isSaving && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-4">
                      <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
                      <p className="font-semibold text-lg tracking-tight">Saving....</p>
                    </div>
                  )}

                  {recordedVideoUrl && (
                    <div className="absolute top-6 left-6">
                      <div className="px-4 py-2 bg-black/60 backdrop-blur-md text-white rounded-xl text-sm font-bold flex items-center gap-2 border border-white/10">
                        <Monitor className="w-4 h-4" />
                        Preview
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Control Bar */}
                <div className="h-32 bg-zinc-800/90 backdrop-blur-md border-t border-white/10 flex items-center justify-center px-12">
                  {recordedVideoUrl ? (
                    <div className="flex gap-4 w-full max-w-2xl">
                      <button 
                        onClick={() => {
                          if (retakesLeft > 0) {
                            setRecordedVideoUrl(null);
                            setTimer(QUESTIONS[currentQ].duration);
                            setRetakesLeft(prev => prev - 1);
                          }
                        }}
                        disabled={retakesLeft === 0}
                        className={`flex-1 py-4 rounded-2xl font-semibold border-2 transition-all flex items-center justify-center gap-2 ${
                          retakesLeft > 0 
                            ? 'bg-white text-blue-600 border-blue-600 hover:bg-zinc-50' 
                            : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
                        }`}
                      >
                        <RotateCcw className="w-5 h-5" /> Retake ({retakesLeft})
                      </button>
                      <button 
                        onClick={nextStep}
                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
                      >
                        Submit
                      </button>
                    </div>
                  ) : (
                    <div className="w-full flex items-center justify-between">
                      {/* Left: Audio/Video Toggles */}
                      <div className="flex gap-6">
                        <div className="flex flex-col items-center gap-2 relative">
                          {/* Audio Menu */}
                          <AnimatePresence>
                            {showAudioMenu && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full mb-4 left-0 w-64 bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                              >
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest p-3">Select Microphone</p>
                                <div className="max-h-48 overflow-auto">
                                  {audioDevices.map(device => (
                                    <button
                                      key={device.deviceId}
                                      onClick={() => handleDeviceChange('audio', device.deviceId)}
                                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                                        selectedAudioId === device.deviceId ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-white/5'
                                      }`}
                                    >
                                      <span className="truncate pr-2">{device.label || `Microphone ${device.deviceId.slice(0, 5)}`}</span>
                                      {selectedAudioId === device.deviceId && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setIsMicOn(!isMicOn)}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                isMicOn ? 'bg-zinc-100 text-zinc-900' : 'bg-red-500 text-white'
                              }`}
                            >
                              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => setShowAudioMenu(!showAudioMenu)}
                              className={`w-8 h-12 rounded-xl text-white flex items-center justify-center hover:bg-zinc-700 transition-colors ${showAudioMenu ? 'bg-zinc-700' : 'bg-zinc-700/50'}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Audio</span>
                        </div>

                        <div className="flex flex-col items-center gap-2 relative">
                          {/* Video Menu */}
                          <AnimatePresence>
                            {showVideoMenu && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute bottom-full mb-4 left-0 w-64 bg-zinc-800 border border-white/10 rounded-2xl shadow-2xl p-2 z-50"
                              >
                                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest p-3">Select Camera</p>
                                <div className="max-h-48 overflow-auto">
                                  {videoDevices.map(device => (
                                    <button
                                      key={device.deviceId}
                                      onClick={() => handleDeviceChange('video', device.deviceId)}
                                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${
                                        selectedVideoId === device.deviceId ? 'bg-blue-600 text-white' : 'text-zinc-300 hover:bg-white/5'
                                      }`}
                                    >
                                      <span className="truncate pr-2">{device.label || `Camera ${device.deviceId.slice(0, 5)}`}</span>
                                      {selectedVideoId === device.deviceId && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => setIsVideoOn(!isVideoOn)}
                              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                                isVideoOn ? 'bg-zinc-100 text-zinc-900' : 'bg-red-500 text-white'
                              }`}
                            >
                              {isVideoOn ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                            </button>
                            <button 
                              onClick={() => setShowVideoMenu(!showVideoMenu)}
                              className={`w-8 h-12 rounded-xl text-white flex items-center justify-center hover:bg-zinc-700 transition-colors ${showVideoMenu ? 'bg-zinc-700' : 'bg-zinc-700/50'}`}
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Video</span>
                        </div>
                      </div>

                      {/* Center: Record Button */}
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={step === 'INTRO' ? () => setStep('INTERVIEW') : toggleRecording}
                          disabled={isSaving || !!recordedVideoUrl}
                          className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all ${
                            isRecording ? 'border-zinc-400 bg-white' : 'border-white bg-transparent hover:scale-105'
                          } ${(isSaving || recordedVideoUrl) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className={`transition-all ${
                            isRecording ? 'w-6 h-6 bg-red-600 rounded-sm' : 'w-12 h-12 bg-red-600 rounded-full'
                          }`} />
                        </button>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                          {step === 'INTRO' ? 'Start Interview' : isRecording ? 'Stop recording' : 'Start recording'}
                        </span>
                      </div>

                      {/* Right: Exit Button */}
                      <div className="flex flex-col items-center gap-2">
                        <button 
                          onClick={() => setStep('OVERVIEW')}
                          className="w-12 h-12 rounded-full bg-zinc-100/20 text-white flex items-center justify-center hover:bg-zinc-100/30 transition-colors backdrop-blur-sm"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Exit</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* --- DONE --- */}
          {step === 'DONE' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 h-full"
            >
              {/* Left: AI Interviewer Closing */}
              <div className="relative h-full bg-zinc-100 overflow-hidden">
                <img 
                  src="https://picsum.photos/seed/interviewer/1920/1080" 
                  alt="AI Interviewer" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl">
                    <Play className="w-8 h-8 text-blue-600 fill-current ml-1" />
                  </div>
                </div>

                <div className="absolute bottom-12 left-12 right-12 p-8 bg-black/60 backdrop-blur-md rounded-3xl text-white border border-white/10 shadow-2xl">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">Closing</p>
                  <p className="text-lg font-medium leading-relaxed opacity-90">
                    That concludes our interview for today. Thank you so much for sharing your time and your story with me. I hope you have a wonderful rest of your day!
                  </p>
                </div>
              </div>

              {/* Right: Summary Content */}
              <div className="p-8 lg:p-12 flex flex-col justify-center bg-white overflow-y-auto">
                <div className="max-w-xl mx-auto w-full space-y-6">
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Interview Submitted Successfully</h1>
                    <p className="text-zinc-500 text-base">Thank you for completing your interview with <span className="text-blue-600 font-semibold">Hiralo.ai</span></p>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-zinc-900">Interview Summary</h2>
                    <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Position</span>
                        <span className="text-sm text-zinc-900 font-semibold">{JOB_DETAILS.title}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Company</span>
                        <span className="text-sm text-zinc-900 font-semibold">{JOB_DETAILS.company}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Questions Completed</span>
                        <span className="text-sm text-zinc-900 font-semibold">5 of 5</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500 font-medium">Total Duration</span>
                        <span className="text-sm text-zinc-900 font-semibold">12:34</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-zinc-900">What happens next?</h2>
                    <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-4 relative">
                      {/* Vertical Line */}
                      <div className="absolute left-[39px] top-10 bottom-10 w-0.5 bg-zinc-200" />
                      
                      <div className="flex gap-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">1</div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-zinc-900 text-sm">Hiring team reviews your interview</p>
                          <p className="text-zinc-500 text-xs">Typically within 3-5 business days</p>
                        </div>
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">2</div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-zinc-900 text-sm">You'll receive an email update</p>
                          <p className="text-zinc-500 text-xs">Check <span className="text-blue-600 font-medium">henry.smith@email.com</span></p>
                        </div>
                      </div>

                      <div className="flex gap-4 relative z-10">
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-xs shrink-0">3</div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-zinc-900 text-sm">Have questions? Reach out to</p>
                          <p className="text-blue-600 font-medium text-xs hover:underline cursor-pointer">careers@acmecorp.com →</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={() => setStep('OVERVIEW')}
                      className="flex-1 py-3 bg-white text-blue-600 rounded-xl font-semibold border-2 border-blue-600 hover:bg-zinc-50 transition-all text-sm"
                    >
                      View More Positions
                    </button>
                    <button 
                      onClick={() => setStep('OVERVIEW')}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20 text-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
    </ErrorBoundary>
  );
}
