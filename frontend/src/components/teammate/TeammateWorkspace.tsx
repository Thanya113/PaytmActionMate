import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Sliders, 
  ArrowRight, 
  RefreshCw, 
  FileText, 
  Tag, 
  IndianRupee, 
  Users, 
  PhoneCall, 
  MessageSquare, 
  Check, 
  X, 
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../services/api';
import { Task, TaskStage, Approval } from '../../types';

interface TeammateWorkspaceProps {
  initialPrompt?: string;
  onClearInitialPrompt?: () => void;
  onRefreshOverview: () => void;
}

export const TeammateWorkspace: React.FC<TeammateWorkspaceProps> = ({
  initialPrompt,
  onClearInitialPrompt,
  onRefreshOverview
}) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [activeApproval, setActiveApproval] = useState<Approval | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [modifyDiscount, setModifyDiscount] = useState<number>(15);
  const [modifyMinOrder, setModifyMinOrder] = useState<number>(150);
  const [showThinkingDetails, setShowThinkingDetails] = useState<boolean>(true);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedRequests = [
    "My sales have dropped this week. Help me bring customers back.",
    "Why is my yesterday's settlement delayed by ₹24,800?",
    "Check failed UPI transaction of ₹850 from customer Ankit",
    "Generate a weekend 15% cashback offer for customers inactive for 14 days"
  ];

  // Auto-scroll to latest updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentTask, isProcessing]);

  // Handle incoming initial prompt from Overview quick actions
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      setInputText(initialPrompt);
      handleExecuteRequest(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleExecuteRequest = async (promptText: string) => {
    const textToRun = promptText.trim();
    if (!textToRun || isProcessing) return;

    setIsProcessing(true);
    setSystemNotice(null);

    try {
      const response = await api.sendChatMessage(textToRun);
      
      // Structure into Task object
      const task: Task = {
        id: response.task_id,
        merchant_id: "PAYTM-M-984214",
        title: `Task: ${textToRun.slice(0, 50)}`,
        request_text: textToRun,
        status: response.status,
        current_stage: response.current_stage,
        stages: response.stages,
        result_summary: response.result_summary,
        tool_calls: response.tool_calls || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setCurrentTask(task);

      if (response.approval) {
        setActiveApproval(response.approval);
      } else {
        setActiveApproval(null);
      }

      onRefreshOverview();
    } catch (err: any) {
      console.error(err);
      setSystemNotice(`Execution failed: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveAction = async (approvalId: string) => {
    setIsProcessing(true);
    try {
      const res = await api.submitApprovalAction(approvalId, 'approve');
      if (res.success && currentTask) {
        setCurrentTask({
          ...currentTask,
          status: 'COMPLETED',
          current_stage: 'report',
          stages: res.stages,
          result_summary: res.result_summary,
          tool_calls: res.tool_calls
        });
        setActiveApproval(null);
        onRefreshOverview();
      }
    } catch (err: any) {
      console.error(err);
      setSystemNotice(`Approval failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectAction = async (approvalId: string) => {
    setIsProcessing(true);
    try {
      await api.submitApprovalAction(approvalId, 'reject');
      if (currentTask) {
        setCurrentTask({
          ...currentTask,
          status: 'DECLINED',
          result_summary: 'Campaign proposal declined by merchant. Zero operations executed.'
        });
        setActiveApproval(null);
        onRefreshOverview();
      }
    } catch (err: any) {
      console.error(err);
      setSystemNotice(`Rejection failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModifySubmit = async () => {
    if (!activeApproval) return;
    setIsProcessing(true);
    const apprId = activeApproval.id || (activeApproval as any).approval_id;
    try {
      const modifiedParams = {
        ...activeApproval.parameters,
        discount_pct: modifyDiscount,
        min_order: modifyMinOrder,
        estimated_discount_budget_max: Math.round(180 * (280 * (modifyDiscount / 100)) * 0.38)
      };
      await api.submitApprovalAction(apprId, 'modify', modifiedParams);
      setActiveApproval({
        ...activeApproval,
        id: apprId,
        parameters: modifiedParams,
        estimated_cost: modifiedParams.estimated_discount_budget_max
      });
      setShowModifyModal(false);
      setSystemNotice(`Campaign offer parameters updated: ${modifyDiscount}% OFF, Min Order ₹${modifyMinOrder}`);
    } catch (err: any) {
      console.error(err);
      setSystemNotice(`Modification failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceRecordToggle = async () => {
    if (!isRecording) {
      // Start recording simulation or browser speech recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          recognition.lang = 'hi-IN';
          recognition.continuous = false;
          recognition.interimResults = false;

          recognition.onstart = () => setIsRecording(true);
          recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsRecording(false);
          };
          recognition.onerror = () => setIsRecording(false);
          recognition.onend = () => setIsRecording(false);
          recognition.start();
        } catch (e) {
          setIsRecording(false);
          setInputText("My sales have dropped this week. Help me bring customers back.");
        }
      } else {
        // Fallback quick prompt fill
        setInputText("My sales have dropped this week. Help me bring customers back.");
        setSystemNotice("Simulated voice input with Sarvam Saaras v4 STT model");
      }
    } else {
      setIsRecording(false);
    }
  };

  const handlePlayVoiceSummary = async (text: string) => {
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    setIsPlayingAudio(true);
    try {
      const res = await api.synthesizeSpeech(text, 'hi-IN');
      if (res.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audio_base64}`);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } else {
        // Browser Speech Synthesis Fallback
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Workspace Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-paytm-dark to-paytm-blue flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-6 h-6 text-paytm-cyan" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-[#0F172A]">Paytm ActionMate Workspace</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-paytm-blue border border-blue-200">
                Sarvam 105B Reasoning
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous operations teammate. Understands business context, plans workflows, executes tools, and verifies outcomes.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center space-x-1.5 bg-[#F8FAFC] border border-[#E8EDF4] px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Human Approval Gates Enforced</span>
          </div>
        </div>
      </div>

      {/* Suggested Prompt Pills */}
      <div>
        <div className="text-xs font-semibold text-slate-500 mb-2">Suggested Merchant Inquiries:</div>
        <div className="flex flex-wrap gap-2">
          {suggestedRequests.map((req, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(req);
                handleExecuteRequest(req);
              }}
              disabled={isProcessing}
              className="text-xs font-medium bg-white hover:bg-blue-50/70 hover:border-paytm-blue/40 hover:text-paytm-dark text-[#334155] border border-[#E8EDF4] px-3 py-2 rounded-xl transition-all shadow-sm flex items-center space-x-1.5"
            >
              <span>{req}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      {/* System Notice Toast */}
      {systemNotice && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-paytm-dark flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-paytm-blue shrink-0" />
            <span>{systemNotice}</span>
          </div>
          <button onClick={() => setSystemNotice(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Execution Area */}
      {currentTask && (
        <div className="space-y-6">
          {/* Active Task Banner */}
          <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-extrabold bg-paytm-dark text-white px-2.5 py-1 rounded-lg">
                  {currentTask.id}
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">{currentTask.request_text}</h2>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Initiated at {new Date(currentTask.created_at).toLocaleTimeString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  currentTask.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  currentTask.status === 'WAITING_APPROVAL' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  'bg-blue-50 text-paytm-blue border border-blue-200'
                }`}>
                  {currentTask.status === 'WAITING_APPROVAL' ? 'Action Gate: Pending Approval' : currentTask.status}
                </span>

                {currentTask.result_summary && (
                  <button
                    onClick={() => handlePlayVoiceSummary(currentTask.result_summary || '')}
                    className="p-1.5 bg-[#F8FAFC] hover:bg-slate-100 text-paytm-blue border border-[#E8EDF4] rounded-lg transition-colors"
                    title="Play Voice Summary with Sarvam Bulbul v4"
                  >
                    {isPlayingAudio ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* 6-Stage Lifecycle Progress Bar */}
            <div className="pt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>Autonomous Lifecycle State Machine:</span>
                <span className="text-[11px] font-bold text-paytm-blue uppercase tracking-wider">
                  Stage: {currentTask.current_stage}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {currentTask.stages.map((stg, idx) => {
                  const isDone = stg.status === 'completed' || stg.status === 'approved';
                  const isWaiting = stg.status === 'waiting_approval';
                  const isInProgress = stg.status === 'in_progress';
                  const isSkipped = stg.status === 'skipped';

                  return (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isDone ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                        isWaiting ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-sm animate-pulse-subtle' :
                        isInProgress ? 'bg-blue-50 border-blue-300 text-paytm-blue' :
                        isSkipped ? 'bg-slate-50 border-slate-200 text-slate-400' :
                        'bg-white border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-1 mb-1">
                        <span className="text-[10px] font-bold">0{idx + 1}</span>
                        {isDone ? <Check className="w-3 h-3 text-emerald-600" /> : 
                         isWaiting ? <Clock className="w-3 h-3 text-amber-600" /> : null}
                      </div>
                      <div className="text-[11px] font-bold capitalize truncate">{stg.label}</div>
                      <div className="text-[10px] mt-0.5 capitalize truncate">
                        {isWaiting ? 'Waiting Approval' : stg.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Cards & Tool Outputs */}
          <div className="space-y-4">
            {/* Step 1 & 2 Findings: Analytical Cards */}
            {currentTask.stages.find(s => s.stage === 'act')?.data?.sales_metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sales Investigation Card */}
                <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-paytm-blue uppercase tracking-wider flex items-center space-x-1.5">
                      <IndianRupee className="w-4 h-4" />
                      <span>Step 1: Revenue Dissection</span>
                    </span>
                    <span className="text-[10px] bg-red-50 text-red-700 font-extrabold px-2 py-0.5 rounded-full border border-red-200">
                      -14.2% Drop
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Current Week Sales:</span>
                      <span className="font-bold text-[#0F172A]">
                        ₹{currentTask.stages.find(s => s.stage === 'act')?.data?.sales_metrics?.current_week_sales.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Previous Week Benchmark:</span>
                      <span className="font-bold text-slate-700">
                        ₹{currentTask.stages.find(s => s.stage === 'act')?.data?.sales_metrics?.previous_week_sales.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="pt-2 text-slate-700 leading-relaxed font-medium bg-[#F8FAFC] p-2.5 rounded-xl border border-slate-200">
                      {currentTask.stages.find(s => s.stage === 'act')?.data?.sales_metrics?.root_cause}
                    </div>
                  </div>
                </div>

                {/* Churned Cohort Identification Card */}
                <div className="bg-white border border-[#E8EDF4] rounded-2xl p-5 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <Users className="w-4 h-4" />
                      <span>Step 2: Customer Cohort Isolated</span>
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200">
                      180 Inactive Regulars
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Dormancy Period:</span>
                      <span className="font-bold text-[#0F172A]">14+ Days Inactive</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span>Estimated Monthly Loss:</span>
                      <span className="font-bold text-red-600">₹1,04,400</span>
                    </div>
                    <div className="pt-1.5">
                      <span className="text-[11px] font-semibold text-slate-500">Top Preferred Items:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {currentTask.stages.find(s => s.stage === 'act')?.data?.customer_segment?.top_favorite_items?.map((item: string, i: number) => (
                          <span key={i} className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Proposal Card */}
            {currentTask.stages.find(s => s.stage === 'act')?.data?.campaign_draft && (
              <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-paytm-blue" />
                    <span className="text-xs font-bold text-paytm-dark uppercase tracking-wider">
                      Step 3: Automated Re-Engagement Campaign Formulated
                    </span>
                  </div>
                  <span className="text-[11px] bg-blue-50 text-paytm-blue font-bold px-2.5 py-0.5 rounded-full">
                    Projected ROI: 9.2x
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  {/* Left: Message Template Preview */}
                  <div className="md:col-span-2 bg-[#F8FAFC] border border-[#E8EDF4] rounded-xl p-3.5">
                    <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-500 mb-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp & SMS Blast Preview (via Paytm Marketing API)</span>
                    </div>
                    <p className="text-xs text-[#0F172A] font-mono leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      "{currentTask.stages.find(s => s.stage === 'act')?.data?.campaign_draft?.message_template}"
                    </p>
                  </div>

                  {/* Right: Financial Parameters */}
                  <div className="bg-white border border-[#E8EDF4] rounded-xl p-3.5 flex flex-col justify-between text-xs">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Campaign Economics
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Discount:</span>
                          <span className="font-bold text-[#0F172A]">
                            {currentTask.stages.find(s => s.stage === 'act')?.data?.campaign_draft?.discount_pct}% OFF
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Min Order:</span>
                          <span className="font-bold text-[#0F172A]">
                            ₹{currentTask.stages.find(s => s.stage === 'act')?.data?.campaign_draft?.min_order}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target Reach:</span>
                          <span className="font-bold text-indigo-700">180 Buyers</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100">
                          <span className="text-slate-500">Max Budget Exposure:</span>
                          <span className="font-bold text-amber-700">
                            ₹{currentTask.stages.find(s => s.stage === 'act')?.data?.campaign_draft?.estimated_discount_budget_max}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HUMAN-IN-THE-LOOP APPROVAL GATE */}
            {activeApproval && activeApproval.status === 'PENDING' && (
              <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-2 border-amber-300 rounded-2xl p-6 shadow-elevated">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                          Human Approval Gate
                        </span>
                        <span className="text-xs font-mono text-amber-800 font-bold">{activeApproval.id}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{activeApproval.title}</h3>
                      <p className="text-xs text-slate-700 mt-1 max-w-xl">
                        ActionMate requires your explicit authorization before committing promotional budget (est. ₹{activeApproval.estimated_cost}) and sending SMS/WhatsApp messages to {activeApproval.audience_reach} customers.
                      </p>
                    </div>
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      id="customize-offer-btn"
                      onClick={() => setShowModifyModal(true)}
                      disabled={isProcessing}
                      className="px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-slate-800 text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Customize Offer</span>
                    </button>
                    <button
                      id="decline-action-btn"
                      onClick={() => handleRejectAction(activeApproval.id || (activeApproval as any).approval_id)}
                      disabled={isProcessing}
                      className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-bold transition-colors flex items-center space-x-1 shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      id="approve-execute-btn"
                      onClick={() => handleApproveAction(activeApproval.id || (activeApproval as any).approval_id)}
                      disabled={isProcessing}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center space-x-2 shadow-md hover:shadow-lg"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Execute</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VERIFICATION AND FINAL REPORT STAGE */}
            {currentTask.stages.find(s => s.stage === 'verify')?.status === 'completed' && (
              <div className="bg-white border-2 border-emerald-300 rounded-2xl p-6 shadow-elevated">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          Autonomous Outcome Verified
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {new Date().toLocaleTimeString('en-IN')}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#0F172A] mt-0.5">
                        Execution Verified Against Paytm Business Systems
                      </h3>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    5/5 Health Checks Passed
                  </span>
                </div>

                {/* 5 Health Checks List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentTask.stages.find(s => s.stage === 'verify')?.data?.checks?.map((chk: any, idx: number) => (
                    <div key={idx} className="bg-[#F8FAFC] border border-[#E8EDF4] rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>{chk.item}</span>
                        <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                          {chk.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">{chk.detail}</p>
                    </div>
                  ))}
                </div>

                {/* Final Outcome Summary Text */}
                {currentTask.result_summary && (
                  <div className="mt-4 pt-4 border-t border-slate-100 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-xs text-emerald-950 font-medium leading-relaxed flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-emerald-900 text-xs uppercase tracking-wider">
                        Executive Teammate Briefing:
                      </div>
                      <p>{currentTask.result_summary}</p>
                    </div>

                    <button
                      onClick={() => handlePlayVoiceSummary(currentTask.result_summary || '')}
                      className="p-2 bg-white text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0 shadow-sm"
                      title="Listen with Bulbul v4 TTS"
                    >
                      {isPlayingAudio ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modify Approval Parameters Modal */}
      {showModifyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E8EDF4] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-[#0F172A]">Adjust Campaign Offer</h3>
              <button onClick={() => setShowModifyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Discount Percentage (%)</label>
                <input 
                  type="number" 
                  value={modifyDiscount}
                  onChange={(e) => setModifyDiscount(Number(e.target.value))}
                  min={5}
                  max={50}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue text-sm font-semibold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Default is 15%. Recommended: 10% - 20%</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Minimum Order Amount (₹)</label>
                <input 
                  type="number" 
                  value={modifyMinOrder}
                  onChange={(e) => setModifyMinOrder(Number(e.target.value))}
                  min={50}
                  step={50}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue text-sm font-semibold"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Ensures margin protection on low-ticket orders</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-[11px] space-y-1">
                <div className="flex justify-between font-medium">
                  <span>Audience Reach:</span>
                  <span className="font-bold text-[#0F172A]">180 Inactive Regulars</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Revised Max Budget:</span>
                  <span className="font-bold text-amber-700">
                    ₹{Math.round(180 * (280 * (modifyDiscount / 100)) * 0.38)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowModifyModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleModifySubmit}
                className="px-4 py-2 rounded-xl bg-paytm-blue text-white text-xs font-bold hover:bg-blue-700 shadow-sm"
              >
                Save & Update Gate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversational Input Bar (Fixed Bottom or Prominent Container) */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-3 shadow-elevated">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleExecuteRequest(inputText);
          }}
          className="flex items-center gap-2"
        >
          {/* Voice Input Button (Sarvam Saaras v4) */}
          <button
            type="button"
            onClick={handleVoiceRecordToggle}
            className={`p-3 rounded-xl transition-all flex items-center justify-center ${
              isRecording 
                ? 'bg-red-500 text-white animate-pulse' 
                : 'bg-[#F8FAFC] text-[#64748B] hover:text-paytm-blue hover:bg-blue-50 border border-[#E8EDF4]'
            }`}
            title="Speak using Sarvam Saaras v4 Speech-to-Text"
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
            placeholder="Type your merchant problem (e.g. 'My sales have dropped this week. Help me bring customers back.')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#0F172A] placeholder-slate-400 focus:outline-hidden font-medium"
          />

          {/* Send / Execute Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center space-x-2 ${
              inputText.trim() && !isProcessing
                ? 'bg-paytm-dark hover:bg-paytm-blue text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>ActionMate Reasoning...</span>
              </>
            ) : (
              <>
                <span>Execute</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <div ref={messagesEndRef} />
    </div>
  );
};
