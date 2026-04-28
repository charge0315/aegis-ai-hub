import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { NexusSettings } from '../types';

interface KnowledgeGraphProps {
  settings: NexusSettings | null;
  onKeywordToggle: (category: string, keyword: string, enabled: boolean) => void;
  onBrandToggle: (category: string, brand: string, enabled: boolean) => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'root' | 'category' | 'brand' | 'keyword';
  category?: string;
  enabled?: boolean;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ settings, onKeywordToggle, onBrandToggle }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!settings || !svgRef.current) return;

    const width = svgRef.current.clientWidth || 800;
    const height = 600;

    const nodes: Node[] = [{ id: 'nexus', name: 'Nexus', type: 'root' }];
    const links: Link[] = [];

    Object.entries(settings.interests.categories).forEach(([catName, data]) => {
      nodes.push({ id: catName, name: catName, type: 'category' });
      links.push({ source: 'nexus', target: catName });

      data.brands.forEach(brand => {
        const brandId = `${catName}-brand-${brand}`;
        nodes.push({ id: brandId, name: brand, type: 'brand', category: catName, enabled: true });
        links.push({ source: catName, target: brandId });
      });

      data.keywords.forEach(keyword => {
        const keywordId = `${catName}-kw-${keyword}`;
        nodes.push({ id: keywordId, name: keyword, type: 'keyword', category: catName, enabled: true });
        links.push({ source: catName, target: keywordId });
      });
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(80))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = g.append("g")
      .attr("stroke", "rgba(99, 102, 241, 0.2)")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(links)
      .enter().append("line");

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("cursor", "pointer")
      .on("click", (_event, d) => {
        if (d.type === 'keyword' && d.category) {
          onKeywordToggle(d.category, d.name, !d.enabled);
        } else if (d.type === 'brand' && d.category) {
          onBrandToggle(d.category, d.name, !d.enabled);
        }
      });

    node.call(d3.drag<SVGGElement, Node>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as unknown as (selection: d3.Selection<SVGGElement, Node, SVGGElement, unknown>) => void);

    // Node circles with gradients/glow
    const defs = svg.append("defs");
    const glow = defs.append("filter")
        .attr("id", "glow")
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");
    glow.append("feGaussianBlur")
        .attr("stdDeviation", "2.5")
        .attr("result", "coloredBlur");
    const feMerge = glow.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    node.append("circle")
      .attr("r", d => d.type === 'root' ? 16 : d.type === 'category' ? 10 : 6)
      .attr("fill", d => {
        if (d.type === 'root') return "#6366f1";
        if (d.type === 'category') return "#10b981";
        return d.enabled === false ? "#475569" : "#38bdf8";
      })
      .attr("filter", "url(#glow)")
      .attr("stroke", "rgba(255,255,255,0.3)")
      .attr("stroke-width", 2);

    node.append("text")
      .attr("dx", 15)
      .attr("dy", 5)
      .text(d => d.name)
      .attr("fill", "white")
      .attr("font-size", d => d.type === 'root' ? "14px" : "11px")
      .attr("font-weight", d => d.type === 'root' || d.type === 'category' ? "bold" : "normal")
      .attr("font-family", "Inter, sans-serif")
      .attr("style", "pointer-events: none; text-shadow: 0 2px 4px rgba(0,0,0,0.5);");

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x ?? 0)
        .attr("y1", d => (d.source as Node).y ?? 0)
        .attr("x2", d => (d.target as Node).x ?? 0)
        .attr("y2", d => (d.target as Node).y ?? 0);

      node
        .attr("transform", d => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // Zoom support
    svg.call(d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      }) as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void);

  }, [settings, onKeywordToggle, onBrandToggle]);

  return (
    <div className="w-full h-[600px] bg-black/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden relative shadow-inner">
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-white font-bold flex items-center gap-2 text-lg">
          Intelligence Knowledge Graph
          <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded-full border border-primary/20 font-mono tracking-tighter uppercase">Live Graph</span>
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          Visualizing semantic relationships across your interests.
        </p>
        <div className="flex gap-4 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Nexus Core</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Categories</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Signals</span>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 right-6 z-10 bg-slate-900/80 backdrop-blur-md p-3 rounded-lg border border-white/10 text-[10px] text-slate-400 max-w-[200px]">
        <p>💡 <b>Interactive:</b> Drag to reorganize, use mouse wheel to zoom, or click nodes to toggle weighting.</p>
      </div>

      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
