import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  Activity, 
  Zap, 
  Database,
  History,
  Info
} from 'lucide-react';
import { nexusApi } from '../../api/nexusApi';
import type { UsageStats } from '../../models/Schemas';
import { useTranslation } from '../../hooks/useTranslationHook';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#ef4444'];

export const UsageDashboard: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({});
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await nexusApi.getUsageStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load usage stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    const unsubscribe = nexusApi.onUsageUpdate?.((newStats: UsageStats) => {
      setStats(newStats);
    });
    return () => unsubscribe?.();
  }, []);

  const totalTokens = useMemo(() => {
    let total = 0;
    Object.values(stats).forEach(day => {
      Object.values(day).forEach(model => {
        total += model.totalTokens;
      });
    });
    return total;
  }, [stats]);

  const activeDays = Object.keys(stats).length;

  const apiCalls = useMemo(() => {
    let total = 0;
    Object.values(stats).forEach(day => {
      Object.values(day).forEach(model => {
        total += model.callCount;
      });
    });
    return total;
  }, [stats]);

  const barData = useMemo(() => {
    return Object.entries(stats).map(([date, models]) => {
      let dailyTotal = 0;
      Object.values(models).forEach(m => { dailyTotal += m.totalTokens; });
      return { date: date.split('-').slice(1).join('/'), tokens: dailyTotal };
    }).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [stats]);

  const pieData = useMemo(() => {
    const modelTotals: Record<string, number> = {};
    Object.values(stats).forEach(day => {
      Object.entries(day).forEach(([model, data]) => {
        modelTotals[model] = (modelTotals[model] || 0) + data.totalTokens;
      });
    });
    return Object.entries(modelTotals).map(([name, value]) => ({ name, value }));
  }, [stats]);

  if (loading) return <div className="flex items-center justify-center h-64 text-content-muted">{t.usage.loading}</div>;

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon={<Zap className="text-primary" />} label={t.usage.totalTokens} value={totalTokens.toLocaleString()} color="primary" />
        <StatCard icon={<Activity className="text-purple-400" />} label={t.usage.activeDays} value={activeDays.toString()} color="purple" />
        <StatCard icon={<Database className="text-pink-400" />} label={t.usage.apiCalls} value={apiCalls.toLocaleString()} color="pink" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-surface-dark/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <History className="text-primary" size={20} />
            <h3 className="font-bold text-white tracking-tight">{t.usage.historyTitle}</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Bar dataKey="tokens" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-dark/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl">
          <div className="flex items-center gap-3 mb-8">
            <Zap className="text-purple-400" size={20} />
            <h3 className="font-bold text-white tracking-tight">{t.usage.distributionTitle}</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Model Note */}
      <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl flex gap-4">
        <div className="p-2 bg-primary/20 rounded-xl h-fit"><Info className="text-primary" size={20} /></div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-primary">{t.usage.logsTitle}</h4>
          <p className="text-xs text-content-muted leading-relaxed whitespace-pre-line">{t.usage.modelNote}</p>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value }) => (
  <div className="bg-surface-dark/30 border border-white/5 p-6 rounded-3xl backdrop-blur-xl group hover:border-primary/20 transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-content-muted uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-white tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  </div>
);
