import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphPayload, GraphNode, GraphLink } from '../types';

interface GraphCanvasProps {
    data: GraphPayload;
    onNodeClick: (node: GraphNode) => void;
    onEdgeClick: (link: GraphLink) => void;
    filter?: 'ALL' | 'GAVE' | 'RECEIVED';
}

/**
 * GraphCanvas Reconstruction
 * Focus: Stability, Performance, Zero-Jitter
 */
export const GraphCanvas = React.memo(({ data, onNodeClick, onEdgeClick, filter = 'ALL' }: GraphCanvasProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Permanent references to prevent physics resets
    const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
    const nodesRef = useRef<Map<string, any>>(new Map());
    const gRef = useRef<SVGGElement | null>(null);

    // Initial Setup & Resize
    useEffect(() => {
        if (!wrapperRef.current) return;
        const observer = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, []);

    // One-time SVG Layer Setup
    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0) return;
        const svg = d3.select(svgRef.current);

        if (!gRef.current) {
            const g = svg.append("g").attr("class", "main-group");
            gRef.current = g.node();

            // Zoom support
            svg.call(d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on("zoom", (event) => g.attr("transform", event.transform)));

            // Layers
            g.append("g").attr("class", "links-layer");
            g.append("g").attr("class", "nodes-layer");

            // Global Shadows
            const defs = svg.append("defs");
            const dropShadow = defs.append("filter").attr("id", "drop-shadow").attr("height", "130%");
            dropShadow.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 3);
            dropShadow.append("feOffset").attr("dx", 0).attr("dy", 2).attr("result", "offsetblur");
            dropShadow.append("feComponentTransfer").append("feFuncA").attr("type", "linear").attr("slope", 0.2);
            const feMerge = dropShadow.append("feMerge");
            feMerge.append("feMergeNode");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");
        }
    }, [dimensions.width]);

    // Handle Data & Simulation
    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0) return;
        const { width, height } = dimensions;

        // 1. Data Preservation (Physics Persistence)
        const currentNodes: any[] = data.nodes.map(d => {
            const existing = nodesRef.current.get(d.id);
            if (existing) {
                // Update properties but keep physics state
                return Object.assign(existing, d);
            }
            // New node initialization
            const newNode = { ...d, x: width / 2, y: height / 2 };
            nodesRef.current.set(d.id, newNode);
            return newNode;
        });

        // Cleanup nodes that were removed from the array
        const activeIds = new Set(data.nodes.map(n => n.id));
        nodesRef_current_cleanup: {
            const keys = Array.from(nodesRef.current.keys());
            for (const id of keys) {
                if (!activeIds.has(id)) nodesRef.current.delete(id);
            }
        }

        const currentLinks = data.links.map(l => ({ ...l }));

        // 2. Simulation Configuration
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation()
                .force("charge", d3.forceManyBody().strength(-2000)) // Slightly stronger repulsion
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collide", d3.forceCollide().radius(90).strength(1));
        }

        const sim = simulationRef.current;
        sim.nodes(currentNodes);
        sim.force("link", d3.forceLink(currentLinks).id((d: any) => d.id).distance(200).strength(1));

        // Anchor "Me" Node Always
        currentNodes.forEach(n => {
            if (n.isMe) {
                n.fx = width / 2;
                n.fy = height / 2;
            } else {
                n.fx = null;
                n.fy = null;
            }
        });

        // Smooth restart with very low alpha for filter changes (minimal jitter)
        sim.alpha(0.2).alphaDecay(0.04).restart();

        // 3. Rendering (D3 Data Join)
        const g = d3.select(gRef.current);
        const linksLayer = g.select(".links-layer");
        const nodesLayer = g.select(".nodes-layer");

        // --- LINKS ---
        const links = linksLayer.selectAll<SVGLineElement, any>("line")
            .data(currentLinks, (d: any) => d.source.id + "-" + d.target.id)
            .join(
                enter => enter.append("line")
                    .attr("opacity", 0)
                    .attr("stroke-linecap", "round")
                    .attr("stroke", (d: any) => d.pendingCount > 0 ? "#f59e0b" : "#10b981"),
                update => update.attr("stroke", (d: any) => d.pendingCount > 0 ? "#f59e0b" : "#10b981"),
                exit => exit.transition().duration(200).attr("opacity", 0).remove()
            )
            .attr("stroke-width", d => Math.max(2, Math.min(6, d.verifiedCount + 1)))
            .attr("stroke-dasharray", "0")
            .on("click", (event, d) => {
                event.stopPropagation();
                onEdgeClick(d);
            });

        links.transition().duration(500).attr("opacity", 0.6);

        // --- NODES ---
        const nodes = nodesLayer.selectAll<SVGGElement, any>("g.node-group")
            .data(currentNodes, d => d.id)
            .join(
                enter => {
                    const group = enter.append("g")
                        .attr("class", "node-group")
                        .style("cursor", "pointer")
                        .attr("opacity", 0)
                        .call(d3.drag<SVGGElement, any>()
                            .on("start", (e, d) => {
                                if (!e.active) sim.alphaTarget(0.3).restart();
                                d.fx = d.x; d.fy = d.y;
                            })
                            .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
                            .on("end", (e, d) => {
                                if (!e.active) sim.alphaTarget(0);
                                if (!d.isMe) { d.fx = null; d.fy = null; }
                            })
                        );

                    // Physical Node (Circle)
                    group.append("circle")
                        .attr("class", "node-circle")
                        .attr("fill", "var(--surface)")
                        .style("filter", "url(#drop-shadow)");

                    // Identity Card (Unified name + stats)
                    const card = group.append("g").attr("class", "node-card")
                        .attr("transform", "translate(0, 36)");

                    card.append("rect").attr("class", "card-bg")
                        .attr("rx", 8).attr("ry", 8)
                        .attr("fill", "var(--surface)")
                        .attr("stroke", "var(--border)")
                        .style("backdrop-filter", "blur(12px)");

                    const stats = card.append("g").attr("class", "card-stats")
                        .attr("transform", "translate(0, 14)");

                    // Stats: OUT
                    const out = stats.append("g").attr("class", "stat-out");
                    out.append("text").attr("class", "label").attr("dx", -20).attr("dy", 0)
                        .attr("font-size", "7px").attr("font-weight", "900").attr("fill", "var(--muted)").text("OUT");
                    out.append("text").attr("class", "value").attr("dx", -4).attr("dy", 0)
                        .attr("font-size", "11px").attr("font-weight", "900").attr("fill", "var(--color-verified)");

                    // Stats: IN
                    const inc = stats.append("g").attr("class", "stat-in");
                    inc.append("text").attr("class", "label").attr("dx", 10).attr("dy", 0)
                        .attr("font-size", "7px").attr("font-weight", "900").attr("fill", "var(--muted)").text("IN");
                    inc.append("text").attr("class", "value").attr("dx", 24).attr("dy", 0)
                        .attr("font-size", "11px").attr("font-weight", "900").attr("fill", "#6366f1");

                    card.append("text").attr("class", "card-name")
                        .attr("text-anchor", "middle").attr("font-size", "11px")
                        .attr("font-weight", "700").attr("fill", "var(--foreground)");

                    return group;
                },
                update => update,
                exit => exit.transition().duration(200).attr("opacity", 0).remove()
            )
            .on("click", (e, d) => { e.stopPropagation(); onNodeClick(d); });

        nodes.transition().duration(500).attr("opacity", 1);

        // --- TICK (Visual Sync) ---
        sim.on("tick", () => {
            links
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            nodes.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        // Run heavy attribute updates in the data-update phase (not in tick!)
        nodes.each(function (d: any) {
            const el = d3.select(this);
            const hasSent = (d.interactionStats?.sent ?? 0) > 0;
            const hasRec = (d.interactionStats?.received ?? 0) > 0;
            const hasStats = hasSent || hasRec;

            // Update main circle
            el.select(".node-circle")
                .transition().duration(400)
                .attr("r", 24 + Math.min(d.strength * 2, 16))
                .attr("stroke", d.statusMix.verified >= d.statusMix.pending ? "#10b981" : "#f59e0b")
                .attr("stroke-width", d.statusMix.verified > 0 ? 3 : 2);

            // Update card layout
            const name = d.isMe ? "You" : d.label;
            const card = el.select(".node-card");
            const cardStats = card.select(".card-stats");

            const cardWidth = Math.max(name.length * 7 + 24, hasStats ? (hasSent && hasRec ? 72 : 40) : 0);
            const cardHeight = hasStats ? 44 : 24;

            card.select(".card-bg")
                .transition().duration(400)
                .attr("x", -cardWidth / 2)
                .attr("y", -12)
                .attr("width", cardWidth)
                .attr("height", cardHeight);

            cardStats.style("display", hasStats ? "" : "none");
            cardStats.select(".stat-out").style("display", hasSent ? "" : "none")
                .attr("transform", hasRec ? "translate(-2, 0)" : "translate(12, 0)")
                .select(".value").text(d.interactionStats?.sent ?? 0);
            cardStats.select(".stat-in").style("display", hasRec ? "" : "none")
                .attr("transform", hasSent ? "translate(2, 0)" : "translate(-12, 0)")
                .select(".value").text(d.interactionStats?.received ?? 0);

            card.select(".card-name")
                .text(name)
                .transition().duration(400)
                .attr("dy", hasStats ? 26 : 5);
        });

    }, [data, dimensions, filter, onNodeClick, onEdgeClick]);

    return (
        <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-[var(--background)] transition-colors duration-500">
            <svg ref={svgRef} className="w-full h-full block" />
            <div className="absolute inset-0 pointer-events-none bg-[var(--background-image-grid-pattern)]" />
            <div className="absolute inset-0 pointer-events-none bg-[var(--background-image-radial-fade)]" />
        </div>
    );
});
