import React, { useState } from 'react';
import {
  Send,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  FileCheck2,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  Keyboard,
  Mic,
  Volume2,
} from 'lucide-react';
import { InterviewSession, QuestionItem, AudioAnalysisResponse } from '../types';
import { AudioRecorder } from '../components/AudioRecorder';

interface WorkspacePageProps {
  session: InterviewSession;
  onUpdateAnswer: (index: number, answer: string) => void;
  onUpdateAudioDetails: (
    index: number,
    audioBlob: Blob,
    analysis: AudioAnalysisResponse | null,
    isEdited: boolean,
    originalTranscript: string
  ) => void;
  onUpdateMode: (index: number, mode: 'text' | 'audio') => void;
  onSubmitAnswer: (index: number) => Promise<void>;
  onNavigateQuestion: (index: number) => void;
  onViewReport: (index: number) => void;
  onFinishSession: () => void;
  isAssessing: boolean;
  errorMessage: string | null;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  session,
  onUpdateAnswer,
  onUpdateAudioDetails,
  onUpdateMode,
  onSubmitAnswer,
  onNavigateQuestion,
  onViewReport,
  onFinishSession,
  isAssessing,
  errorMessage,
}) => {
  const currentIndex = session.currentQuestionIndex;
  const currentRecord = session.records[currentIndex];
  const question: QuestionItem = currentRecord.question;
  const answer = currentRecord.answer;
  const assessment = currentRecord.assessment;
  const currentMode = currentRecord.mode || 'text';

  const [showConcepts, setShowConcepts] = useState<boolean>(false);

  // Sample answers for instant review demonstrations
  const sampleAnswers: Record<string, { strong: string; partial: string }> = {
    se_1: {
      strong:
        "A hash map is an associative data structure that stores key-value pairs using a hash function. It maps keys to array bucket indices via modulo arithmetic, achieving average-case O(1) time complexity for lookup, insert, and delete. Collisions are resolved using separate chaining with linked lists or open addressing with probing. As elements increase, the load factor triggers dynamic resizing and rehashing.",
      partial:
        "A hash map stores key-value pairs and uses a hash function to look up items quickly without iterating through the list.",
    },
    se_2: {
      strong:
        "A process is an isolated execution environment with its own dedicated memory address space, heap, and OS resources. Threads are lightweight units of execution within a process that share memory, heap, and code while maintaining independent stacks and registers. Context switching between processes incurs high overhead, while thread switching is fast. Threads require synchronization like mutexes to prevent race conditions.",
      partial:
        "Processes are independent programs running on your system, while threads are smaller units inside a process running concurrently.",
    },
    se_3: {
      strong:
        "HTTP transfers plaintext web data over TCP port 80 without encryption, making it vulnerable to eavesdropping and tampering. HTTPS encapsulates HTTP within TLS/SSL on port 443, providing symmetric payload encryption, digital certificate authentication, and cryptographic integrity checks to prevent man-in-the-middle attacks.",
      partial:
        "HTTP sends unencrypted text while HTTPS uses SSL certificates to encrypt traffic and protect user communication.",
    },
    se_4: {
      strong:
        "Relational databases enforce structured schemas, ACID guarantees, and foreign-key relational integrity using SQL, scaling vertically. NoSQL databases prioritize horizontal scaling and partition tolerance with flexible schema models such as document, key-value, column-family, or graph databases, often following the CAP theorem and BASE model.",
      partial:
        "SQL databases use tables and schemas with ACID transactions, whereas NoSQL databases are schema-free and scale across clusters.",
    },
    se_5: {
      strong:
        "REST is an architectural style based on stateless client-server communication, standard HTTP methods (GET, POST, PUT, DELETE), uniform resource identifiers (URIs), representation formats like JSON, and explicit HTTP status codes (200, 201, 400, 404, 500) for predictable decoupled interfaces.",
      partial:
        "REST APIs use standard HTTP verbs like GET and POST to fetch and send JSON data between client and backend services.",
    },
    cs_1: {
      strong:
        "When handling an angry customer, I remain calm, patient, and actively listen without interrupting so they feel completely heard. Next, I express sincere empathy and validate their frustration with an apology for the disruption. Then, I ask clarifying questions, propose a concrete step-by-step resolution plan with realistic timelines, and follow up to verify complete satisfaction.",
      partial:
        "I listen carefully to what the customer is saying, apologize sincerely for the problem, and tell them I will resolve it quickly.",
    },
    cs_2: {
      strong:
        "When communicating an outage to a non-technical customer, I avoid internal jargon, apologize for the impact on their workflow, explain the situation using clear everyday language, provide an estimated timeline for updates, and proactively recommend temporary workarounds.",
      partial:
        "I inform the customer that our systems are experiencing technical difficulties and that our engineering team is actively working to restore service.",
    },
    cs_3: {
      strong:
        "I prioritize competing urgent customer tickets by evaluating business impact and urgency: high-severity production blockers affecting critical workflows come first, followed by urgent compliance or deadline-sensitive requests, while communicating transparent expected response times to all pending clients.",
      partial:
        "I prioritize tickets based on severity level, helping customers whose service is completely down first before routine questions.",
    },
    cs_4: {
      strong:
        "When a customer requests a feature that doesn't exist, I acknowledge the value of their use case, transparently explain that the capability is not currently available, suggest effective alternative workarounds, and document their feedback directly with our product team for roadmap consideration.",
      partial:
        "I explain that we do not currently support that feature, suggest the closest existing alternative, and log their request for our product team.",
    },
    cs_5: {
      strong:
        "If a misunderstanding occurs, I promptly take ownership without excuses, provide the accurate information clearly, explain the corrective actions taken, and offer assistance to ensure their workflow is completely unblocked.",
      partial:
        "I apologize for the misunderstanding, give the customer the correct information right away, and make sure their issue is resolved.",
    },
  };

  const handleLoadSample = (type: 'strong' | 'partial') => {
    let sampleText = '';
    const qSample = sampleAnswers[question.id];
    if (qSample && qSample[type]) {
      sampleText = qSample[type];
    } else if (type === 'strong') {
      sampleText = question.reference_answer || '';
    } else {
      if (question.reference_concepts && question.reference_concepts.length > 0) {
        sampleText = question.reference_concepts.slice(0, 2).join('. ') + '.';
      } else {
        sampleText = (question.reference_answer || '').slice(0, 140) + '...';
      }
    }

    onUpdateAnswer(currentIndex, sampleText);
    if (currentMode !== 'text') {
      onUpdateMode(currentIndex, 'text');
    }
  };

  const handleTranscriptReady = (
    transcriptionText: string,
    blob: Blob,
    analysis: AudioAnalysisResponse | null,
    isEdited: boolean,
    origTranscript: string
  ) => {
    onUpdateAnswer(currentIndex, transcriptionText);
    onUpdateAudioDetails(currentIndex, blob, analysis, isEdited, origTranscript);
  };

  const isAnswerValid = answer.trim().length >= 5;
  const isLastQuestion = currentIndex === session.records.length - 1;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-5">
      {/* Session Progress Header */}
      <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-slate-700">
                {session.roleName} Track
              </span>
              <span className="text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-mono">
                Question {currentIndex + 1} of {session.records.length}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">Interview Workspace</h2>
          </div>

          {/* Navigation Pills - Square */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {session.records.map((rec, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAssessed = rec.assessment !== null;
              return (
                <button
                  key={rec.question.id}
                  onClick={() => onNavigateQuestion(idx)}
                  className={`w-8 h-8 rounded-none flex items-center justify-center font-mono text-xs font-semibold cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-slate-900 text-white border border-slate-900 shadow-xs'
                      : hasAssessed
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                  title={`Question ${idx + 1}${hasAssessed ? ' (Assessed)' : ''}`}
                >
                  {hasAssessed ? '✓' : idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Progress Bar - Square */}
        <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden mt-4">
          <div
            className="h-full bg-slate-900 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / session.records.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-none flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div>
            <span className="font-semibold">Error:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="bg-white border border-slate-200 rounded-none p-6 relative shadow-xs">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-none bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold font-mono">
              Q{currentIndex + 1}
            </span>
            <span className="text-xs text-slate-500 font-medium uppercase font-mono">Technical Prompt</span>
          </div>

          <button
            onClick={() => setShowConcepts(!showConcepts)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer transition-colors font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{showConcepts ? 'Hide Rubric Focus' : 'View Rubric Focus'}</span>
          </button>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
          {question.question}
        </h3>

        {/* Collapsible Rubric Guidance */}
        {showConcepts && (
          <div className="mt-4 p-4 rounded-none bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              Target Evaluation Rubric Dimensions:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              {question.rubric.map((r) => (
                <li key={r.id}>
                  <strong className="text-slate-900">{r.title}:</strong> {r.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Mode Selector Tabs & Input Area */}
      <div className="bg-white border border-slate-200 rounded-none p-6 space-y-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-none border border-slate-200">
            <button
              type="button"
              onClick={() => onUpdateMode(currentIndex, 'text')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
                currentMode === 'text'
                  ? 'bg-white text-slate-900 border-slate-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Type Answer</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateMode(currentIndex, 'audio')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-none text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all border ${
                currentMode === 'audio'
                  ? 'bg-white text-slate-900 border-slate-300 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Speak Answer (Whisper + VAD)</span>
            </button>
          </div>

          {/* Quick-fill sample answers - Always accessible and interactive */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 hidden sm:inline font-mono">Demo inputs:</span>
            <button
              onClick={() => handleLoadSample('strong')}
              type="button"
              className="cursor-pointer text-xs px-2.5 py-1.5 rounded-none bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-300 transition-colors font-mono font-medium shadow-xs"
              title="Click to fill a strong complete answer"
            >
              Fill Strong Answer
            </button>
            <button
              onClick={() => handleLoadSample('partial')}
              type="button"
              className="cursor-pointer text-xs px-2.5 py-1.5 rounded-none bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 border border-slate-300 transition-colors font-mono font-medium shadow-xs"
              title="Click to fill a partial/brief answer"
            >
              Fill Partial Answer
            </button>
          </div>
        </div>

        {/* Mode A: Spoken Answer Interface */}
        {currentMode === 'audio' && (
          <AudioRecorder
            onTranscriptReady={handleTranscriptReady}
            initialTranscript={answer}
            initialAudioUrl={currentRecord.audioUrl}
            isSubmittingAssessment={isAssessing}
          />
        )}

        {/* Mode B: Typed Text Answer Interface */}
        {currentMode === 'text' && (
          <div className="space-y-2">
            <label htmlFor="answer-input" className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Typed Response
            </label>
            <textarea
              id="answer-input"
              value={answer}
              onChange={(e) => onUpdateAnswer(currentIndex, e.target.value)}
              placeholder="Type your structured answer here. Be specific and explain mechanisms, trade-offs, and examples..."
              rows={7}
              className="w-full bg-slate-50/50 border border-slate-300 focus:bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-none p-4 text-sm text-slate-900 placeholder-slate-400 resize-y leading-relaxed outline-none transition-all font-sans"
            />
          </div>
        )}

        {/* Answer Character Counter and Footnote */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
          <div>
            <span className="font-mono">{answer.length} characters</span>
            {answer.length > 0 && answer.length < 5 && (
              <span className="text-amber-700 ml-2 font-medium">Min 5 characters required</span>
            )}
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {currentMode === 'audio'
              ? 'Mode: Spoken (Whisper Tiny + VAD baseline)'
              : 'Mode: Typed Text (Sentence-BERT baseline)'}
          </div>
        </div>

        {/* Actions Row - Square buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigateQuestion(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="px-4 py-2.5 rounded-none border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            {assessment && (
              <button
                onClick={() => onViewReport(currentIndex)}
                className="px-4 py-2.5 rounded-none bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <FileCheck2 className="w-4 h-4" />
                View Assessment Report
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onSubmitAnswer(currentIndex)}
              disabled={isAssessing || !isAnswerValid}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-none bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs uppercase tracking-wider shadow-xs transition-colors"
            >
              {isAssessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Answer...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {assessment
                      ? 'Re-Assess Answer'
                      : currentMode === 'audio'
                      ? 'Submit Spoken Answer'
                      : 'Submit for Assessment'}
                  </span>
                </>
              )}
            </button>

            {assessment && !isLastQuestion && (
              <button
                onClick={() => onNavigateQuestion(currentIndex + 1)}
                className="px-4 py-2.5 rounded-none bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {assessment && isLastQuestion && (
              <button
                onClick={onFinishSession}
                className="px-4 py-2.5 rounded-none bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-colors"
              >
                <span>Finish Session</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
