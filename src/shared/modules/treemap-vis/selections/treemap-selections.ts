import { TreemapData } from '../datas/treemap-data';
import * as d3 from 'd3';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data';

export class TreemapSelections { 
  private treemapData: TreemapData;
  private svg: d3.Selection<any, unknown, null, undefined>;

  private edges: d3.Selection<d3.BaseType | SVGPathElement, IBranchData, SVGGElement, unknown>;
  private clusters: d3.Selection<d3.BaseType | SVGGElement, IClusterData, SVGGElement, unknown>;
  private nodes: d3.Selection<d3.BaseType | SVGRectElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>;
  private nodeTexts: d3.Selection<d3.BaseType | SVGTextElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>;
  
  constructor (treemapData: TreemapData, svg: d3.Selection<any, unknown, null, undefined>){
    this.treemapData = treemapData;
    this.svg = svg;
    const colorZ = treemapData.colorZ;
    const clusterCount = treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();

    this.edges = this.svg.append("g")
      .attr("id", "edges")
      .selectAll("path")
      .data(this.treemapData.branch)
      .join("path")
      .attr("d", (d: any) => this.drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("stroke-width", this.treemapData.strokeWidth.edge)
      .attr("fill", "none")
      .attr("stroke-opacity", this.treemapData.opacity.edge)
      .attr("shape-rendering", "crispEdges");
    console.log("edges", this.edges);

    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
  
    this.clusters = this.svg.append("g")
      .attr("id", "clusters_and_nodes")
      .selectAll("g")
      .data(this.treemapData.getClustersWithNodes())
      .join("g")
      .attr("id", (d:any) => ("cluster_" + (d.data.data.id)));
  
    this.clusters.append("rect")
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.data.id / clusterCount));
        // console.log("hsl convertion", hsl);
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      })
      // .attr("fill", "hsl(0, 0%, 70%)")
      .attr("fill-opacity", this.treemapData.opacity.cluster)
      .attr("width", (d:any) => {
        let m = d.data;
        return (m.x1 - m.x0 > 5) ? xScale(m.x1 - m.x0)  : xScale(5) ;
      })
      .attr("height", (d:any) => {
        let m = d.data;
        return (m.y1 - m.y0 > 5) ? yScale(m.y1 - m.y0)  : yScale(5) ;
      })
      .attr("x", (d:any) => {
        let m = d.data;
        return xScale(m.x0) ;
      })
      .attr("y", (d:any) => {
        let m = d.data;
        return yScale(m.y0) ;
      })
     .attr("shape-rendering", "crispEdges");

    // this.clusters.append("text")
    //   .attr("opacity", 0)
    //   .attr("dx", d => xScale((d.data.x0 + d.data.x1) / 2) )
    //   .attr("dy", d => yScale(d.data.y0 + this.treemapData.nodeSize*1.5))
    //   .attr("font-size", this.treemapData.nodeSize)
    //   .attr("text-anchor", "middle")
    //   .style("display", "inline-block")
    //   .style("pointer-events", "none")
    //   .html(d => `Cluster ${d.data.id}`)
    //   .attr("shape-rendering", "crispEdges");
    // console.log("clusters", this.clusters);

    this.nodes = this.clusters.append("g")
      .attr("id", d => "cluster_" + d.data.id + "_nodes")
      .selectAll("rect")
      .data(d => d.children)
      .join("rect")
      .attr("id", (d:any) => {
        return d.data.id;
      })
      // .attr("width", (d:any) => {
      //   return (d.x1 - d.x0 > 5) ? xScale(d.x1 - d.x0) : xScale(5);
      // })
      // .attr("height", (d:any) => {
      //   return (d.y1 - d.y0 > 5) ? yScale(d.y1 - d.y0) : yScale(5);
      // })
      .attr("width", d => xScale(d.x1 - d.x0) )
      .attr("height", d => xScale(d.y1 - d.y0) )
      .attr("x", d =>  (xScale(d.x0)) )
      .attr("y", d =>  (xScale(d.y0)) )
      .attr("fill", (d:any) => {
        return this.treemapData.colorZ(+d.data.area / areaCount);
      })
      .attr("fill-opacity", this.treemapData.opacity.node)
      .attr("shape-rendering", "crispEdges");
    console.log("nodes", this.nodes);

    this.nodeTexts = this.clusters.append("g")
      .attr("id", d => "cluster_" + d.data.id + "_texts")
      .selectAll("g")
      .data(d => d.children)
      .join("g")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", xScale(this.treemapData.nodeSize * 0.45))
      .style("display", "inline-block")
      .style("pointer-events", "none")
      .attr("shape-rendering", "crispEdges");

    this.nodeTexts.filter(d => d.data.id / 1000 >= 1)
      .append("text")
      .attr("id", "a")
      .attr("x", d => xScale((d.x0 + d.x1) / 2))
      .attr("y", d => yScale(d.y0 + this.treemapData.nodeSize * 0.45))
      .html(d => {
        return `${d.data.id}`.toString().substring(0,2);
      })

    this.nodeTexts.filter(d => d.data.id / 1000 >= 1)
      .append("text")
      .attr("id", "b")
      .attr("x", d => xScale((d.x0 + d.x1) / 2))
      .attr("y", d => yScale(d.y0 + this.treemapData.nodeSize * 0.9))
      .html(d => {
        return `${d.data.id}`.toString().substring(2,4);
      });

    this.nodeTexts.filter(d => d.data.id / 1000 < 1)
      .append("text")
      .attr("x", d => xScale((d.x0 + d.x1) / 2))
      .attr("y", d => yScale(d.y0 + this.treemapData.nodeSize * 0.45))
      .html(d => {
        return `${d.data.id}`;
      });
    //
  }

  drawEdge(d: any): any {
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeXY = this.treemapData.getNodeXY();

    const fromNode = nodeXY.find(function (m) {
      return d.from == m.id;
    }) as IBusObjectData;
    const toNode = nodeXY.find(function (m) {
      return d.to == m.id;
    }) as IBusObjectData;

    let k = `M${xScale(fromNode.x)}, ${yScale(fromNode.y)}`; // 'path' starting point
    let xdif = toNode.x - fromNode.x; // x diff
    let ydif = toNode.y - fromNode.y; // y diff
    let absXdif = Math.abs(xdif); // |x diff|
    let absYdif = Math.abs(ydif); // |y diff|

    let xhalf = xScale((toNode.x + fromNode.x) /2); // x's half point between source & target.
    let yhalf = yScale((toNode.y + fromNode.y) /2); // y's half point between source & target.

    if(absXdif > absYdif) { // if |x diff| > |y diff|
      k += `L${xScale(fromNode.x)}, ${yhalf}`; // starts drawing : Vertical.
      k += `L${xScale(toNode.x)}, ${yhalf}`;
      k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`;
    }
    else { // if |x diff| <= |y diff|
      k += `L${xhalf}, ${yScale(fromNode.y)}`; // starts drawing : Horizontal.
      k += `L${xhalf}, ${yScale(toNode.y)}`;
      k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`; 
    }
    return k;
  }
  
  getSvg() {
    return this.svg;
  };

  setEdges(edges: d3.Selection<d3.BaseType | SVGPathElement, IBranchData, SVGGElement, unknown>) {
    this.edges = edges;
  };

  getEdges() {
    return this.edges;
  };

  setClusters(clusters: d3.Selection<d3.BaseType | SVGGElement, IClusterData, SVGGElement, unknown>) {
    this.clusters = clusters;
  };

  getClusters() {
    return this.clusters;
  };

  setNodes(nodes: d3.Selection<d3.BaseType | SVGRectElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>) {
    this.nodes = nodes;
  };

  getNodes() {
    return this.nodes;
  };

  setNodeTexts(nodeTexts: d3.Selection<d3.BaseType | SVGTextElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>) {
    this.nodes = nodeTexts;
  };

  getNodeTexts() {
    return this.nodeTexts;
  };
}
