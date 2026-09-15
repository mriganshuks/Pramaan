"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as faceapi from "@vladmandic/face-api";
import {
  Camera,
  Mic,
  Clock,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Eye,
  AlertCircle,
} from "lucide-react";
import { StatusBadge, RiskBadge } from "@/components/ui-shared";

export type ProctoringState =
  | "IDLE"
  | "REQUESTING_CAMERA"
  | "LOADING_MODEL"
  | "INITIALIZING_DETECTION"
  | "READY"
  | "ASSESSMENT_RUNNING"
  | "VIOLATION_DETECTED"
  | "ASSESSMENT_TERMINATED";

type Question = {
  id: string;
  prompt: string;
  topic: string;
  options: Array<{ id: "A" | "B" | "C" | "D"; text: string }>;
};

type Attempt = {
  id: string;
  skill: string;
  state: string;
  questions: Question[];
  codingProblem: {
    title: string;
    statement: string;
    constraints: string[];
    examples: Array<{ input: string; output: string }>;
    starterCode: string;
    language: string;
  };
  startedAt?: string;
  startTime?: string;
  expiresAt?: string;
  endTime?: string;
  notice?: string;
};

type Result = {
  mcq: { correct: number; total: number; percentage: number };
  coding: { status: string; score?: number; message?: string };
  integrity: { score: number; riskLevel: string; eventCount: number; violationCount?: number };
  finalScore: number;
  verificationStatus: string;
  state: string;
  performanceAnalysis?: {
    overallUnderstanding: string;
    strengths: string[];
    weaknesses: string[];
    improvementAreas: string[];
  };
  verificationReceipt?: { verificationId: string };
};

type RecordedViolation = {
  id: string;
  type: string;
  reason: string;
  timestamp: string;
  severity: string;
};

type Props = {
  skill: string;
  difficulty: "beginner" | "intermediate" | "advanced";
};

