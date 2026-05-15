import React, { useEffect, useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { GlassPanel } from '../GlassPanel';
import { nexusApi } from '../../api/nexusApi';
import type { UsageStats } from '../../models/Schemas';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

export const UsageDashboard: React.FC = () => {
  const [stats, setStats] = useState<UsageStats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await nexusApi.getUsageStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch usage stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // グラフ用データの整形 (直近30日間)
  const chartData = useMemo(() => {
    const dates = Object.keys(stats).sort();
    return dates.map(date => {
      const dayModels = stats[date];
      let promptTokens = 0;
      let candidatesTokens = 0;
      Object.values(dayModels).forEach(m => {
        promptTokens += m.promptTokens;
        candidatesTokens += m.candidatesTokens;
      });
      return {
        date,
        prompt: promptTokens,
        candidates: candidatesTokens,
        total: promptTokens + candidatesTokens
      };
    });
  }, [stats]);

  // モデル別比率データの整形
  const pieData = useMemo(() => {
    const modelTotals: Record<string, number> = {};
    Object.values(stats).forEach(dayModels => {
      Object.entries(dayModels).forEach(([model, data]) => {
        modelTotals[model] = (modelTotals[model] || 0) + data.totalTokens;
      });
    });
    return Object.entries(modelTotals).map(([name, value]) => ({ name, value }));
  }, [stats]);

  const totalTokens = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.total, 0);
  }, [chartData]);

  if (loading) {
    return <div className="p-8 text-center opacity-50">Loading usage statistics...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="usage-dashboard">
      {/* 概要カード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel className="p-4 flex flex-col items-center justify-center">
          <span className="text-xs opacity-60 uppercase tracking-wider mb-1">Total Tokens</span>
          <span className="text-3xl font-bold text-indigo-400">{totalTokens.toLocaleString()}</span>
        </GlassPanel>
        <GlassPanel className="p-4 flex flex-col items-center justify-center">
          <span className="text-xs opacity-60 uppercase tracking-wider mb-1">Active Days</span>
          <span className="text-3xl font-bold text-emerald-400">{Object.keys(stats).length}</span>
        </GlassPanel>
        <GlassPanel className="p-4 flex flex-col items-center justify-center">
          <span className="text-xs opacity-60 uppercase tracking-wider mb-1">API Calls</span>
          <span className="text-3xl font-bold text-amber-400">
            {Object.values(stats).reduce((acc, day) => acc + Object.values(day).reduce((a, m) => a + m.callCount, 0), 0).toLocaleString()}
          </span>
        </GlassPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 利用推移グラフ */}
        <GlassPanel className="lg:col-span-2 p-6 min-h-[400px]">
          <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
            <span className="text-xl">📈</span> Token Usage History
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrompt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255,255,255,0.5)" 
                  fontSize={12}
                  tickFormatter={(val) => val.split('-').slice(1).join('/')}
                />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.9)', border: 'none', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="prompt" stroke="#8884d8" fillOpacity={1} fill="url(#colorPrompt)" name="Input Tokens" />
                <Area type="monotone" dataKey="candidates" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCand)" name="Output Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        {/* モデル別比率 */}
        <GlassPanel className="p-6 flex flex-col min-h-[400px]">
          <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
            <span className="text-xl">📊</span> Model Distribution
          </h3>
          <div className="flex-1 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20, 20, 30, 0.9)', border: 'none', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-xs opacity-50 text-center leading-relaxed">
            モデルごとのトークン消費割合を表示しています。<br/>
            Flashモデルは高速、Proモデルは高度な推論に適しています。
          </div>
        </GlassPanel>
      </div>

      {/* 詳細テーブル (アクセシビリティ対応) */}
      <GlassPanel className="p-6">
        <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
          <span className="text-xl">📋</span> Detailed Logs
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="py-2 opacity-60 font-medium">Date</th>
                <th className="py-2 opacity-60 font-medium text-right">Input</th>
                <th className="py-2 opacity-60 font-medium text-right">Output</th>
                <th className="py-2 opacity-60 font-medium text-right">Total</th>
                <th className="py-2 opacity-60 font-medium text-right">Calls</th>
              </tr>
            </thead>
            <tbody>
              {chartData.slice().reverse().map(row => (
                <tr key={row.date} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-2 font-mono">{row.date}</td>
                  <td className="py-2 text-right">{row.prompt.toLocaleString()}</td>
                  <td className="py-2 text-right">{row.candidates.toLocaleString()}</td>
                  <td className="py-2 text-right font-bold text-indigo-300">{row.total.toLocaleString()}</td>
                  <td className="py-2 text-right opacity-80">
                    {Object.values(stats[row.date]).reduce((a, m) => a + m.callCount, 0)}
                  </td>
                </tr>
              ))}
              {chartData.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center opacity-30 italic">No usage data recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};
