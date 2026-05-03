import React from 'react';
import { TrendingUp, PhoneCall, CheckCircle2, XCircle, Clock, Users, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const data = [
  { name: 'Mon', calls: 24, sales: 4 },
  { name: 'Tue', calls: 35, sales: 7 },
  { name: 'Wed', calls: 42, sales: 12 },
  { name: 'Thu', calls: 30, sales: 8 },
  { name: 'Fri', calls: 45, sales: 15 },
  { name: 'Sat', calls: 12, sales: 2 },
  { name: 'Sun', calls: 8, sales: 1 },
];

const pieData = [
  { name: 'Interested', value: 35, color: '#F27D26' },
  { name: 'Follow up', value: 25, color: '#E4E3E0' },
  { name: 'Not interested', value: 40, color: '#1a1a1a' },
];

export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Calls', value: '1,284', icon: PhoneCall, trend: '+12%', color: 'blue' },
          { label: 'Converted', value: '142', icon: CheckCircle2, trend: '+5%', color: 'green' },
          { label: 'Total Leads', value: '5,420', icon: Users, trend: '+8%', color: 'orange' },
          { label: 'Avg Call Time', value: '4m 32s', icon: Clock, trend: '-2%', color: 'purple' },
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
              <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                {stat.trend}
              </span>
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
              <BarChart data={data}>
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
                <span>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold mb-6 tracking-tight">Recent Activity</h3>
        <div className="space-y-4">
          {[
            { user: 'Client: John Doe', action: 'Appointment set', time: '2 mins ago', icon: CheckCircle2, color: 'text-green-500' },
            { user: 'Client: Sarah Smith', action: 'Call completed - Interested', time: '15 mins ago', icon: CheckCircle2, color: 'text-[#F27D26]' },
            { user: 'Client: Mike Ross', action: 'Call failed - No answer', time: '45 mins ago', icon: XCircle, color: 'text-red-500' },
            { user: 'Client: Rachel Zane', action: 'Call completed - Follow up scheduled', time: '1 hour ago', icon: AlertCircle, color: 'text-blue-500' },
          ].map((activity, i) => (
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
          ))}
        </div>
      </div>
    </div>
  );
}