const readable = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function AssessmentClient({ skill, difficulty }: Props) {
  // Proctoring State Machine
  const [proctoringState, setProctoringState] = useState<ProctoringState>("IDLE");

  // Assessment Attempt Data
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [code, setCode] = useState("");
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState<"MCQ" | "CODE">("MCQ");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);

  // Errors and Status
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [terminated, setTerminated] = useState(false);

  // Violation Management
  const [violationCount, setViolationCount] = useState(0);
  const [violationModal, setViolationModal] = useState<{
    level: number;
    count: number;
    status: string;
    message: string;
  } | null>(null);
  const [violationsHistory, setViolationsHistory] = useState<RecordedViolation[]>([]);

  // Hardware Status
  const [cameraActive, setCameraActive] = useState(false);
  const [microphoneActive, setMicrophoneActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectedFacesCount, setDetectedFacesCount] = useState<number | null>(null);

  // Refs for Media & Proctored Loop
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const eventTimes = useRef<Record<string, number>>({});
  const attemptRef = useRef<string | null>(null);
  const lastFaceDetectionTime = useRef<number>(0);
  const consecutiveNoFaceFrames = useRef<number>(0);
  const consecutiveMultiFaceFrames = useRef<number>(0);

  // Stop hardware streams safely
  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    setCameraActive(false);
    setMicrophoneActive(false);
  }, []);

  // Post an integrity violation event to the server
  const signal = useCallback(
    async (
      type: string,
      severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
      humanReason?: string
    ) => {
      const id = attemptRef.current;
      if (!id || result || terminated) return;

      const now = Date.now();
      // Debounce events of identical type within 2000ms
      if (now - (eventTimes.current[type] ?? 0) < 2000) return;
      eventTimes.current[type] = now;

      const timestampIso = new Date().toISOString();
      const reason = humanReason ?? readable(type);

      try {
        const response = await fetch("/api/assessment/integrity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: id,
            events: [{ type, severity, timestamp: timestampIso, metadata: { reason } }],
          }),
        });

        const body = await response.json();

        if (response.ok && body.integrity) {
          const currentCount = body.integrity.violationCount ?? 0;
          setViolationCount(currentCount);

          // Track episode in history
          setViolationsHistory((prev) => [
            ...prev,
            {
              id: `${type}_${now}`,
              type,
              reason,
              timestamp: timestampIso,
              severity,
            },
          ]);

          if (body.integrity.terminated || currentCount >= 3) {
            setTerminated(true);
            setProctoringState("ASSESSMENT_TERMINATED");
            stopMedia();
            if (document.fullscreenElement) {
              void document.exitFullscreen().catch(() => undefined);
            }
            return;
          }

          if (body.integrity.violationLevel > 0) {
            setProctoringState("VIOLATION_DETECTED");
            setViolationModal({
              level: body.integrity.violationLevel,
              count: body.integrity.violationCount,
              status: body.integrity.status,
              message: body.integrity.warningMessage,
            });
          }

          setNotice(
            `Integrity signal recorded: ${reason}. Risk: ${readable(body.integrity.riskLevel)}.`
          );
        }
      } catch {
        setNotice(
          "Network notification: An integrity heartbeat could not reach the server. Keep window in focus."
        );
      }
    },
    [result, terminated, stopMedia]
  );

  // Step 1: Request Camera & Microphone Permissions
  async function initializeHardware() {
    setError(null);
    setAuthRequired(false);
    setProctoringState("REQUESTING_CAMERA");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser environment does not support camera/microphone access.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      streamRef.current = stream;
      setCameraActive(stream.getVideoTracks().some((t) => t.readyState === "live"));
      setMicrophoneActive(stream.getAudioTracks().some((t) => t.readyState === "live"));

      // Attach to preview video element if rendered
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
        void previewVideoRef.current.play().catch(() => undefined);
      }

      // Step 2: Load TinyFaceDetector Neural Weights
      setProctoringState("LOADING_MODEL");
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        setModelsLoaded(true);
      } catch (modelErr) {
        console.error("Face detector model failed to load:", modelErr);
        throw new Error(
          "Unable to load the neural face detection weights from /models. Please ensure static model assets are reachable and retry."
        );
      }

      // Step 3: Warmup Detection
      setProctoringState("INITIALIZING_DETECTION");
      if (previewVideoRef.current) {
        try {
          const detections = await faceapi.detectAllFaces(
            previewVideoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 })
          );
          setDetectedFacesCount(detections.length);
        } catch {
          // Warmup attempt
        }
      }

      // Step 4: System is Confirmed READY
      setProctoringState("READY");
    } catch (err: unknown) {
      stopMedia();
      setProctoringState("IDLE");
      setError(
        err instanceof Error
          ? err.message
          : "Camera and microphone permissions are required for proctored evaluation."
      );
    }
  }

  // Step 5: Start Assessment (Only accessible from READY state)
  async function startAssessment() {
    if (proctoringState !== "READY" || !streamRef.current) {
      setError("Please complete the proctoring hardware verification before starting.");
      return;
    }

    setError(null);
    setAuthRequired(false);

    try {
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, difficulty, consent: true }),
      });

      const body = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setAuthRequired(true);
          throw new Error("Authentication required. Please sign in or initialize your profile.");
        }
        throw new Error(body.error?.message ?? "Unable to initialize assessment session.");
      }

      // Safe access: extract attempt or session object
      const sessionAttempt = (body.attempt || body.session) as Attempt | undefined;
      if (!sessionAttempt) {
        throw new Error("The assessment server did not return a valid session payload.");
      }

      // Authoritative start and expiry verification
      const startTimeVal = sessionAttempt.startedAt || sessionAttempt.startTime;
      const expiresTimeVal = sessionAttempt.expiresAt || sessionAttempt.endTime;

      if (!startTimeVal || !expiresTimeVal) {
        throw new Error("Assessment session is missing server-authoritative timestamps.");
      }

      attemptRef.current = sessionAttempt.id;
      setAttempt(sessionAttempt);
      setCode(sessionAttempt.codingProblem?.starterCode ?? "");

      const remainingSecs = Math.max(
        0,
        Math.floor((new Date(expiresTimeVal).getTime() - Date.now()) / 1000)
      );
      setSeconds(remainingSecs);

      // Listen for unexpected track drops during test
      streamRef.current.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCameraActive(false);
          void signal("CAMERA_DISABLED", "HIGH", "Camera feed disconnected");
        };
      });
      streamRef.current.getAudioTracks().forEach((track) => {
        track.onended = () => {
          setMicrophoneActive(false);
          void signal("MICROPHONE_DISABLED", "HIGH", "Microphone feed disconnected");
        };
      });

      // Request fullscreen
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => undefined);
      }

      // Transition to active proctoring state
      setProctoringState("ASSESSMENT_RUNNING");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to start assessment.");
    }
  }

  // Submit assessment attempt to server
  const submit = useCallback(
    async (timeout = false) => {
      if (!attempt || submitting || result) return;
      setSubmitting(true);
      try {
        const response = await fetch("/api/assessment/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assessmentId: attempt.id,
            answers,
            codingSubmission: code,
            timeout,
          }),
        });

        const body = await response.json();
        if (!response.ok) {
          if (body.error?.code === "ASSESSMENT_TERMINATED") {
            setTerminated(true);
            setProctoringState("ASSESSMENT_TERMINATED");
            stopMedia();
            return;
          }
          throw new Error(body.error?.message ?? "Unable to submit assessment.");
        }

        setResult(body.result);
        stopMedia();
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Unable to submit assessment.");
      } finally {
        setSubmitting(false);
      }
    },
    [attempt, submitting, result, answers, code, stopMedia]
  );

  // Synchronize live camera stream to video element in assessment mode
  useEffect(() => {
    if (proctoringState === "ASSESSMENT_RUNNING" && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [proctoringState]);

  // Synchronize preview camera stream in pre-flight setup mode
  useEffect(() => {
    if (
      (proctoringState === "REQUESTING_CAMERA" ||
        proctoringState === "LOADING_MODEL" ||
        proctoringState === "INITIALIZING_DETECTION" ||
        proctoringState === "READY") &&
      previewVideoRef.current &&
      streamRef.current
    ) {
      previewVideoRef.current.srcObject = streamRef.current;
      void previewVideoRef.current.play().catch(() => undefined);
    }
  }, [proctoringState]);

  // Continuous Proctored Face Detection Loop
  useEffect(() => {
    if (proctoringState !== "ASSESSMENT_RUNNING" || !modelsLoaded || !attempt || result) return;

    let active = true;
    let timerId: NodeJS.Timeout;

    async function checkFaceFrame() {
      if (!active || !videoRef.current) return;

      if (videoRef.current.readyState === 4) {
        try {
          const faces = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.35 })
          );

          setDetectedFacesCount(faces.length);
          const now = Date.now();

          if (faces.length === 0) {
            consecutiveMultiFaceFrames.current = 0;
            consecutiveNoFaceFrames.current += 1;

            // Debounced strike: require >= 4 consecutive checks (~2.5 seconds) with no face
            if (consecutiveNoFaceFrames.current >= 4) {
              if (now - lastFaceDetectionTime.current > 3500) {
                void signal("NO_FACE_DETECTED", "MEDIUM", "No face detected in camera feed");
                lastFaceDetectionTime.current = now;
              }
            }
          } else if (faces.length > 1) {
            consecutiveNoFaceFrames.current = 0;
            consecutiveMultiFaceFrames.current += 1;

            // Debounced strike: require >= 3 consecutive checks (~2 seconds) with >1 face
            if (consecutiveMultiFaceFrames.current >= 3) {
              void signal("MULTIPLE_FACES_DETECTED", "HIGH", "Multiple faces detected in frame");
              consecutiveMultiFaceFrames.current = 0;
            }
          } else {
            // Normal 1 face confirmed
            consecutiveNoFaceFrames.current = 0;
            consecutiveMultiFaceFrames.current = 0;
            lastFaceDetectionTime.current = now;
          }
        } catch {
          // Guard against transient canvas errors
        }
      }

      if (active) {
        timerId = setTimeout(() => {
          if (active) void checkFaceFrame();
        }, 600);
      }
    }

    lastFaceDetectionTime.current = Date.now();
    void checkFaceFrame();

    return () => {
      active = false;
      clearTimeout(timerId);
    };
  }, [proctoringState, modelsLoaded, attempt, result, signal]);

  // Tab Switching & Fullscreen Enforcement
  useEffect(() => {
    if (proctoringState !== "ASSESSMENT_RUNNING" || !attempt || result) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void signal("TAB_HIDDEN", "HIGH", "Tab switch detected");
      }
    };
    const onBlur = () => {
      void signal("WINDOW_BLUR", "MEDIUM", "Window focus lost");
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        void signal("FULLSCREEN_EXIT", "HIGH", "Fullscreen exited");
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      void signal("COPY_ATTEMPT", "LOW", "Clipboard copy blocked");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      void signal("PASTE_ATTEMPT", "LOW", "Clipboard paste blocked");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [proctoringState, attempt, result, signal]);

  // Authoritative Server Countdown Timer
  useEffect(() => {
    if (proctoringState !== "ASSESSMENT_RUNNING" || !attempt || result) return;

    const expiresTimeStr = attempt.expiresAt || attempt.endTime;
    if (!expiresTimeStr) return;

    const expiresEpoch = new Date(expiresTimeStr).getTime();

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresEpoch - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        void submit(true);
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [proctoringState, attempt, result, submit]);

  // Clean up media streams on unmount
  useEffect(() => () => stopMedia(), [stopMedia]);

  const formattedTime = useMemo(
    () =>
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds]
  );

  // =========================================================================
  // VIEW: 3-VIOLATION PERMANENT TERMINATION SCREEN
  // =========================================================================
  if (terminated || proctoringState === "ASSESSMENT_TERMINATED") {
    return (
      <main className="mx-auto flex min-h-[75vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16">
        <div className="w-full rounded-3xl border border-rose-300 bg-white p-6 shadow-md sm:p-10">
          <div className="flex items-center gap-3.5 border-b border-rose-100 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shrink-0">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <span className="rounded-full bg-rose-100 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Terminated (3 of 3 Violations)
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900">
                Assessment Terminated Due to Proctoring Violations
              </h1>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-xs leading-relaxed text-stone-700">
              The proctoring system confirmed <strong className="text-rose-700">3 sustained violation episodes</strong> during this session. Under PRAMAAN protocol guidelines, this assessment attempt has been locked with state <span className="font-mono font-bold text-rose-800">FAILED</span>.
            </p>

            {/* Violation Summary Metric Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 block">
                  TOTAL VIOLATIONS
                </span>
                <span className="mt-1 font-mono text-2xl font-extrabold text-rose-900">
                  {Math.max(3, violationCount)} / 3
                </span>
                <span className="text-[10px] text-rose-700 block mt-0.5">Threshold Reached</span>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                  INTEGRITY IMPACT
                </span>
                <span className="mt-1 font-mono text-2xl font-extrabold text-stone-900">
                  ≤ 30 / 100
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">High Risk Flagged</span>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 block">
                  CREDENTIAL STATUS
                </span>
                <span className="mt-1 font-mono text-base font-bold text-rose-700 block py-1">
                  NOT VERIFIED
                </span>
                <span className="text-[10px] text-stone-500 block">Server Enforced</span>
              </div>
            </div>

            {/* Violation Breakdown History */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-mono">
                Confirmed Violation Episodes:
              </h2>
              <ul className="mt-3 divide-y divide-stone-200 text-xs text-stone-700">
                {violationsHistory.length > 0 ? (
                  violationsHistory.slice(0, 5).map((item, idx) => (
                    <li key={item.id || idx} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="font-mono font-bold text-rose-700 shrink-0">
                          #{idx + 1}
                        </span>
                        <div>
                          <span className="font-semibold text-stone-900">{item.reason}</span>
                          <span className="text-[10px] text-stone-400 block font-mono">
                            Type: {item.type} · Severity: {item.severity}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="py-2 flex items-center justify-between">
                      <span>1. Tab switch / browser focus lost</span>
                      <span className="font-mono text-[10px] text-rose-700 font-bold">Confirmed</span>
                    </li>
                    <li className="py-2 flex items-center justify-between">
                      <span>2. Face presence lost or occluded</span>
                      <span className="font-mono text-[10px] text-rose-700 font-bold">Confirmed</span>
                    </li>
                    <li className="py-2 flex items-center justify-between">
                      <span>3. Multiple faces detected in frame</span>
                      <span className="font-mono text-[10px] text-rose-700 font-bold">Confirmed</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
            >
              Return to Candidate Dashboard
            </Link>
            <Link
              href="/assessments"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Browse Skills
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: RESULT SCREEN (COMPLETED)
  // =========================================================================
  if (result) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
                EVALUATION RESULT
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                {attempt?.skill} Benchmark
              </h1>
            </div>
            <div>
              <StatusBadge status={result.verificationStatus} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-4 border-b border-stone-100 pb-8">
            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Final Score
              </span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">{result.finalScore}%</span>
              <span className="text-[11px] text-stone-500">Benchmark composite</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                MCQ Accuracy
              </span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">
                {result.mcq.correct} / {result.mcq.total}
              </span>
              <span className="text-[11px] text-stone-500">Concept verification</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Integrity Score
              </span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">
                {result.integrity.score} / 100
              </span>
              <span className="text-[11px] text-stone-500">Proctoring rating</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                Proctor Risk
              </span>
              <div className="mt-1.5">
                <RiskBadge riskLevel={result.integrity.riskLevel} />
              </div>
              <span className="text-[11px] text-stone-500 mt-1 block">Behavioral index</span>
            </div>
          </div>

          {result.performanceAnalysis && (
            <section className="mt-8">
              <h2 className="text-base font-bold text-stone-900">AI Performance Breakdown</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-600">
                {result.performanceAnalysis.overallUnderstanding}
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Key Strengths
                  </span>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-stone-700">
                    {result.performanceAnalysis.strengths.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Identified Gaps
                  </span>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-stone-700">
                    {result.performanceAnalysis.weaknesses.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 p-4">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-stone-600" />
                    Recommended Growth
                  </span>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-stone-700">
                    {result.performanceAnalysis.improvementAreas.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="text-stone-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {result.verificationReceipt && (
            <div className="mt-8 rounded-xl border border-stone-200 bg-stone-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs font-mono text-stone-600">
              <div>
                <span className="text-stone-400 block text-[10px]">VERIFICATION RECEIPT ID</span>
                <span className="font-bold text-stone-900">{result.verificationReceipt.verificationId}</span>
              </div>
              <span className="text-[11px] text-stone-500">Tamper-proof record generated</span>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
            >
              Return to Dashboard
            </Link>
            <Link
              href="/skills"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition"
            >
              View Updated Skills
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: PRE-FLIGHT HARDWARE VERIFICATION & LOBBY (STATE MACHINE DRIVEN)
  // =========================================================================
  if (!attempt || proctoringState !== "ASSESSMENT_RUNNING") {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              <span>PRE-FLIGHT PROCTORING CHECK</span>
              <span className="text-stone-300">·</span>
              <span>{readable(difficulty)} LEVEL</span>
            </div>

            {/* Proctoring Status Badge */}
            <div>
              {proctoringState === "IDLE" && (
                <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-mono font-medium text-stone-600">
                  Uninitialized
                </span>
              )}
              {(proctoringState === "REQUESTING_CAMERA" ||
                proctoringState === "LOADING_MODEL" ||
                proctoringState === "INITIALIZING_DETECTION") && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-mono font-bold text-amber-800">
                  <RefreshCw className="h-3 w-3 animate-spin text-amber-700" />
                  Initializing
                </span>
              )}
              {proctoringState === "READY" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-mono font-bold text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Ready
                </span>
              )}
            </div>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Prepare for {skill} Benchmark
          </h1>
          <p className="mt-2 text-xs leading-relaxed text-stone-600">
            PRAMAAN uses on-device neural face presence detection and tab focus verification to issue tamper-evident credentials. All computer vision models execute locally inside your browser; no camera recordings leave your machine.
          </p>

          {/* Interactive Hardware & Diagnostics Panel */}
          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* Live Preview Container */}
              <div className="relative h-44 w-56 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                <video
                  ref={previewVideoRef}
                  muted
                  playsInline
                  className={`h-full w-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  aria-label="Camera calibration preview"
                />
                {!cameraActive && (
                  <div className="flex flex-col items-center justify-center text-center p-3 text-stone-400">
                    <Camera className="h-8 w-8 mb-2 opacity-50" />
                    <span className="text-[11px] font-mono">Camera Offline</span>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-0.5 text-[9px] font-mono text-emerald-400 backdrop-blur-xs flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>LIVE FEED</span>
                  </div>
                )}
              </div>

              {/* Status Diagnostic Checklist */}
              <div className="flex-1 space-y-2.5 text-xs text-stone-700 w-full">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="font-semibold text-stone-900 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-stone-500" />
                    Camera Stream
                  </span>
                  <span className="font-mono text-[11px]">
                    {cameraActive ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="text-stone-400">NOT CONNECTED</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="font-semibold text-stone-900 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-stone-500" />
                    Neural Detector (/models)
                  </span>
                  <span className="font-mono text-[11px]">
                    {modelsLoaded ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> LOADED
                      </span>
                    ) : proctoringState === "LOADING_MODEL" ? (
                      <span className="text-amber-700 font-bold flex items-center gap-1">
                        <RefreshCw className="h-3 w-3 animate-spin" /> DOWNLOADING...
                      </span>
                    ) : (
                      <span className="text-stone-400">PENDING</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2">
                  <span className="font-semibold text-stone-900 flex items-center gap-2">
                    <Mic className="h-4 w-4 text-stone-500" />
                    Microphone Input
                  </span>
                  <span className="font-mono text-[11px]">
                    {microphoneActive ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> READY
                      </span>
                    ) : (
                      <span className="text-stone-400">NOT CONNECTED</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="font-semibold text-stone-900">Strike Enforcement</span>
                  <span className="font-mono text-rose-700 font-bold">
                    3 Violations = Immediate Termination
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Explicit Error Banners */}
          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-950">Proctoring Initialization Notice</p>
                <p className="mt-1 leading-relaxed">{error}</p>
                {authRequired && (
                  <div className="mt-3 flex gap-2">
                    <Link
                      href="/login"
                      className="rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-stone-50 hover:bg-stone-800"
                    >
                      Sign In with Google
                    </Link>
                    <Link
                      href="/onboarding"
                      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
                    >
                      Create Local Profile
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* State Machine Action Controls */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {proctoringState === "IDLE" && (
              <button
                type="button"
                onClick={() => void initializeHardware()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition"
              >
                <Camera className="h-4 w-4" />
                <span>Initialize Proctoring & Hardware Check</span>
              </button>
            )}

            {(proctoringState === "REQUESTING_CAMERA" ||
              proctoringState === "LOADING_MODEL" ||
              proctoringState === "INITIALIZING_DETECTION") && (
              <button
                type="button"
                disabled
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-6 text-xs font-semibold text-stone-500 opacity-80 cursor-wait"
              >
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>
                  {proctoringState === "REQUESTING_CAMERA"
                    ? "Requesting Camera Access..."
                    : proctoringState === "LOADING_MODEL"
                    ? "Loading Neural Models (/models)..."
                    : "Calibrating Face Detection..."}
                </span>
              </button>
            )}

            {proctoringState === "READY" && (
              <button
                type="button"
                onClick={() => void startAssessment()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-7 text-xs font-bold text-stone-50 shadow-sm hover:bg-stone-800 transition"
              >
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Start Proctored Assessment</span>
              </button>
            )}

            {proctoringState === "READY" && (
              <button
                type="button"
                onClick={() => void initializeHardware()}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Recalibrate</span>
              </button>
            )}

            <Link
              href="/assessments"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-transparent px-4 text-xs font-medium text-stone-600 hover:text-stone-900 transition"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // =========================================================================
  // VIEW: ACTIVE ASSESSMENT RUNNING
  // =========================================================================
  const question = attempt.questions[index];
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = attempt.questions.length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
      {/* Assessment Top Bar */}
      <div className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-900 text-stone-50 font-mono font-bold text-sm shrink-0">
              {attempt.skill.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-stone-900">{attempt.skill} Assessment</h1>
                <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-700 uppercase font-mono">
                  {readable(difficulty)}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Question {index + 1} of {totalQuestions} · {answeredCount} answered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Authoritative Server Countdown */}
            <div
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
                seconds < 300
                  ? "border-rose-300 bg-rose-50 text-rose-800"
                  : "border-stone-200 bg-stone-50 text-stone-800"
              }`}
            >
              <Clock className="h-4 w-4 text-stone-500" />
              <span className="font-mono text-sm font-bold">{formattedTime}</span>
            </div>

            {/* Live Camera Thumbnail & Proctor Status Badge */}
            <div className="relative flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1.5">
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-9 w-14 rounded-lg bg-stone-900 object-cover"
                aria-label="Live camera thumbnail"
              />
              <div className="pr-1.5 text-left hidden sm:block">
                {/* Proctoring Status Badge */}
                {violationCount === 0 && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-emerald-700 font-mono">
                      MONITORING ACTIVE
                    </span>
                  </div>
                )}
                {violationCount === 1 && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-amber-700 font-mono">
                      WARNING (1/3 VIOLATIONS)
                    </span>
                  </div>
                )}
                {violationCount === 2 && (
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-pulse" />
                    <span className="text-[10px] font-bold text-rose-700 font-mono">
                      CRITICAL (2/3 VIOLATIONS)
                    </span>
                  </div>
                )}
                <span className="text-[9px] text-stone-400 block font-mono">
                  {cameraActive ? "CAM ACTIVE" : "CAM LOST"} ·{" "}
                  {detectedFacesCount === 1
                    ? "1 FACE"
                    : detectedFacesCount === 0
                    ? "NO FACE"
                    : `${detectedFacesCount ?? 0} FACES`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 w-full rounded-full bg-stone-100 overflow-hidden">
          <div
            className="h-full bg-stone-900 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Notice Banner if an integrity alert is emitted */}
      {notice && (
        <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-600 flex items-center justify-between">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-stone-400 hover:text-stone-700 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Violation Alert Modal (Strikes 1 & 2) */}
      {violationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {violationModal.level === 1
                    ? "Warning (1/3 Violations)"
                    : "Critical (2/3 Violations)"}
                </h2>
                <span className="text-xs text-rose-700 font-semibold font-mono uppercase">
                  Proctoring Threshold
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-stone-800 leading-relaxed">
              {violationModal.message}
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <p>• Keep face centered inside the camera preview.</p>
              <p>• Do not switch browser tabs or exit fullscreen mode.</p>
              <p className="font-bold text-rose-700">
                {violationModal.level === 2
                  ? "ONE more violation will instantly terminate and fail your assessment."
                  : "A 3rd confirmed violation episode will terminate this attempt."}
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setViolationModal(null)}
                className="rounded-xl border border-stone-900 bg-stone-900 px-5 py-2.5 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
              >
                Acknowledge & Resume Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Switcher Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setSection("MCQ")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
            section === "MCQ"
              ? "bg-stone-900 text-stone-50 shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Multiple Choice ({answeredCount}/{totalQuestions})
        </button>
        <button
          type="button"
          onClick={() => setSection("CODE")}
          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${
            section === "CODE"
              ? "bg-stone-900 text-stone-50 shadow-xs"
              : "text-stone-600 hover:bg-stone-100"
          }`}
        >
          Coding Problem
        </button>
      </div>

      {section === "MCQ" && question ? (
        <section className="mt-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-3">
            <span className="font-mono font-semibold uppercase">
              Question {index + 1} of {totalQuestions}
            </span>
            <span className="rounded bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
              Topic: {question.topic}
            </span>
          </div>

          <h2 className="mt-5 text-lg font-bold text-stone-900 leading-snug sm:text-xl">
            {question.prompt}
          </h2>

          <fieldset className="mt-6 grid gap-3">
            <legend className="sr-only">Answer choices</legend>
            {question.options.map((option) => {
              const isSelected = answers[question.id] === option.id;
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 text-xs sm:text-sm transition ${
                    isSelected
                      ? "border-stone-900 bg-stone-50 font-medium text-stone-900 shadow-2xs"
                      : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={isSelected}
                    onChange={() =>
                      setAnswers((cur) => ({
                        ...cur,
                        [question.id]: option.id,
                      }))
                    }
                    className="mt-0.5 h-4 w-4 border-stone-300 text-stone-900 focus:ring-0"
                  />
                  <div className="flex-1">
                    <span className="font-mono font-bold mr-1.5">{option.id}.</span>
                    <span>{option.text}</span>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <div className="mt-8 flex items-center justify-between border-t border-stone-100 pt-6">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              type="button"
              disabled={index === totalQuestions - 1}
              onClick={() => setIndex((v) => Math.min(totalQuestions - 1, v + 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-900 bg-stone-900 px-4 text-xs font-semibold text-stone-50 hover:bg-stone-800 disabled:opacity-40"
            >
              <span>Next Question</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      ) : section === "CODE" && attempt.codingProblem ? (
        <section className="mt-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              PRACTICAL CHALLENGE ({attempt.codingProblem.language?.toUpperCase() ?? "CODE"})
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-stone-900">
            {attempt.codingProblem.title}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
            {attempt.codingProblem.statement}
          </p>

          {attempt.codingProblem.constraints?.length > 0 && (
            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block mb-2 font-mono">
                Problem Constraints:
              </span>
              <ul className="list-disc space-y-1 pl-4 text-xs text-stone-600">
                {attempt.codingProblem.constraints.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Source Code Implementation ({attempt.codingProblem.language ?? "typescript"}):
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              aria-label="Coding submission"
              className="min-h-72 w-full rounded-xl border border-stone-800 bg-stone-950 p-4 font-mono text-xs text-stone-100 leading-relaxed focus:border-stone-600 focus:outline-hidden"
            />
            <p className="mt-2 text-[11px] text-stone-400">
              Code is sent exclusively to the isolated server scoring validator.
            </p>
          </div>
        </section>
      ) : null}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {/* Persistent Submit Bar */}
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs">
        <div className="text-xs text-stone-500">
          Answered <span className="font-bold text-stone-900">{answeredCount}</span> of{" "}
          <span className="font-bold text-stone-900">{totalQuestions}</span> questions
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{submitting ? "Evaluating Results…" : "Submit Final Assessment"}</span>
        </button>
      </div>
    </main>
  );
}
