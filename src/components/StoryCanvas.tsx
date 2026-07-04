import React, { useState, useRef, useEffect } from 'react';
import { CanvasNode, CanvasEdge, Story } from '../types';
import { Plus, Trash2, Link, Sparkles, MapPin, User, MessageSquare, StickyNote, HelpCircle, Eye, RefreshCw } from 'lucide-react';

interface StoryCanvasProps {
  story: Story;
  onUpdateStory: (updater: (prev: Story) => Story) => void;
  onGenerateAICard: (sourceNode: CanvasNode) => Promise<void>;
  isAIConfigured: boolean;
}

export default function StoryCanvas({
  story,
  onUpdateStory,
  onGenerateAICard,
  isAIConfigured,
}: StoryCanvasProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [newNodeType, setNewNodeType] = useState<CanvasNode['type']>('not');
  
  // Connection state
  const [connSource, setConnSource] = useState<string>('');
  const [connTarget, setConnTarget] = useState<string>('');
  const [connLabel, setConnLabel] = useState<string>('');

  // Node details edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('#3b82f6');

  // Sync edit form with selected node
  useEffect(() => {
    if (selectedNodeId) {
      const node = story.canvasNodes.find(n => n.id === selectedNodeId);
      if (node) {
        setEditTitle(node.title);
        setEditContent(node.content);
        setEditColor(node.color);
      }
    } else {
      setEditTitle('');
      setEditContent('');
      setEditColor('#3b82f6');
    }
  }, [selectedNodeId, story.canvasNodes]);

  // Handle Dragging
  const handleNodeMouseDown = (e: React.MouseEvent, node: CanvasNode) => {
    // Prevent dragging if clicking input or button
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea')) {
      return;
    }
    setActiveDragId(node.id);
    setSelectedNodeId(node.id);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    nodeStartPos.current = { x: node.x, y: node.y };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDragId) return;
      
      const dx = e.clientX - dragStartPos.current.x;
      const dy = e.clientY - dragStartPos.current.y;
      
      // Constraint dragging inside visible bounds
      const nextX = Math.max(10, Math.min(1200, nodeStartPos.current.x + dx));
      const nextY = Math.max(10, Math.min(1000, nodeStartPos.current.y + dy));

      onUpdateStory(prev => ({
        ...prev,
        canvasNodes: prev.canvasNodes.map(node => 
          node.id === activeDragId ? { ...node, x: nextX, y: nextY } : node
        )
      }));
    };

    const handleMouseUp = () => {
      setActiveDragId(null);
    };

    if (activeDragId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragId, onUpdateStory]);

  // Add new Node
  const handleAddNode = () => {
    const id = `node-${Date.now()}`;
    const colors = {
      sahne: '#fbbf24', // Amber
      karakter: '#3b82f6', // Blue
      mekan: '#10b981', // Emerald
      not: '#fbbf24', // Amber
    };
    
    // Find empty spot or stagger
    const count = story.canvasNodes.length;
    const x = 150 + (count % 3) * 60;
    const y = 150 + Math.floor(count / 3) * 40;

    const titles = {
      sahne: 'Yeni Sahne Kartı',
      karakter: 'Yeni Karakter Kartı',
      mekan: 'Yeni Mekan Kartı',
      not: 'Fikir / Not Kartı',
    };

    const newNode: CanvasNode = {
      id,
      type: newNodeType,
      x,
      y,
      title: titles[newNodeType],
      content: 'Detayları buraya girin...',
      color: colors[newNodeType],
    };

    onUpdateStory(prev => ({
      ...prev,
      canvasNodes: [...prev.canvasNodes, newNode]
    }));
    setSelectedNodeId(id);
  };

  // Delete Node
  const handleDeleteNode = (nodeId: string) => {
    onUpdateStory(prev => ({
      ...prev,
      canvasNodes: prev.canvasNodes.filter(n => n.id !== nodeId),
      canvasEdges: prev.canvasEdges.filter(e => e.source !== nodeId && e.target !== nodeId)
    }));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  // Update selected Node fields
  const handleUpdateNodeFields = () => {
    if (!selectedNodeId) return;
    onUpdateStory(prev => ({
      ...prev,
      canvasNodes: prev.canvasNodes.map(n => 
        n.id === selectedNodeId ? { ...n, title: editTitle, content: editContent, color: editColor } : n
      )
    }));
  };

  // Create Connection
  const handleAddEdge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!connSource || !connTarget || connSource === connTarget) return;

    // Check if edge already exists
    const exists = story.canvasEdges.some(e => 
      (e.source === connSource && e.target === connTarget) ||
      (e.source === connTarget && e.target === connSource)
    );

    if (exists) return;

    const newEdge: CanvasEdge = {
      id: `edge-${Date.now()}`,
      source: connSource,
      target: connTarget,
      label: connLabel.trim() || undefined,
    };

    onUpdateStory(prev => ({
      ...prev,
      canvasEdges: [...prev.canvasEdges, newEdge]
    }));

    setConnSource('');
    setConnTarget('');
    setConnLabel('');
  };

  // Delete Connection
  const handleDeleteEdge = (edgeId: string) => {
    onUpdateStory(prev => ({
      ...prev,
      canvasEdges: prev.canvasEdges.filter(e => e.id !== edgeId)
    }));
  };

  // Node Icons helper
  const getNodeIcon = (type: CanvasNode['type']) => {
    switch (type) {
      case 'sahne': return <Sparkles className="w-4 h-4 text-amber-400" id="icon-scene" />;
      case 'karakter': return <User className="w-4 h-4 text-blue-400" id="icon-character" />;
      case 'mekan': return <MapPin className="w-4 h-4 text-emerald-400" id="icon-place" />;
      case 'not': return <StickyNote className="w-4 h-4 text-amber-400" id="icon-note" />;
    }
  };

  // Calculate SVG line coords
  const getNodeCenter = (nodeId: string) => {
    const node = story.canvasNodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    // Node width approx 220px, height approx 130px
    return {
      x: node.x + 110,
      y: node.y + 65
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="canvas-container-grid">
      {/* Canvas Tool Sidebar */}
      <div className="lg:col-span-1 space-y-6" id="canvas-sidebar">
        
        {/* Card Adder */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md" id="add-card-section">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Kart Ekle
          </h3>
          <div className="grid grid-cols-2 gap-2" id="card-type-buttons">
            <button
              onClick={() => { setNewNodeType('sahne'); }}
              className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 border transition ${
                newNodeType === 'sahne' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              id="btn-select-sahne"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              Sahne
            </button>
            <button
              onClick={() => { setNewNodeType('karakter'); }}
              className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 border transition ${
                newNodeType === 'karakter' ? 'bg-blue-950/40 border-blue-500 text-blue-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              id="btn-select-karakter"
            >
              <User className="w-4 h-4 text-blue-400" />
              Karakter
            </button>
            <button
              onClick={() => { setNewNodeType('mekan'); }}
              className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 border transition ${
                newNodeType === 'mekan' ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              id="btn-select-mekan"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              Mekan
            </button>
            <button
              onClick={() => { setNewNodeType('not'); }}
              className={`p-2 rounded-lg text-xs font-medium flex flex-col items-center gap-1.5 border transition ${
                newNodeType === 'not' ? 'bg-amber-950/40 border-amber-500 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              id="btn-select-not"
            >
              <StickyNote className="w-4 h-4 text-amber-400" />
              Not
            </button>
          </div>
          <button
            onClick={handleAddNode}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/30 cursor-pointer"
            id="btn-add-node-submit"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Kartı Sahneye Koy
          </button>
        </div>

        {/* Card Editor Panel */}
        {selectedNodeId ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md" id="card-editor-panel">
            <div className="flex items-center justify-between" id="editor-header">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" />
                Kartı Düzenle
              </h3>
              <button
                onClick={() => handleDeleteNode(selectedNodeId)}
                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                title="Kartı Sil"
                id="btn-delete-selected-node"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 text-xs" id="editor-form-fields">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Başlık</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); }}
                  onBlur={handleUpdateNodeFields}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 transition"
                  id="input-node-title"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">İçerik</label>
                <textarea
                  rows={4}
                  value={editContent}
                  onChange={(e) => { setEditContent(e.target.value); }}
                  onBlur={handleUpdateNodeFields}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500 transition resize-none"
                  id="textarea-node-content"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium">Kart Kenar Rengi</label>
                <div className="flex gap-2" id="color-selectors">
                  {['#fbbf24', '#3b82f6', '#10b981', '#f97316', '#ef4444', '#64748b'].map(c => (
                    <button
                      key={c}
                      onClick={() => { setEditColor(c); onUpdateStory(prev => ({ ...prev, canvasNodes: prev.canvasNodes.map(n => n.id === selectedNodeId ? { ...n, color: c } : n) })); }}
                      className={`w-6 h-6 rounded-full transition border-2 ${editColor === c ? 'border-white scale-110 shadow' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c }}
                      id={`color-picker-${c.replace('#', '')}`}
                    />
                  ))}
                </div>
              </div>

              {/* AI generator triggers based on this card */}
              <div className="pt-2 border-t border-slate-800/80" id="ai-generator-triggers">
                <button
                  onClick={() => {
                    const node = story.canvasNodes.find(n => n.id === selectedNodeId);
                    if (node) onGenerateAICard(node);
                  }}
                  disabled={!isAIConfigured}
                  className={`w-full py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-2 border transition ${
                    isAIConfigured 
                      ? 'bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border-amber-500/50 hover:border-amber-400' 
                      : 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                  }`}
                  id="btn-ai-card-trigger"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Yapay Zeka ile İlişkili Kart Üret
                </button>
                {!isAIConfigured && (
                  <p className="text-[10px] text-slate-500 text-center mt-1">
                    AI ile kart üretmek için Ayarlar'dan Gemini'ı aktif edin.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-6 text-center shadow-inner" id="card-editor-empty">
            <HelpCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h4 className="text-xs font-semibold text-slate-400">Kart Seçilmedi</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Düzenlemek, silmek veya yapay zeka ile ilişkilendirmek için canvas üzerindeki bir karta tıklayın.
            </p>
          </div>
        )}

        {/* Connections drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md" id="connections-panel">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <Link className="w-4 h-4 text-blue-400" />
            İlişki / Bağlantı Ekle
          </h3>
          <form onSubmit={handleAddEdge} className="space-y-3 text-xs" id="connection-form">
            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Kaynak Kart (Nereden)</label>
              <select
                value={connSource}
                onChange={(e) => setConnSource(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                id="select-conn-source"
              >
                <option value="">Seçiniz...</option>
                {story.canvasNodes.map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">Hedef Kart (Nereye)</label>
              <select
                value={connTarget}
                onChange={(e) => setConnTarget(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                id="select-conn-target"
              >
                <option value="">Seçiniz...</option>
                {story.canvasNodes.filter(n => n.id !== connSource).map(n => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-400 font-medium">İlişki Türü / Etiket (Örn: "Düşmanı", "Bulunduğu Yer")</label>
              <input
                type="text"
                placeholder="İsteğe bağlı etiket..."
                value={connLabel}
                onChange={(e) => setConnLabel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none"
                id="input-conn-label"
              />
            </div>

            <button
              type="submit"
              disabled={!connSource || !connTarget}
              className={`w-full py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition ${
                connSource && connTarget ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer' : 'bg-slate-950 text-slate-600 border border-slate-800 cursor-not-allowed'
              }`}
              id="btn-conn-submit"
            >
              <Link className="w-3.5 h-3.5" />
              Bağlantı Kur
            </button>
          </form>

          {story.canvasEdges.length > 0 && (
            <div className="pt-2 border-t border-slate-800 text-xs" id="connections-list-section">
              <h4 className="font-semibold text-slate-400 mb-2">Mevcut İlişkiler</h4>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 custom-scrollbar" id="connections-list">
                {story.canvasEdges.map(edge => {
                  const sNode = story.canvasNodes.find(n => n.id === edge.source);
                  const tNode = story.canvasNodes.find(n => n.id === edge.target);
                  if (!sNode || !tNode) return null;
                  return (
                    <div key={edge.id} className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800/60 text-[10px]" id={`edge-list-item-${edge.id}`}>
                      <span className="text-slate-300 truncate max-w-[130px]" title={`${sNode.title} ➔ ${tNode.title}`}>
                        {sNode.title} ➔ {tNode.title}
                        {edge.label && <span className="text-slate-500 block">({edge.label})</span>}
                      </span>
                      <button
                        onClick={() => handleDeleteEdge(edge.id)}
                        className="text-slate-500 hover:text-red-400 p-0.5 cursor-pointer"
                        id={`btn-delete-edge-${edge.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Main Interactive Canvas Stage */}
      <div className="lg:col-span-3 flex flex-col space-y-3" id="canvas-stage-wrapper">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3" id="canvas-status-bar">
          <div className="flex items-center gap-2" id="canvas-status-info">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-200">Etkileşimli Olay Örgüsü ve Zihin Haritası</span>
            <span className="text-[10px] text-slate-500">| Sürükle ve Bırak</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 text-xs" id="canvas-node-counts">
            <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">{story.canvasNodes.length} Kart</span>
            <span className="px-2 py-0.5 bg-slate-950 rounded border border-slate-800">{story.canvasEdges.length} Bağlantı</span>
          </div>
        </div>

        {/* The Drag and Drop Infinite Area */}
        <div 
          className="relative w-full h-[620px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:30px_30px]"
          id="canvas-draggable-area"
        >
          {/* SVG Connection Lines */}
          <svg className="absolute inset-0 pointer-events-none w-full h-full" id="canvas-svg-layer">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="18"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
              </marker>
            </defs>

            {story.canvasEdges.map(edge => {
              const p1 = getNodeCenter(edge.source);
              const p2 = getNodeCenter(edge.target);
              if (p1.x === 0 || p2.x === 0) return null;
              
              // Calculate control points for a smooth bezier curve
              const dx = p2.x - p1.x;
              const dy = p2.y - p1.y;
              const cx1 = p1.x + dx * 0.4;
              const cy1 = p1.y;
              const cx2 = p2.x - dx * 0.4;
              const cy2 = p2.y;

              return (
                <g key={edge.id} id={`svg-group-${edge.id}`}>
                  {/* Glowing background line */}
                  <path
                    d={`M ${p1.x} ${p1.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p2.x} ${p2.y}`}
                    fill="none"
                    stroke={selectedNodeId === edge.source || selectedNodeId === edge.target ? '#3b82f6' : '#334155'}
                    strokeWidth={selectedNodeId === edge.source || selectedNodeId === edge.target ? '3' : '1.5'}
                    strokeOpacity={selectedNodeId === edge.source || selectedNodeId === edge.target ? '0.8' : '0.4'}
                    className="transition-all"
                  />
                  {/* Arrow or dot indicator in the center */}
                  {edge.label && (
                    <foreignObject
                      x={(p1.x + p2.x) / 2 - 50}
                      y={(p1.y + p2.y) / 2 - 10}
                      width="100"
                      height="24"
                      className="overflow-visible pointer-events-none"
                    >
                      <div className="flex justify-center items-center h-full">
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[9px] text-slate-400 rounded-md font-mono shadow-sm">
                          {edge.label}
                        </span>
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Draggable Cards (Nodes) */}
          {story.canvasNodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                className={`absolute w-56 bg-slate-900/95 border-2 rounded-xl p-3 shadow-xl cursor-grab active:cursor-grabbing transition-shadow select-none ${
                  isSelected 
                    ? 'shadow-blue-900/30 ring-1 ring-blue-500/50' 
                    : 'hover:shadow-slate-900/40'
                }`}
                style={{ 
                  left: node.x, 
                  top: node.y,
                  borderColor: isSelected ? '#3b82f6' : node.color,
                  boxShadow: isSelected ? '0 10px 25px -5px rgba(59, 130, 246, 0.25)' : '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                id={`canvas-card-${node.id}`}
              >
                {/* Node Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2" id={`card-header-${node.id}`}>
                  <div className="flex items-center gap-1.5" id={`card-title-group-${node.id}`}>
                    {getNodeIcon(node.type)}
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                      {node.type}
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteNode(node.id); }}
                    className="text-slate-500 hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                    id={`btn-delete-node-direct-${node.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Node Content */}
                <div className="space-y-1.5" id={`card-content-area-${node.id}`}>
                  <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                    {node.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">
                    {node.content}
                  </p>
                </div>

                {/* Node Link Badge if linked to something */}
                {node.linkedId && (
                  <div className="mt-2 pt-1 border-t border-slate-800/40 flex items-center gap-1 text-[8px] font-mono text-slate-500" id={`card-link-badge-${node.id}`}>
                    <Link className="w-2.5 h-2.5 text-blue-400" />
                    BAĞLI: {node.linkedId.startsWith('char') ? 'Karakter' : node.linkedId.startsWith('place') ? 'Mekan' : 'Bölüm'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty Stage Helper */}
          {story.canvasNodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 bg-slate-950/80 pointer-events-none" id="canvas-empty-state">
              <Sparkles className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
              <h3 className="text-sm font-semibold text-slate-400">Yazım Sahnesi Henüz Boş</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Soldaki "Kart Ekle" panelinden yeni sahneler, karakterler veya mekanlar yerleştirin. 
                Görsel ilişkiler çizmek için bağlantılar kurun.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
