import React, { useMemo, useState } from 'react';
import { Search, ArrowRight, ArrowLeft, School } from 'lucide-react';


interface Node {
    id: string;
    label: string;
    stats?: {
        given: number;
        received: number;
    };
}

interface LinkType {
    source: string | Node;
    target: string | Node;
    value: number;
}

interface InstitutionSidebarProps {
    nodes: Node[];
    links: LinkType[];
    selectedNodeId: string | null;
    onSelectNode: (id: string | null) => void;
}

export const InstitutionSidebar: React.FC<InstitutionSidebarProps> = ({ nodes, links, selectedNodeId, onSelectNode }) => {
    const [search, setSearch] = useState('');

    // Filtered list of nodes
    const filteredNodes = useMemo(() => {
        return nodes.filter(n => 
            n.label.toLowerCase().includes(search.toLowerCase())
        ).sort((a, b) => a.label.localeCompare(b.label));
    }, [nodes, search]);

    const selectedNode = useMemo(() => 
        nodes.find(n => n.id === selectedNodeId), 
    [nodes, selectedNodeId]);

    // Derived relationships for selected node
    const relationships = useMemo(() => {
        if (!selectedNodeId) return { incoming: [], outgoing: [] };

        const incoming = links
            .filter(l => {
                const targetId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                return targetId === selectedNodeId;
            })
            .map(l => {
                const sourceId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                const sourceNode = nodes.find(n => n.id === sourceId);
                return { ...l, other: sourceNode, otherId: sourceId };
            })
            .sort((a, b) => b.value - a.value);

        const outgoing = links
            .filter(l => {
                const sourceId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                return sourceId === selectedNodeId;
            })
            .map(l => {
                const targetId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                const targetNode = nodes.find(n => n.id === targetId);
                return { ...l, other: targetNode, otherId: targetId };
            })
            .sort((a, b) => b.value - a.value);

        return { incoming, outgoing };
    }, [links, nodes, selectedNodeId]);

    return (
        <div className="w-80 h-full flex flex-col bg-surface border-r border-border backdrop-blur-xl shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                        <School size={18} />
                        Institutions
                    </h2>
                    <div className="text-xs font-mono text-muted">{nodes.length} Total</div>
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search universities..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                    />
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {!selectedNode ? (
                    // Default List
                    <div className="divide-y divide-border/50">
                        {filteredNodes.length === 0 ? (
                            <div className="p-8 text-center text-muted text-sm italic">
                                No institutions found.
                            </div>
                        ) : (
                            filteredNodes.map(node => (
                                <button
                                    key={node.id}
                                    onClick={() => onSelectNode(node.id)}
                                    className="w-full text-left p-4 hover:bg-background/80 transition-colors group"
                                >
                                    <div className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">
                                        {node.label}
                                    </div>
                                    <div className="flex gap-3 mt-1.5">
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                                            <ArrowRight size={10} strokeWidth={3} />
                                            <span>Gave {node.stats?.given || 0}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                                            <ArrowLeft size={10} strokeWidth={3} />
                                            <span>Recv {node.stats?.received || 0}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                ) : (
                    // Selected Details View
                    <div className="flex flex-col h-full animate-fade-in">
                        <div className="p-4 bg-background/50 border-b border-border">
                            <button 
                                onClick={() => onSelectNode(null)}
                                className="text-xs font-bold text-muted hover:text-foreground flex items-center gap-1 mb-2 transition-colors uppercase tracking-wider"
                            >
                                <ArrowLeft size={12} /> Back to list
                            </button>
                            <h3 className="text-xl font-black text-foreground leading-tight">
                                {selectedNode.label}
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* OUTGOING */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <ArrowRight size={12} className="text-emerald-500" />
                                    Outgoing Help ({relationships.outgoing.length})
                                </h4>
                                {relationships.outgoing.length === 0 ? (
                                    <div className="text-xs text-muted italic pl-5">None recorded</div>
                                ) : (
                                    <div className="space-y-1">
                                        {relationships.outgoing.map((rel, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-background/50 rounded-lg border border-border/50">
                                                <button onClick={() => onSelectNode(rel.otherId)} className="font-semibold hover:underline text-left truncate flex-1">
                                                    {rel.other?.label || rel.otherId}
                                                </button>
                                                <span className="font-mono font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-2">
                                                    {rel.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* INCOMING */}
                            <div className="space-y-2">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted flex items-center gap-2">
                                    <ArrowLeft size={12} className="text-amber-500" />
                                    Incoming Help ({relationships.incoming.length})
                                </h4>
                                {relationships.incoming.length === 0 ? (
                                    <div className="text-xs text-muted italic pl-5">None recorded</div>
                                ) : (
                                    <div className="space-y-1">
                                        {relationships.incoming.map((rel, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs p-2 bg-background/50 rounded-lg border border-border/50">
                                                <button onClick={() => onSelectNode(rel.otherId)} className="font-semibold hover:underline text-left truncate flex-1">
                                                    {rel.other?.label || rel.otherId}
                                                </button>
                                                <span className="font-mono font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2">
                                                    {rel.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
