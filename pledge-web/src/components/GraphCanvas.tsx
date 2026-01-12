import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphPayload, GraphNode, GraphLink } from '../types';

interface GraphCanvasProps {
    data: GraphPayload;
    onNodeClick: (node: GraphNode) => void;
    onEdgeClick: (link: GraphLink) => void;
    width?: number;
    height?: number;
}

export const GraphCanvas = React.memo(({ data, onNodeClick, onEdgeClick }: GraphCanvasProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Store simulation and precise node state to prevent jumpiness on re-renders
    const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
    const oldNodesMap = useRef<Map<string, any>>(new Map());

    // Handle Resize
    useEffect(() => {
        if (!wrapperRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        resizeObserver.observe(wrapperRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Main D3 Rendering Logic
    useEffect(() => {
        if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);

        // One-time setup for layers
        let g = svg.select<SVGGElement>("g.main-group");
        if (g.empty()) {
            g = svg.append("g").attr("class", "main-group");

            // Zoom behavior
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.2, 4])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform);
                });
            svg.call(zoom);

            // Defs (Shadows/Gradients)
            const defs = svg.append("defs");
            const filter = defs.append("filter").attr("id", "drop-shadow").attr("height", "150%");
            filter.append("feGaussianBlur").attr("in", "SourceAlpha").attr("stdDeviation", 3).attr("result", "blur");
            filter.append("feOffset").attr("in", "blur").attr("dx", 0).attr("dy", 3).attr("result", "offsetBlur");
            filter.append("feFlood").attr("flood-color", "rgba(0,0,0,0.15)").attr("result", "color");
            filter.append("feComposite").attr("in2", "offsetBlur").attr("operator", "in").attr("in", "color").attr("result", "shadow");
            const feMerge = filter.append("feMerge");
            feMerge.append("feMergeNode").attr("in", "shadow");
            feMerge.append("feMergeNode").attr("in", "SourceGraphic");

            g.append("g").attr("class", "links");
            g.append("g").attr("class", "nodes");
        }

        // --- Data Preparation (Preserve Physics State) ---
        // We map new data to old objects if they exist to keep x,y,vx,vy properties
        const mutableNodes = data.nodes.map(d => {
            const old = oldNodesMap.current.get(d.id);
            if (old) {
                // Copy physics state from old node
                return Object.assign(Object.create(old), d, {
                    x: old.x, y: old.y, vx: old.vx, vy: old.vy
                });
            }
            // New node spawns near center
            return { ...d, x: width / 2 + (Math.random() - 0.5) * 50, y: height / 2 + (Math.random() - 0.5) * 50 };
        }) as (GraphNode & d3.SimulationNodeDatum)[];

        // Update map for next render
        oldNodesMap.current.clear();
        mutableNodes.forEach(n => oldNodesMap.current.set(n.id, n));

        const mutableLinks = data.links.map(d => ({ ...d }));

        // --- Simulation Setup/Update ---
        if (!simulationRef.current) {
            simulationRef.current = d3.forceSimulation()
                .force("charge", d3.forceManyBody().strength(-400))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("collide", d3.forceCollide().radius(45).strength(0.7));
        }

        const simulation = simulationRef.current;

        // Update forces
        simulation.nodes(mutableNodes);

        // We need to re-initialize the link force every time because the link structure changes completely
        simulation.force("link", d3.forceLink(mutableLinks)
            .id((d: any) => d.id)
            .distance(120) // Slightly tighter
            .strength(0.5) // Allow some flexibility
        );

        // Heat up simulation slightly to allow drift to new positions
        simulation.alpha(0.5).restart();


        // --- Rendering with Transitions (Enter/Update/Exit) ---

        // 1. LINKS
        const linkGroup = g.select(".links");
        const link = linkGroup.selectAll<SVGLineElement, any>("line")
            .data(mutableLinks, (d) => d.source.id + "-" + d.target.id); // Unique key

        link.exit()
            .transition().duration(300)
            .attr("opacity", 0)
            .remove();

        const linkEnter = link.enter().append("line")
            .attr("stroke-width", 0)
            .attr("opacity", 0)
            .attr("stroke-linecap", "round");

        const linkMerge = linkEnter.merge(link)
            .attr("cursor", "pointer")
            .on("click", (event, d) => {
                event.stopPropagation();
                onEdgeClick(d as unknown as GraphLink);
            });

        linkMerge.transition().duration(500)
            .attr("opacity", 0.6)
            .attr("stroke", (d) => {
                if (d.verifiedCount > 0) return "#94a3b8"; // slate-400
                if (d.pendingCount > 0) return "#fbbf24"; // amber-400
                return "#e2e8f0"; // slate-200
            })
            .attr("stroke-width", d => Math.max(2, Math.min(6, d.verifiedCount + 1)))
            .attr("stroke-dasharray", d => d.pendingCount > 0 && d.verifiedCount === 0 ? "4,4" : "0");


        // 2. NODES
        const nodeGroup = g.select(".nodes");
        const node = nodeGroup.selectAll<SVGGElement, any>("g")
            .data(mutableNodes, (d) => d.id);

        // EXIT
        node.exit()
            .transition().duration(300)
            .attr("transform", (d: any) => `translate(${d.x},${d.y}) scale(0)`) // Shrink out
            .attr("opacity", 0)
            .remove();

        // ENTER
        const nodeEnter = node.enter().append("g")
            .attr("cursor", "pointer")
            .attr("opacity", 0)
            // Start slightly scaled down
            .call(s => s.attr("transform", d => `translate(${d.x},${d.y}) scale(0.5)`))
            .call(d3.drag<SVGGElement, any>()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended)
            );

        // Node Visuals (Enter only)

        // Main circle
        nodeEnter.append("circle")
            .attr("class", "main-circle")
            .attr("r", d => 24 + Math.min(d.strength * 2, 16))
            .attr("fill", "#ffffff")
            .style("filter", "url(#drop-shadow)");

        // Label Bg
        nodeEnter.append("rect")
            .attr("class", "label-bg")
            .attr("rx", 6).attr("ry", 6)
            .attr("fill", "rgba(255, 255, 255, 0.85)")
            .attr("height", 18);

        // Label Text
        nodeEnter.append("text")
            .attr("class", "label-text")
            .attr("dy", 46)
            .attr("text-anchor", "middle")
            .attr("font-size", "11px")
            .attr("font-weight", "600")
            .attr("font-family", "system-ui")
            .attr("fill", "#1e293b")
            .style("pointer-events", "none");

        // "Me" indicator
        nodeEnter.filter(d => d.id === 'me')
            .append("circle")
            .attr("r", 6)
            .attr("fill", "#1e293b");


        // UPDATE (Merge)
        const nodeMerge = nodeEnter.merge(node);

        nodeMerge
            .on("click", (event, d) => {
                event.stopPropagation();
                onNodeClick(d as unknown as GraphNode);
            });

        // Transition nodes to new state
        nodeMerge.transition().duration(500)
            .attr("opacity", 1)
            .attr("transform", d => `translate(${d.x},${d.y}) scale(1)`);

        // Update colors based on current status (e.g. if status changes)
        nodeMerge.select(".main-circle")
            .transition().duration(500)
            .attr("r", d => 24 + Math.min(d.strength * 2, 16))
            .attr("stroke", d => {
                if (d.statusMix.verified >= d.statusMix.pending) return "#059669"; // Emerald 600
                return "#d97706"; // Amber 600
            })
            .attr("stroke-width", d => d.statusMix.verified > 0 ? 3 : 2)
            .attr("stroke-dasharray", d => (d.statusMix.verified === 0 && d.statusMix.pending > 0) ? "4,2" : "0");

        // Update label text and bg size
        nodeMerge.select(".label-text")
            .text(d => d.id === 'me' ? 'You' : d.label);

        nodeMerge.select(".label-bg")
            .attr("x", d => -(((d.id === 'me' ? 'You' : d.label).length * 7) / 2) - 4)
            .attr("y", 33)
            .attr("width", d => (d.id === 'me' ? 'You' : d.label).length * 7 + 8);

        // Hover Effects
        nodeMerge.on("mouseover", function () {
            d3.select(this).select(".main-circle").attr("stroke", "#3b82f6");
        }).on("mouseout", function (_event, d: any) {
            d3.select(this).select(".main-circle").attr("stroke",
                d.statusMix.verified >= d.statusMix.pending ? "#059669" : "#d97706"
            );
        });

        /**
         * Simulation Tick
         * Updates the positions of SVG elements based on the D3 simulation results.
         * We specifically separate scale transitions from position updates to avoid jitter.
         */
        simulation.on("tick", () => {
            linkMerge
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            nodeMerge
                .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        // --- Drag Handlers ---
        function dragstarted(event: any, d: any) {
            if (!event.active) simulation?.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation?.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return () => {
            // Optional: simulation.stop() on unmount if multiple graphs are used
        };
    }, [data, dimensions, onNodeClick, onEdgeClick]);

    return (
        <div ref={wrapperRef} className="w-full h-full relative overflow-hidden bg-grid-pattern bg-[length:40px_40px]">
            <svg ref={svgRef} className="w-full h-full block" />
            <div className="absolute inset-0 pointer-events-none bg-radial-fade"></div>
        </div>
    );
});
