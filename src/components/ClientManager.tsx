import React, { useState, useEffect } from 'react';
import { Upload, Search, Plus, Users, X, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { firebaseService } from '../services/firebaseService';
import { Client } from '../types';
import { cn, formatPhoneNumber, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phoneNumber: '', email: '', info: '', tags: '' });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await firebaseService.getClients();
    if (data) setClients(data);
  }

  async function handleDeleteClient(id: string) {
    if (!confirm('Delete this lead? This cannot be undone.')) return;
    await firebaseService.deleteClient(id);
    await loadClients();
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.name || !newClient.phoneNumber) return;
    
    await firebaseService.addClient({
      name: newClient.name,
      phoneNumber: newClient.phoneNumber,
      email: newClient.email,
      info: newClient.info,
      status: 'pending',
      tags: newClient.tags ? newClient.tags.split(',').map(t => t.trim()) : []
    });
    
    setIsAddModalOpen(false);
    setNewClient({ name: '', phoneNumber: '', email: '', info: '', tags: '' });
    await loadClients();
  }

  // Get all unique tags
  const allTags = Array.from(new Set(clients.flatMap(c => c.tags || [])));

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    onDrop: async (acceptedFiles) => {
      setIsUploading(true);
      const file = acceptedFiles[0];
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const newClients = results.data
            .filter((row: any) => row.name && row.phone)
            .map((row: any) => ({
              name: row.name,
              phoneNumber: row.phone,
              email: row.email || '',
              info: row.info || '',
              status: 'pending' as const,
              tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : []
            }));

          for (const client of newClients) {
            await firebaseService.addClient(client);
          }
          await loadClients();
          setIsUploading(false);
        },
        error: () => {
          setIsUploading(false);
          alert('Failed to parse CSV file. Please check that it has headers: name, phone, email, info, tags');
        }
      });
    }
  });

  const filteredClients = clients.filter(c => {
    const nameMatch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const phoneMatch = c.phoneNumber?.includes(searchTerm) || false;
    const matchesSearch = nameMatch || phoneMatch;
    const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E9299]" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#1a1a1a]/10 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto max-w-full no-scrollbar pb-1">
          <button
            onClick={() => setSelectedTag(null)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
              !selectedTag ? "bg-[#1a1a1a] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
          >
            All Leads
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                selectedTag === tag ? "bg-[#F27D26] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              )}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto mt-2 lg:mt-0">
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a]/5 text-[#1a1a1a] rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#F27D26] text-[#1a1a1a] rounded-xl text-sm font-bold shadow-lg shadow-[#F27D26]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#1a1a1a]/5 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1a1a1a]/5 bg-[#FDFCFB]">
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Tags</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider">Added</th>
                <th className="px-6 py-4 text-xs font-semibold text-[#8E9299] uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/5">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-[#FDFCFB] transition-colors">
                    <td className="px-6 py-4 leading-tight">
                      <p className="font-semibold text-sm">{client.name}</p>
                      <p className="text-xs text-[#8E9299]">{client.info || 'No info'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium">{formatPhoneNumber(client.phoneNumber)}</p>
                      <p className="text-xs text-[#8E9299]">{client.email || 'No email'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        client.status === 'interested' ? 'bg-green-100 text-green-700' :
                        client.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        client.status === 'follow_up' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {client.status?.replace('_', ' ') || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {client.tags?.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] text-gray-500">{tag}</span>
                        )) || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#8E9299]">
                      {formatDate(client.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteClient(client.id)}
                        className="p-2 text-[#8E9299] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete lead"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-[#8E9299]">
                      <Users className="w-8 h-8 opacity-20" />
                      <p className="text-sm font-medium">No clients found</p>
                      <p className="text-xs">Import a CSV file to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-[#1a1a1a]/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">Add New Lead</h3>
                    <p className="text-sm text-[#8E9299]">Enter the details of the new prospective client.</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                    <X className="w-5 h-5 text-[#8E9299]" />
                  </button>
                </div>

                <form onSubmit={handleAddClient} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] ml-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        value={newClient.name}
                        onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] ml-1">Phone Number</label>
                      <input 
                        required
                        type="tel" 
                        value={newClient.phoneNumber}
                        onChange={e => setNewClient({ ...newClient, phoneNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] ml-1">Email Address</label>
                    <input 
                      type="email" 
                      value={newClient.email}
                      onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] ml-1">Company / Info</label>
                    <input 
                      type="text" 
                      value={newClient.info}
                      onChange={e => setNewClient({ ...newClient, info: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
                      placeholder="Tech Solutions Inc."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] ml-1">Tags (Comma separated)</label>
                    <input 
                      type="text" 
                      value={newClient.tags}
                      onChange={e => setNewClient({ ...newClient, tags: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#F27D26]/10 outline-none transition-all"
                      placeholder="high-priority, web-design"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-gray-100 text-[#8E9299] rounded-xl font-bold hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-[#1a1a1a] text-white rounded-xl font-bold hover:bg-[#1a1a1a]/90 transition-all shadow-lg"
                    >
                      Create Lead
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
