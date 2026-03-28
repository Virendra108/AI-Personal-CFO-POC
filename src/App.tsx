import React, { useState, useEffect, useRef } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from "recharts";
import { 
  Wallet, TrendingUp, AlertTriangle, MessageSquare, Send, User, 
  ChevronDown, PieChart, Calendar, IndianRupee, Info, Upload,
  Target, CheckCircle, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Insight {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  surplus: number;
  upcomingFixedExpenses: { category: string; amount: number; dueDate: string }[];
  riskAlerts: string[];
  forecast: { month: string; balance: number }[];
}

interface Message {
  role: "user" | "ai";
  text: string;
}

const PERSONAS = [
  "Bhavesh (Intern/Fresher)",
  "Gokul (Salaried Bachelor)",
  "Virendra (Freelancer)",
  "Aniket (Married Professional)",
  "Pratik (Remote Worker)"
];

export default function App() {
  const [selectedPerson, setSelectedPerson] = useState(PERSONAS[0]);
  const [insights, setInsights] = useState<Insight | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hello! I am your AI Personal CFO. How can I help you with your financial decisions today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: 0, priority: 3, category: 'General' });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInsights();
  }, [selectedPerson]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchInsights = async () => {
    try {
      const res = await fetch(`/api/insights?person=${encodeURIComponent(selectedPerson)}`);
      const data = await res.json();
      if (res.ok) {
        setInsights(data);
      } else {
        console.error("API Error:", data.error);
        setInsights(null);
      }
    } catch (err) {
      console.error("Failed to fetch insights", err);
      setInsights(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, person: selectedPerson })
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: "ai", text: data.text }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", text: data.error || "Sorry, I encountered an error. Please try again." }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert("Data uploaded successfully! Refreshing insights...");
        fetchInsights();
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      alert("An error occurred during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.name || newGoal.targetAmount <= 0) return;
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person: selectedPerson, goal: newGoal })
      });
      if (res.ok) {
        setShowGoalForm(false);
        setNewGoal({ name: '', targetAmount: 0, priority: 3, category: 'General' });
        fetchInsights();
      }
    } catch (err) {
      console.error("Failed to add goal", err);
    }
  };

  if (!insights) return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Loading Financial Data...</div>;

  const currentBalance = insights.currentBalance ?? 0;
  const surplus = insights.surplus ?? 0;
  const fixedTotal = (insights.upcomingFixedExpenses ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 p-4 sticky top-0 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AI Personal CFO</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Upload className={`w-4 h-4 text-blue-500 ${uploading ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium">{uploading ? 'Uploading...' : 'Upload CSV'}</span>
            </button>

            <div className="relative group">
            <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full hover:bg-zinc-800 transition-colors">
              <User className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">{selectedPerson.split(' (')[0]}</span>
              <ChevronDown className="w-4 h-4 opacity-50" />
            </button>
            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 overflow-hidden">
              {PERSONAS.map(p => (
                <button 
                  key={p}
                  onClick={() => setSelectedPerson(p)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-800 transition-colors ${selectedPerson === p ? 'text-orange-500 bg-orange-500/5' : ''}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>

      <main className="max-w-7xl mx-auto p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Dashboard */}
        <div className="lg:col-span-7 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Current Balance</span>
                <IndianRupee className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-3xl font-bold">₹{currentBalance.toLocaleString()}</div>
              <div className="mt-2 text-xs text-zinc-500 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span>Updated just now</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Monthly Surplus</span>
                <PieChart className="w-4 h-4 text-blue-500" />
              </div>
              <div className={`text-3xl font-bold ${surplus >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ₹{surplus.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-zinc-500">Avg. Savings Potential</div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Fixed Obligations</span>
                <Calendar className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-3xl font-bold">₹{fixedTotal.toLocaleString()}</div>
              <div className="mt-2 text-xs text-zinc-500">Due this month</div>
            </motion.div>
          </div>

          {/* Risk Alerts */}
          {(insights.riskAlerts ?? []).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl flex gap-3 items-start"
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-orange-500">Proactive Alerts</h3>
                {(insights.riskAlerts ?? []).map((alert, i) => (
                  <p key={i} className="text-sm text-orange-200/80">{alert}</p>
                ))}
              </div>
            </motion.div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 gap-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 3-Month Balance Forecast
              </h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={insights.forecast ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="month" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                      itemStyle={{ color: '#f97316' }}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#f97316" strokeWidth={3} dot={{ fill: '#f97316', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Upcoming Fixed Expenses
              </h3>
              <div className="space-y-4">
                {(insights.upcomingFixedExpenses ?? []).map((exp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                        <Info className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{exp.category}</div>
                        <div className="text-xs text-zinc-500">Due on {exp.dueDate}th</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold">₹{(exp.amount ?? 0).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Goals & Waterfall */}
            <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Target className="w-4 h-4 text-orange-500" /> Financial Goals & Priority Waterfall
                </h3>
                <button 
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Goal
                </button>
              </div>

              {showGoalForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="mb-6 p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700 space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold">Goal Name</label>
                      <input 
                        value={newGoal.name}
                        onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                        placeholder="e.g. Manali Trip"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-zinc-500 font-bold">Target (₹)</label>
                      <input 
                        type="number"
                        value={newGoal.targetAmount || ''}
                        onChange={e => setNewGoal({...newGoal, targetAmount: parseInt(e.target.value)})}
                        placeholder="30000"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setShowGoalForm(false)} className="text-xs px-3 py-1.5 text-zinc-400">Cancel</button>
                    <button onClick={handleAddGoal} className="text-xs bg-orange-600 hover:bg-orange-500 px-4 py-1.5 rounded-lg font-bold transition-colors">Save Goal</button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-6">
                {/* Active Goals */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(insights.goals ?? []).map((goal, i) => (
                    <div key={i} className="p-4 bg-zinc-800/20 border border-zinc-800 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-sm font-bold">{goal.name}</div>
                          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Priority {goal.priority} • {goal.category}</div>
                        </div>
                        <div className="text-xs font-bold text-orange-500">
                          {Math.round((goal.savedAmount / goal.targetAmount) * 100)}%
                        </div>
                      </div>
                      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-2">
                        <div 
                          className="bg-orange-500 h-full transition-all duration-500" 
                          style={{ width: `${(goal.savedAmount / goal.targetAmount) * 100}%` }} 
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span>₹{goal.savedAmount.toLocaleString()} saved</span>
                        <span>Target: ₹{goal.targetAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Waterfall Allocation */}
                {(insights.waterfallAllocation ?? []).length > 0 && (
                  <div className="mt-6 p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                    <h4 className="text-xs font-bold text-green-500 mb-3 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Priority Waterfall Allocation (Current Surplus)
                    </h4>
                    <div className="space-y-2">
                      {insights.waterfallAllocation.map((alloc, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-zinc-400">{alloc.goalName}</span>
                          <span className="font-bold text-green-500">+ ₹{alloc.allocatedAmount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Chat */}
        <div className="lg:col-span-5 flex flex-col h-[calc(100vh-120px)] bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold">Decision Intelligence Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {loading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 p-4 rounded-2xl rounded-tl-none border border-zinc-700 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce" />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-zinc-900 border-t border-zinc-800">
            <div className="relative">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Can I afford a ₹60,000 laptop?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-500 disabled:opacity-50 disabled:hover:bg-orange-600 transition-colors"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 text-center">
              AI-powered financial advice. Always verify critical decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
