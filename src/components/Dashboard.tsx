import React, { useState, useEffect } from 'react';
import { TrendingUp, PhoneCall, CheckCircle2, XCircle, Clock, Users, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { firebaseService } from '../services/firebaseService';
import { Client, Call } from '../types';
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
  Cell
} from 'recharts';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    converted: 0,
    totalLeads: 0,
    avgCallTime: '0m 0s'
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const clientData = await firebaseService.getClients();
        const clients: Client[] = clientData || [];
        const calls: Call[] = [];

        const totalLeads = clients.length;
        const converted = clients.filter(c => c.status === 'interested').length;
        
        setStats({
          totalLeads,
          converted,
          totalCalls: calls.length || 0,
          avgCallTime: '2m 15s' // Mock for now until we have duration data
        });

        // Simple chart data based on lead statuses
        const statusCounts = clients.reduce((acc: any, client) => {
          acc[client.status] = (acc[client.status] || 0) + 1;
          return acc;
        }, {});

        setPieData([
          { name: 'Interested', value: statusCounts['interested'] || 0, color: '#F27D26' },
          { name: 'Pending', value: statusCounts['pending'] || 0, color: '#E4E3E0' },
          { name: 'Follow up', value: statusCounts['follow_up'] || 0, color: '#1a1a1a' },
        ]);

        // Weekly chart (mocked aggregation for now, or just showing today's vs total)
        setChartData([
          { name: 'Today', calls: calls.length, sales: converted },
          { name: 'Goal', calls: 50, sales: 10 },
        ]);

        // Recent Activity
        const recent = clients.slice(0, 4).map(c => ({
          user: `Client: ${c.name}`,
          action: c.status === 'interested' ? 'Converted' : 'Lead Added',
          time: 'Recently',
          icon: c.status === 'interested' ? CheckCircle2 : Clock,
          color: c.status === 'interested' ? 'text-green-500' : 'text-[#F27D26]'
        }));
        setRecentActivity(recent);

      } catch (error) {
        console.error("Dashboard load failed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Performance Overview</h2>
        <p className="text-sm text-[#8E9299]">Track your sales metrics and AI performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Calls', value: stats.totalCalls, icon: PhoneCall, trend: '+0%', color: 'blue' },
          { label: 'Converted', value: stats.converted, icon: CheckCircle2, trend: '+0%', color: 'green' },
          { label: 'Total Leads', value: stats.totalLeads, icon: Users, trend: '+0%', color: 'orange' },
          { label: 'Avg Call Time', value: stats.avgCallTime, icon: Clock, trend: '0%', color: 'purple' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#FDFCFB] rounded-lg">
                <stat.icon className="w-5 h-5 text-[#1a1a1a]" />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-[#8E9299] uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold mt-1 tracking-tight">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-6 tracking-tight">Call Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E9299' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#8E9299' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="calls" fill="#1a1a1a" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="sales" fill="#F27D26" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm">
          <h3 className="text-lg font-semibold mb-6 tracking-tight">Lead Conversion</h3>
          <div className="h-[250px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[#8E9299]">{item.name}</span>
                </div>
                <span>{item.value} Leads</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold mb-6 tracking-tight">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.length > 0 ? recentActivity.map((activity, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-[#1a1a1a]/5 last:border-0">
              <div className="flex items-center gap-4">
                <activity.icon className={cn("w-5 h-5", activity.color)} />
                <div>
                  <p className="text-sm font-semibold">{activity.user}</p>
                  <p className="text-xs text-[#8E9299]">{activity.action}</p>
                </div>
              </div>
              <span className="text-xs text-[#8E9299] font-medium">{activity.time}</span>
            </div>
          )) : (
            <p className="text-center py-8 text-[#8E9299] text-sm italic">No recent activity found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
