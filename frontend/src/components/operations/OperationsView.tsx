import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  CreditCard, 
  IndianRupee, 
  Users, 
  Wifi, 
  Link as LinkIcon, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  Copy, 
  Check, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../../services/api';
import { Transaction, Settlement, Customer, SoundboxDevice } from '../../types';

export const OperationsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'txns' | 'settlements' | 'customers' | 'devices' | 'links'>('txns');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [devices, setDevices] = useState<SoundboxDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [soundboxNotice, setSoundboxNotice] = useState<string | null>(null);

  // Payment Link Form
  const [linkForm, setLinkForm] = useState({
    name: 'Ankit Verma',
    phone: '+91 98112 34567',
    amount: 850,
    desc: 'Special Sweets Box & Rasmalai'
  });
  const [createdLink, setCreatedLink] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'txns') {
        const res = await api.getTransactions();
        setTransactions(res.transactions);
      } else if (activeTab === 'settlements') {
        const res = await api.getSettlements();
        setSettlements(res.settlements);
      } else if (activeTab === 'customers') {
        const res = await api.getCustomers();
        setCustomers(res.customers);
      } else if (activeTab === 'devices') {
        const res = await api.getDevices();
        setDevices(res.devices);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabData();
  }, [activeTab]);

  const handleTestSoundbox = async (deviceId: string) => {
    try {
      const res = await api.testSoundbox(deviceId, "Paytm par ₹150 prapt hue");
      setSoundboxNotice(`Soundbox voice broadcast triggered successfully on device ${deviceId} (Latency: ${res.speaker_latency_ms}ms)`);
      setTimeout(() => setSoundboxNotice(null), 5000);
    } catch (err: any) {
      setSoundboxNotice(`Device ping failed: ${err.message}`);
    }
  };

  const handleCreatePaymentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createPaymentLink({
        customer_name: linkForm.name,
        customer_phone: linkForm.phone,
        amount: Number(linkForm.amount),
        description: linkForm.desc
      });
      setCreatedLink(res);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Paytm Merchant Operations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time merchant tools for payment acceptance, Soundbox hardware, settlements, customer registries, and payment links.
          </p>
        </div>

        <button
          onClick={fetchTabData}
          className="flex items-center space-x-1.5 px-3 py-2 bg-[#F8FAFC] hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-[#E8EDF4] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Operations Sub-Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#E8EDF4] pb-2 overflow-x-auto">
        {[
          { id: 'txns', label: 'Transactions Ledger', icon: <CreditCard className="w-4 h-4" /> },
          { id: 'settlements', label: 'Bank Settlements', icon: <IndianRupee className="w-4 h-4" /> },
          { id: 'customers', label: 'Customer Registry', icon: <Users className="w-4 h-4" /> },
          { id: 'devices', label: 'Soundbox Devices', icon: <Wifi className="w-4 h-4" /> },
          { id: 'links', label: 'Instant Payment Links', icon: <LinkIcon className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-paytm-dark text-white shadow-sm'
                : 'text-slate-600 hover:bg-white hover:text-[#0F172A]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Soundbox Notice Toast */}
      {soundboxNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-emerald-600" />
            <span>{soundboxNotice}</span>
          </div>
        </div>
      )}

      {/* 1. TRANSACTIONS LEDGER */}
      {activeTab === 'txns' && (
        <div className="bg-white border border-[#E8EDF4] rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EDF4] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Live Transaction Stream (Last 50 Txns)</span>
            <span className="text-xs text-slate-400">All data synced with SQLite store</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E8EDF4] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Soundbox Voice</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{t.id}</td>
                    <td className="py-3 px-4 text-slate-600">{t.customer_phone || '+91 98112 *****'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700 text-[11px]">
                        {t.payment_mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{t.category || 'General'}</td>
                    <td className="py-3 px-4 font-bold text-[#0F172A]">₹{t.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      {t.soundbox_broadcast ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Announced</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(t.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. SETTLEMENTS TRACKER */}
      {activeTab === 'settlements' && (
        <div className="bg-white border border-[#E8EDF4] rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EDF4] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Bank Settlement Batches</span>
            <span className="text-xs font-semibold text-paytm-blue">Auto-Settlement to HDFC A/C **9012</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E8EDF4] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Batch Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Txn Count</th>
                  <th className="py-3 px-4">Bank & UTR</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">ActionMate Investigation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {settlements.map(s => {
                  const isDelayed = s.status === 'DELAYED_INVESTIGATING';
                  return (
                    <tr key={s.id} className={isDelayed ? 'bg-amber-50/50' : 'hover:bg-[#F8FAFC]'}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{s.id}</td>
                      <td className="py-3 px-4 text-slate-600">{s.batch_date}</td>
                      <td className="py-3 px-4 font-bold text-[#0F172A] text-sm">₹{s.amount.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-600">{s.txn_count} txns</td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        <div>{s.bank_name}</div>
                        <div className="text-slate-400">{s.bank_utr || 'Pending UTR Ack'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'SETTLED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                        }`}>
                          {s.status === 'DELAYED_INVESTIGATING' ? 'Delayed • Investigating' : s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {s.notes || 'Auto-settled via Paytm Instant Payouts'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CUSTOMER REGISTRY */}
      {activeTab === 'customers' && (
        <div className="bg-white border border-[#E8EDF4] rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-[#E8EDF4] flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Customer Spend & Cohort Registry</span>
            <span className="text-xs text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
              180+ Inactive Regulars Detected
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E8EDF4] text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Total Spent</th>
                  <th className="py-3 px-4">Favorite Item</th>
                  <th className="py-3 px-4">Cohort Segment</th>
                  <th className="py-3 px-4">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map(c => {
                  const isInactive = c.segment === 'INACTIVE_14D' || c.segment === 'DORMANT_VIP';
                  return (
                    <tr key={c.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{c.id}</td>
                      <td className="py-3 px-4 font-bold text-[#0F172A]">{c.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{c.phone}</td>
                      <td className="py-3 px-4 text-slate-700">{c.total_orders} visits</td>
                      <td className="py-3 px-4 font-bold text-[#0F172A]">₹{c.total_spent.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-slate-600">{c.favorite_item}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.segment === 'DORMANT_VIP' ? 'bg-purple-50 text-purple-700' :
                          c.segment === 'INACTIVE_14D' ? 'bg-red-50 text-red-700' :
                          'bg-emerald-50 text-emerald-700'
                        }`}>
                          {c.segment}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(c.last_visit).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SOUNDBOX HARDWARE */}
      {activeTab === 'devices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map(dev => (
            <div key={dev.id} className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-paytm-dark text-paytm-cyan rounded-xl shadow-sm">
                    <Wifi className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0F172A]">{dev.model}</h3>
                    <span className="text-xs font-mono text-slate-400">ID: {dev.id}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {dev.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">SIM Carrier:</span>
                  <span className="font-bold text-slate-800">{dev.sim_carrier}</span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Battery Level:</span>
                  <span className="font-bold text-emerald-700">{dev.battery_percent}% Charged</span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Language:</span>
                  <span className="font-bold text-slate-800">{dev.language}</span>
                </div>
                <div className="bg-[#F8FAFC] border border-[#E8EDF4] p-3 rounded-xl">
                  <span className="text-slate-400 block text-[11px]">Last Cloud Ping:</span>
                  <span className="font-bold text-slate-800">Just now</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleTestSoundbox(dev.id)}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 bg-paytm-blue hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Send Test Voice Announcement</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. INSTANT PAYMENT LINKS */}
      {activeTab === 'links' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Creator Form */}
          <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Create Instant Payment Link</h2>
              <p className="text-xs text-slate-500 mt-0.5">Generate UPI payment link and dynamic QR code for instant customer checkout.</p>
            </div>

            <form onSubmit={handleCreatePaymentLink} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Name</label>
                <input
                  type="text"
                  value={linkForm.name}
                  onChange={(e) => setLinkForm({ ...linkForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Phone</label>
                <input
                  type="text"
                  value={linkForm.phone}
                  onChange={(e) => setLinkForm({ ...linkForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  value={linkForm.amount}
                  onChange={(e) => setLinkForm({ ...linkForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue font-bold text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Description / Bill Note</label>
                <input
                  type="text"
                  value={linkForm.desc}
                  onChange={(e) => setLinkForm({ ...linkForm, desc: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-hidden focus:border-paytm-blue font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-paytm-dark hover:bg-paytm-blue text-white font-bold rounded-xl shadow-sm transition-colors text-xs flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Payment Link & QR</span>
              </button>
            </form>
          </div>

          {/* Generated Result */}
          <div className="bg-white border border-[#E8EDF4] rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="text-base font-bold text-[#0F172A]">Payment Link Preview</h2>

            {createdLink ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <div className="text-2xl font-extrabold text-[#0F172A]">₹{createdLink.amount.toFixed(2)}</div>
                  <div className="text-slate-600 font-medium">{createdLink.customer_name} ({createdLink.customer_phone})</div>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    {createdLink.status}
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#E8EDF4] rounded-xl flex items-center justify-between">
                  <span className="font-mono text-[11px] text-slate-600 truncate mr-2">{createdLink.link_url}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdLink.link_url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-paytm-blue"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 text-center bg-slate-50 flex flex-col items-center justify-center">
                  <div className="w-32 h-32 bg-white border border-slate-300 rounded-xl flex items-center justify-center shadow-inner mb-2">
                    <QrCode className="w-24 h-24 text-slate-800" />
                  </div>
                  <span className="text-[11px] text-slate-500">Scan using Paytm, GPay, PhonePe or any UPI app</span>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400">
                Submit the form on the left to generate an instant payment link and UPI QR code.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
