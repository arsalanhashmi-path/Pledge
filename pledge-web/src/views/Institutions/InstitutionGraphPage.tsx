import React, { useEffect, useRef, useState } from 'react';
import { Layout } from '../../app/Layout';
import * as d3 from 'd3';
import { supabase } from '../../services/supabaseClient';
import { Loader2 } from 'lucide-react';
import { InstitutionSidebar } from './InstitutionSidebar';
import { API_BASE_URL } from '../../constants';

interface Node extends d3.SimulationNodeDatum {
    id: string;
    label: string;
    stats?: {
        given: number;
        received: number;
    };
}

interface Link extends d3.SimulationLinkDatum<Node> {
    source: string | Node;
    target: string | Node;
    value: number;
}

export const InstitutionGraphPage: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [graphData, setGraphData] = useState<{ nodes: Node[], links: Link[] } | null>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Fetch Data
    useEffect(() => {
        (async () => {
             const { data: { session } } = await supabase.auth.getSession();
             const token = session?.access_token;
             try {
                 const res = await fetch(`${API_BASE_URL}/api/institutions/graph`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                 });
                 const json = await res.json();
                 if (json.success) {
                     setGraphData({ nodes: json.nodes, links: json.links });
                 }
             } catch (e) {
                 console.error(e);
             } finally {
                 setLoading(false);
             }
        })();
    }, []);

    // Selection Effect (Highlighting & Stats Update)
    useEffect(() => {
        if (!svgRef.current) return;
        
        const svg = d3.select(svgRef.current);
        const nodeGroups = svg.selectAll<SVGGElement, Node>("g.node-group");
        const links = svg.selectAll<SVGLineElement, Link>("line");

        if (selectedNodeId) {
            // 1. Highlight Logic
            const relatedLinks = graphData?.links.filter(l => {
                const s = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                return s === selectedNodeId || t === selectedNodeId;
            }) || [];

            const neighborIds = new Set(relatedLinks.flatMap(l => {
                const s = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                const t = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                return [s, t];
            }));
            neighborIds.add(selectedNodeId); // Ensure selected is "neighbor" to itself for logic

            // Dim everything
            nodeGroups.transition().duration(300).style("opacity", 0.1);
            links.transition().duration(300).style("opacity", 0.05);

            // Highlight selected + neighbors
            nodeGroups.filter((d) => neighborIds.has(d.id))
                .transition().duration(300).style("opacity", 1);
            
            // Highlight links
            links.filter((d) => {
                const s = typeof d.source === 'object' ? (d.source as Node).id : d.source;
                const t = typeof d.target === 'object' ? (d.target as Node).id : d.target;
                return s === selectedNodeId || t === selectedNodeId;
            }).transition().duration(300).style("opacity", 1).attr("stroke-opacity", 1);

            // 2. Dynamic Stats Update (Contextual)
            nodeGroups.each(function(d) {
                const group = d3.select(this);
                let contextReceived = 0;
                let contextGiven = 0;

                if (d.id === selectedNodeId) {
                    // For the selected node itself, show GLOBAL stats (or we could show total visible, but global is usually better context)
                    contextReceived = d.stats?.received || 0;
                    contextGiven = d.stats?.given || 0;
                } else if (neighborIds.has(d.id)) {
                    // For neighbors, show stats RELATIVE to the selected node
                    // How much did D receive FROM Selected?
                    // Link: Source=Selected -> Target=D
                    const incomingLinks = graphData?.links.filter(l => {
                        const s = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                        const t = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                        return s === selectedNodeId && t === d.id;
                    });
                    contextReceived = incomingLinks?.reduce((acc, l) => acc + l.value, 0) || 0;

                    // How much did D give TO Selected?
                    // Link: Source=D -> Target=Selected
                    const outgoingLinks = graphData?.links.filter(l => {
                        const s = typeof l.source === 'object' ? (l.source as Node).id : l.source;
                        const t = typeof l.target === 'object' ? (l.target as Node).id : l.target;
                        return s === d.id && t === selectedNodeId;
                    });
                    contextGiven = outgoingLinks?.reduce((acc, l) => acc + l.value, 0) || 0;
                } else {
                    // Non-neighbors (dimmed anyway), keep global or 0? 
                    // Let's keep global so if they fade in/out it's consistent, 
                    // or user can still read if they peer closely.
                    contextReceived = d.stats?.received || 0;
                    contextGiven = d.stats?.given || 0;
                }

                // Update text
                group.select(".stat-recv-val").text(contextReceived);
                group.select(".stat-given-val").text(contextGiven);
            });

        } else {
            // Reset Highlighting
            nodeGroups.transition().duration(300).style("opacity", 1);
            links.transition().duration(300).style("opacity", 1).attr("stroke-opacity", 0.6);

            // Reset Stats to Global
            nodeGroups.each(function(d) {
                d3.select(this).select(".stat-recv-val").text(d.stats?.received || 0);
                d3.select(this).select(".stat-given-val").text(d.stats?.given || 0);
            });
        }

    }, [selectedNodeId, graphData]);


    // D3 Simulation Update (Add class names for selection selection)
    useEffect(() => {
        if (!graphData || !svgRef.current || !wrapperRef.current) return;

        const width = wrapperRef.current.clientWidth;
        const height = wrapperRef.current.clientHeight;

        const svg = d3.select(svgRef.current);
        svg.selectAll("*").remove(); 

        const g = svg.append("g");

        // Zoom
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => g.attr("transform", event.transform));
        
        svg.call(zoom);

        // Simulation
        const nodes = graphData.nodes.map(d => ({ ...d }));
        const links = graphData.links.map(d => ({ ...d }));

        // Reuse existing simulation config...
        const simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(200))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(60));

        // Links
        const link = g.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => Math.sqrt(d.value) * 2);

        // Nodes
        const node = g.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .attr("class", "node-group") // Added class for selection
            .style("cursor", "pointer")
            .on("click", (e, d) => {
                e.stopPropagation();
                setSelectedNodeId(d.id);
            })
            // @ts-ignore
            .call(d3.drag()
                .on("start", (event, d: any) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d: any) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d: any) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                })
            );
        
        // Background click clears selection
        svg.on("click", () => setSelectedNodeId(null));


        // ... (Keep existing node circle/card rendering code exactly as is from previous step)
        // Node Circle
        node.append("circle")
            .attr("r", 24)
            .attr("fill", "#fff")
            .attr("stroke", "#334155")
            .attr("stroke-width", 2)
            .attr("filter", "drop-shadow(0px 4px 6px rgba(0,0,0,0.1))");

        // Node Initial
        node.append("text")
            .text(d => d.label.substring(0, 1))
            .attr("text-anchor", "middle")
            .attr("dy", 6)
            .attr("font-size", "16px")
            .attr("font-weight", "900")
            .attr("fill", "#334155");

        // --- DASHBOARD CARD ---
        const card = node.append("g")
            .attr("transform", "translate(0, 32)"); 

        const cardWidth = 100;
        const cardHeight = 36;
        
        card.append("rect")
            .attr("x", -cardWidth / 2)
            .attr("y", -10)
            .attr("width", cardWidth)
            .attr("height", cardHeight)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", "var(--background)")
            .attr("fill-opacity", 0.85)
            .attr("stroke", "var(--border)")
            .attr("stroke-width", 1.5)
            .style("backdrop-filter", "blur(12px)");

        // Institution Name
        card.append("text")
            .text(d => d.label)
            .attr("text-anchor", "middle")
            .attr("y", 2)
            .attr("font-size", "10px")
            .attr("font-weight", "800")
            .attr("fill", "var(--foreground)");

        // Stats Row
        const statsG = card.append("g").attr("transform", "translate(0, 14)");

        // Received (IN)
        const inG = statsG.append("g").attr("transform", "translate(-20, 0)");
        inG.append("text")
            .text("RECV")
            .attr("text-anchor", "end")
            .attr("x", -4)
            .attr("font-size", "7px")
            .attr("font-weight", "900")
            .attr("fill", "var(--muted)");
        inG.append("text")
            .text(d => d.stats?.received || 0)
            .attr("text-anchor", "start")
            .attr("class", "tabular-nums stat-recv-val") // Added class
            .attr("font-size", "10px")
            .attr("font-weight", "900")
            .attr("fill", "#f59e0b"); // Amber

        // Divider
        statsG.append("line")
            .attr("y1", -5)
            .attr("y2", 2)
            .attr("stroke", "var(--border)")
            .attr("stroke-width", 1);

        // Given (OUT)
        const outG = statsG.append("g").attr("transform", "translate(20, 0)");
        outG.append("text")
            .text("GAVE")
            .attr("text-anchor", "end")
            .attr("x", -4)
            .attr("font-size", "7px")
            .attr("font-weight", "900")
            .attr("fill", "var(--muted)");
        outG.append("text")
            .text(d => d.stats?.given || 0)
            .attr("text-anchor", "start")
            .attr("class", "tabular-nums stat-given-val") // Added class
            .attr("font-size", "10px")
            .attr("font-weight", "900")
            .attr("fill", "#10b981"); // Emerald

        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            node
                .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

    }, [graphData]); // Re-run if data changes (Initial render)
    
    // We intentionally do NOT re-run D3 main loop on selectedNodeId change
    // Instead we use the separate transition effect above for performance.

    return (
        <Layout>
            <div className="h-[calc(100vh-6rem)] w-full flex flex-col space-y-4">
               <div className="flex items-center justify-between">
                   <h1 className="text-2xl font-bold text-foreground">Institution Map</h1>
                   <div className="text-xs text-muted font-bold uppercase tracking-wider">
                       Visualizing flows between campuses
                   </div>
               </div>
               
               <div className="flex-1 bg-surface border border-border rounded-3xl shadow-xl overflow-hidden relative flex">
                   {/* Sidebar */}
                   {graphData && (
                       <InstitutionSidebar 
                            nodes={graphData.nodes} 
                            links={graphData.links}
                            selectedNodeId={selectedNodeId}
                            onSelectNode={setSelectedNodeId}
                       />
                   )}

                   {/* Graph Area */}
                   <div className="flex-1 relative">
                       {loading && (
                           <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-10 backdrop-blur-sm">
                               <Loader2 className="animate-spin text-muted" size={32} />
                           </div>
                       )}
                       <div ref={wrapperRef} className="w-full h-full">
                           <svg ref={svgRef} className="w-full h-full" />
                       </div>
                       
                       {!loading && (!graphData?.nodes || graphData.nodes.length === 0) && (
                            <div className="absolute inset-0 flex items-center justify-center text-muted font-medium italic">
                                Not enough data to map relationships yet.
                            </div>
                       )}
                   </div>
               </div>
            </div>
        </Layout>
    );
};
