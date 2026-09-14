"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Award,
  ExternalLink,
  Code2
} from "lucide-react";
import { StatusBadge, RiskBadge } from "@/components/ui-shared";

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
  startedAt: string;
  expiresAt: string;
  notice?: string;
};
type Result = {
  mcq: { correct: number; total: number; percentage: number };
  coding: { status: string; score?: number; message?: string };
  integrity: { score: number; riskLevel: string; eventCount: number };
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
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(
    {},
  );
  const [code, setCode] = useState("");
  const [index, setIndex] = useState(0);
  const [section, setSection] = useState<"MCQ" | "CODE">("MCQ");
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [terminated, setTerminated] = useState(false);
  const [violationModal, setViolationModal] = useState<{
    level: number;
    count: number;
    status: string;
    message: string;
  } | null>(null);
  const [camera, setCamera] = useState(false);
  const [microphone, setMicrophone] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const eventTimes = useRef<Record<string, number>>({});
  const attemptRef = useRef<string | null>(null);
  const lastFaceDetectionTime = useRef<number>(0);
  const consecutiveMultipleFaces = useRef<number>(0);

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  async function signal(
    type: string,
    severity: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM",
  ) {
    const id = attemptRef.current;
    if (!id || result || terminated) return;
    const now = Date.now();
    if (now - (eventTimes.current[type] ?? 0) < 1500) return;
    eventTimes.current[type] = now;
    try {
      const response = await fetch("/api/assessment/integrity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: id,
          events: [{ type, severity, timestamp: new Date().toISOString() }],
        }),
      });
      const body = await response.json();
      if (response.ok && body.integrity) {
        if (body.integrity.terminated) {
          setTerminated(true);
          stopMedia();
          if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => undefined);
          }
          return;
        }
        if (body.integrity.violationLevel > 0) {
          setViolationModal({
            level: body.integrity.violationLevel,
            count: body.integrity.violationCount,
            status: body.integrity.status,
            message: body.integrity.warningMessage,
          });
        }
        setNotice(
          `Integrity signal recorded. Current risk: ${readable(body.integrity.riskLevel)}.`,
        );
      }
    } catch {
      setNotice(
        "An integrity signal could not be synced. Continue the assessment and check your connection.",
      );
    }
  }
  async function start() {
    setStarting(true);
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "This browser does not support camera and microphone permissions.",
        );
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      setCamera(
        stream.getVideoTracks().some((track) => track.readyState === "live"),
      );
      setMicrophone(
        stream.getAudioTracks().some((track) => track.readyState === "live"),
      );
      const response = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill, difficulty, consent: true }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Unable to start assessment.");
      const newAttempt = body.attempt as Attempt;
      attemptRef.current = newAttempt.id;
      setAttempt(newAttempt);
      setCode(newAttempt.codingProblem.starterCode);
      setSeconds(
        Math.max(
          0,
          Math.floor(
            (new Date(newAttempt.expiresAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          setCamera(false);
          void signal("CAMERA_DISABLED", "HIGH");
        };
      });
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          setMicrophone(false);
          void signal("MICROPHONE_DISABLED", "HIGH");
        };
      });
      await document.documentElement
        .requestFullscreen?.()
        .catch(() => undefined);
    } catch (error) {
      stopMedia();
      setError(
        error instanceof Error
          ? error.message
          : "Camera and microphone permission are required.",
      );
    } finally {
      setStarting(false);
    }
  }
  async function submit(timeout = false) {
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
      if (!response.ok)
        throw new Error(body.error?.message ?? "Unable to submit assessment.");
      setResult(body.result);
      stopMedia();
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => undefined);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to submit assessment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    async function loadModels() {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face detection models", err);
      }
    }
    void loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded || !attempt || result || !videoRef.current) return;
    let animationFrame: number;
    let active = true;

    async function detect() {
      if (!active || !videoRef.current) return;
      if (videoRef.current.readyState === 4) {
        try {
          const faces = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions(),
          );
          const now = Date.now();
          if (faces.length === 0) {
            if (now - lastFaceDetectionTime.current > 3000) {
              void signal("NO_FACE_DETECTED", "MEDIUM");
              lastFaceDetectionTime.current = now - 1500;
            }
          } else {
            lastFaceDetectionTime.current = now;
            if (faces.length > 1) {
              consecutiveMultipleFaces.current += 1;
              if (consecutiveMultipleFaces.current > 10) {
                void signal("MULTIPLE_FACES_DETECTED", "HIGH");
                consecutiveMultipleFaces.current = 0;
              }
            } else {
              consecutiveMultipleFaces.current = 0;
            }
          }
        } catch {
          // ignore detection errors
        }
      }
      if (active) {
        setTimeout(() => {
          if (active) animationFrame = requestAnimationFrame(detect);
        }, 250);
      }
    }

    lastFaceDetectionTime.current = Date.now();
    animationFrame = requestAnimationFrame(detect);

    return () => {
      active = false;
      cancelAnimationFrame(animationFrame);
    };
  }, [modelsLoaded, attempt, result]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!attempt || result) return;
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(attempt.expiresAt).getTime() - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (remaining === 0) void submit(true);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!attempt || result) return;
    const visibility = () => {
      if (document.visibilityState === "hidden")
        void signal("TAB_HIDDEN", "HIGH");
    };
    const blur = () => void signal("WINDOW_BLUR");
    const focus = () => void signal("WINDOW_FOCUS", "LOW");
    const fullscreen = () => {
      if (!document.fullscreenElement) void signal("FULLSCREEN_EXIT");
    };
    const copy = () => void signal("COPY_ATTEMPT", "LOW");
    const paste = () => void signal("PASTE_ATTEMPT", "LOW");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("fullscreenchange", fullscreen);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("fullscreenchange", fullscreen);
      document.removeEventListener("copy", copy);
      document.removeEventListener("paste", paste);
    };
  }, [attempt, result]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stopMedia(), []);
  const time = useMemo(
    () =>
      `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`,
    [seconds],
  );
  if (terminated)
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-rose-950 sm:text-3xl">
          Assessment Session Terminated
        </h1>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-rose-700 font-mono">
          Integrity Threshold Exceeded (3 of 3 Confirmed Episodes)
        </p>
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-left text-xs leading-relaxed text-rose-900 space-y-2.5">
          <p>
            The proctoring system confirmed 3 separate integrity violation episodes (such as window blur, leaving camera frame, or camera disconnection) during this timed session.
          </p>
          <p>
            Under PRAMAAN&apos;s strict proctoring guidelines, this assessment attempt has been locked and permanently recorded as unverified on the server.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex h-11 items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
        >
          Return to Candidate Dashboard
        </Link>
      </main>
    );

  if (result)
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
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">Final Score</span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">{result.finalScore}%</span>
              <span className="text-[11px] text-stone-500">Benchmark composite</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">MCQ Accuracy</span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">
                {result.mcq.correct} / {result.mcq.total}
              </span>
              <span className="text-[11px] text-stone-500">Concept verification</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">Integrity Score</span>
              <span className="mt-1 text-2xl font-bold text-stone-900 block">
                {result.integrity.score} / 100
              </span>
              <span className="text-[11px] text-stone-500">Proctoring rating</span>
            </div>

            <div className="rounded-xl bg-stone-50/70 p-4 border border-stone-100">
              <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">Proctor Risk</span>
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

  if (!attempt)
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
            <span>PRE-FLIGHT CONSENT</span>
            <span className="text-stone-300">·</span>
            <span>{readable(difficulty)} LEVEL</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Prepare for {skill}
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-stone-600">
            PRAMAAN utilizes on-device AI face presence detection and tab visibility tracking to verify candidate integrity.
            Zero raw audio or video recordings are saved or transmitted to servers.
          </p>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/60 p-5 space-y-3 text-xs text-stone-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">Evaluation Timer</span>
              <span className="font-mono">28 minutes (Server-enforced)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">Format</span>
              <span>5 Technical MCQs + 1 Coding Sandbox Problem</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">Proctoring Mode</span>
              <span>Local browser focus & on-device presence</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900">Strike Limit</span>
              <span className="text-rose-700 font-semibold">3 violations = instant termination</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={starting || !modelsLoaded}
              onClick={() => void start()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {!modelsLoaded
                  ? "Loading Proctoring Engine..."
                  : starting
                  ? "Initializing Devices..."
                  : "Allow Permissions & Start"}
              </span>
            </button>
            <Link
              href="/assessments"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 bg-white px-5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
            >
              Cancel
            </Link>
          </div>
        </div>
      </main>
    );

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
            {/* Timer */}
            <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 ${
              seconds < 300 
                ? "border-rose-300 bg-rose-50 text-rose-800" 
                : "border-stone-200 bg-stone-50 text-stone-800"
            }`}>
              <Clock className="h-4 w-4 text-stone-500" />
              <span className="font-mono text-sm font-bold">{time}</span>
            </div>

            {/* Live Camera Thumbnail */}
            <div className="relative flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 p-1.5">
              <video
                ref={videoRef}
                muted
                playsInline
                className="h-9 w-14 rounded-lg bg-stone-900 object-cover"
                aria-label="Live camera preview"
              />
              <div className="pr-1.5 text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-stone-700 font-mono">PROCTORED</span>
                </div>
                <span className="text-[9px] text-stone-400 block font-mono">
                  {camera ? "CAM OK" : "CAM LOST"} · {microphone ? "MIC OK" : "MIC LOST"}
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

      {/* Violation Alert Modal */}
      {violationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-rose-500 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-base font-bold text-stone-900">
                  {violationModal.level === 1 ? "Integrity Warning (1 of 3)" : "FINAL Warning (2 of 3)"}
                </h2>
                <span className="text-xs text-rose-700 font-semibold font-mono uppercase">
                  Session Proctored
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs font-medium text-stone-800 leading-relaxed">
              {violationModal.message}
            </p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              <p>• Keep face centered inside the camera view.</p>
              <p>• Do not switch tabs or open external windows.</p>
              <p className="font-bold text-rose-700">
                A 3rd confirmed violation episode will instantly terminate this attempt.
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

      {section === "MCQ" ? (
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
              disabled={index === 0}
              onClick={() => setIndex((v) => Math.max(0, v - 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-40"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={index === totalQuestions - 1}
              onClick={() => setIndex((v) => Math.min(totalQuestions - 1, v + 1))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-900 bg-stone-900 px-4 text-xs font-semibold text-stone-50 hover:bg-stone-800 disabled:opacity-40"
            >
              <span>Next Question</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              PRACTICAL CHALLENGE ({attempt.codingProblem.language.toUpperCase()})
            </span>
          </div>

          <h2 className="mt-4 text-xl font-bold text-stone-900">
            {attempt.codingProblem.title}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
            {attempt.codingProblem.statement}
          </p>

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

          <div className="mt-6">
            <label className="text-xs font-semibold text-stone-700 block mb-1.5">
              Source Code Implementation ({attempt.codingProblem.language}):
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
      )}

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
