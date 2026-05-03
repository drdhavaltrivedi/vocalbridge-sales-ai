import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Plus, Save, Trash2, FileText, Globe, Shield, Link as LinkIcon, Upload, Loader2, Tag, X, Edit2, Check } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { firebaseService } from '../services/firebaseService';
import { processKnowledgeSource } from '../services/geminiService';
import { KnowledgeBaseDoc, KnowledgeCategory } from '../types';
import { cn, formatDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<KnowledgeBaseDoc[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeBaseDoc | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Partial<KnowledgeBaseDoc> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    loadDocs();
    loadCategories();
  }, []);

  async function loadDocs() {
    const data = await firebaseService.getKnowledgeBase();
    if (data) setDocs(data);
  }

  async function loadCategories() {
    const data = await firebaseService.getCategories();
    if (data) setCategories(data);
  }

  const handleDocSelect = (doc: KnowledgeBaseDoc) => {
    setSelectedDoc(doc);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (selectedDoc) {
      setEditingDoc(selectedDoc);
      setIsEditing(true);
    }
  };

  const handleCreateNew = () => {
    setSelectedDoc(null);
    setEditingDoc({ title: '', content: '', category: categories[0]?.name || 'General' });
    setIsEditing(true);
  };

  async function handleAddCategory() {
    if (!newCatName.trim()) return;
    await firebaseService.addCategory({ name: newCatName.trim() });
    setNewCatName('');
    loadCategories();
  }

  async function handleDeleteCategory(id: string) {
    if (confirm('Delete this category? Documents will remain but lose their category tag.')) {
      await firebaseService.deleteCategory(id);
      loadCategories();
    }
  }

  const onDrop = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const base64Data = (e.target?.result as string).split(',')[1];
        const processedContent = await processKnowledgeSource('file', '', {
          data: base64Data,
          mimeType: file.type
        });
        
        setEditingDoc({
          title: file.name.split('.')[0],
          content: processedContent,
          category: file.type.includes('pdf') ? 'PDF Document' : 'Document'
        });
        setIsEditing(true);
      } catch (error) {
        console.error("Failed to process document:", error);
        alert("Failed to process the document. Please ensure it's a valid PDF or text file.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'application/pdf': ['.pdf'] },
    multiple: false
  });

  async function handleUrlProcess() {
    if (!urlInput) return;
    setIsProcessing(true);
    try {
      // Ensure the URL has a protocol
      let validUrl = urlInput.trim();
      if (!/^https?:\/\//i.test(validUrl)) {
        validUrl = `https://${validUrl}`;
      }

      // In a real app, we'd have a server-side proxy to scrape. 
      const simulatedScrape = `Information retrieved from ${validUrl}: [Comprehensive technical specifications and pricing for the product]`;
      const processedContent = await processKnowledgeSource('url', simulatedScrape);
      
      setEditingDoc({
        title: new URL(validUrl).hostname,
        content: processedContent,
        category: 'Weblink'
      });
      setIsEditing(true);
      setUrlInput('');
    } catch (error) {
      console.error("Failed to process URL:", error);
      alert("Please enter a valid URL (e.g., https://example.com)");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSave() {
    if (editingDoc?.title && editingDoc?.content) {
      if (editingDoc.id) {
        await firebaseService.updateKnowledgeBaseDoc(editingDoc.id, {
          title: editingDoc.title,
          content: editingDoc.content,
          category: editingDoc.category
        });
      } else {
        await firebaseService.addKnowledgeBaseDoc({
          title: editingDoc.title,
          content: editingDoc.content,
          category: editingDoc.category || 'General'
        });
      }
      setIsEditing(false);
      setEditingDoc(null);
      await loadDocs();
    }
  }

  async function handleDeleteDoc(id: string) {
    if (confirm('Are you sure you want to delete this document?')) {
      await firebaseService.deleteKnowledgeBaseDoc(id);
      setSelectedDoc(null);
      setIsEditing(false);
      await loadDocs();
    }
  }

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  async function handleUpdateCategory(id: string) {
    if (!editingCatName.trim()) return;
    await firebaseService.updateCategory(id, { name: editingCatName.trim() });
    setEditingCatId(null);
    loadCategories();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Document List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#8E9299]">Knowledge Library</h3>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsManagingCategories(!isManagingCategories)}
              className={cn(
                "p-1 rounded-lg transition-colors",
                isManagingCategories ? "bg-[#1a1a1a] text-white" : "hover:bg-[#F27D26]/10 text-[#F27D26]"
              )}
              title="Manage Categories"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button 
              onClick={handleCreateNew}
              className="p-1 hover:bg-[#F27D26]/10 rounded-lg text-[#F27D26] transition-colors"
              title="New Document"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Category Management */}
          {isManagingCategories && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-3 bg-[#F27D26]/5 rounded-2xl border border-[#F27D26]/10 space-y-3"
            >
              <p className="text-[10px] font-bold text-[#F27D26] uppercase">Manage Categories</p>
              <div className="space-y-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between group">
                    {editingCatId === cat.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input 
                          type="text" 
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white border border-[#F27D26] rounded text-xs outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && cat.id && handleUpdateCategory(cat.id)}
                        />
                        <button onClick={() => cat.id && handleUpdateCategory(cat.id)} className="text-green-500"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingCatId(null)} className="text-gray-400"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-[#1a1a1a]">{cat.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => {
                              setEditingCatId(cat.id || null);
                              setEditingCatName(cat.name);
                            }}
                            className="p-1 text-[#8E9299] hover:bg-white rounded transition-all"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => cat.id && handleDeleteCategory(cat.id)}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="New Category..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-white border border-[#1a1a1a]/5 rounded-lg text-xs outline-none"
                />
                <button 
                  onClick={handleAddCategory}
                  className="p-1.5 bg-[#1a1a1a] text-white rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Quick Import */}
          <div className="p-3 bg-white border border-[#1a1a1a]/5 rounded-2xl space-y-3">
             <div {...getRootProps()} className={cn(
               "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
               isDragActive ? "border-[#F27D26] bg-[#F27D26]/5" : "border-gray-100 hover:border-gray-200"
             )}>
                <input {...getInputProps()} />
                <Upload className="w-5 h-5 mx-auto mb-2 text-[#8E9299]" />
                <p className="text-[10px] font-bold text-[#8E9299] uppercase">Drop PDF / TXT</p>
             </div>

             <div className="relative group">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9299]" />
                <input 
                  type="text" 
                  placeholder="Paste URL..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlProcess()}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#F27D26]"
                />
             </div>
          </div>

          <div className="space-y-2">
            {docs.length > 0 ? docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleDocSelect(doc)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border transition-all",
                  selectedDoc?.id === doc.id 
                    ? "bg-[#1a1a1a] border-[#1a1a1a] text-white" 
                    : "bg-white border-[#1a1a1a]/5 hover:border-[#1a1a1a]/20"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileText className={cn("w-3 h-3", selectedDoc?.id === doc.id ? "text-[#F27D26]" : "text-[#8E9299]")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">
                    {doc.category || 'General'}
                  </span>
                </div>
                <p className="text-sm font-semibold truncate">{doc.title}</p>
              </button>
            )) : (
              <div className="text-center py-12 opacity-30">
                <BookOpen className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs font-medium">Empty Library</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="lg:col-span-2">
        {isProcessing ? (
          <div className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-[#F27D26] animate-spin" />
            <p className="font-mono text-xs uppercase tracking-widest text-[#8E9299]">Gemini is analyzing content...</p>
          </div>
        ) : isEditing && editingDoc ? (
          <div className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#1a1a1a]/5 pb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Document Title"
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full text-2xl font-bold border-none focus:ring-0 p-0 placeholder:text-gray-300"
                />
                <select
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                  className="mt-2 text-xs font-mono text-[#8E9299] bg-transparent border-none focus:ring-0 p-0 cursor-pointer hover:text-[#F27D26] transition-colors outline-none"
                >
                  <option value="General">General</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                {editingDoc.id && (
                  <button 
                    onClick={() => editingDoc.id && handleDeleteDoc(editingDoc.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm font-medium text-[#8E9299]">Cancel</button>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-[#1a1a1a] text-white rounded-xl text-sm font-bold"><Save className="w-4 h-4" /> Save</button>
              </div>
            </div>

            <textarea
              placeholder="Content..."
              value={editingDoc.content}
              onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
              className="w-full h-[500px] border-none focus:ring-0 p-0 text-gray-700 leading-relaxed resize-none"
            />
          </div>
        ) : selectedDoc ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border border-[#1a1a1a]/5 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-[#1a1a1a]/5 pb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedDoc.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#F27D26] bg-[#F27D26]/5 px-2 py-0.5 rounded">
                    {selectedDoc.category}
                  </span>
                  <span className="text-[10px] font-mono text-[#8E9299]">Last updated: {formatDate(selectedDoc.lastUpdated)}</span>
                </div>
              </div>
              <button 
                onClick={handleStartEdit}
                className="flex items-center gap-2 px-6 py-2 border border-[#1a1a1a]/10 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all font-sans"
              >
                <Edit2 className="w-4 h-4" /> Edit Article
              </button>
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedDoc.content}</p>
            </div>
          </motion.div>
        ) : (
          <div className="h-full min-h-[600px] bg-[#FDFCFB] border border-dashed border-[#1a1a1a]/10 rounded-3xl flex flex-col items-center justify-center text-center p-12">
            <BookOpen className="w-12 h-12 text-[#F27D26] opacity-20 mb-6" />
            <h3 className="text-xl font-bold">Select or Import Knowledge</h3>
            <p className="text-[#8E9299] max-w-sm mt-2 text-sm">Upload specifications, pricing sheets, or links to train your AI agent.</p>
          </div>
        )}
      </div>
    </div>
  );
}

