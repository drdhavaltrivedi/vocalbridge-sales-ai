import React, { useState, useEffect } from 'react';
import { Upload, Download, Search, Plus, Filter, MoreVertical, Phone, Users } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { firebaseService } from '../services/firebaseService';
import { Client } from '../types';
import { cn, formatPhoneNumber } from '../lib/utils';

export default function ClientManager() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const data = await firebaseService.getClients();
    if (data) setClients(data);
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
        }
      });
    }
  });

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.phoneNumber.includes(searchTerm);
    const matchesTag = !selectedTag || (c.tags && c.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:row gap-4 items-center justify-between">
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
          <button className="flex items-center gap-2 px-6 py-2.5 bg-[#F27D26] text-[#1a1a1a] rounded-xl text-sm font-bold shadow-lg shadow-[#F27D26]/20 transition-all">
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
                        {client.status.replace('_', ' ')}
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
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-[#8E9299]" />
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
    </div>
  );
}
