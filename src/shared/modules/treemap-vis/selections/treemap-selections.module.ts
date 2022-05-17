import { TreemapData } from '../datas/treemap-data.module';
import * as d3 from 'd3';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';

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
      .attr("stroke-opacity", this.treemapData.opacity.edge);
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
        return (m.x1 - m.x0 > 5) ? xScale(m.x1 - m.x0) + "px" : xScale(5) + "px";
      })
      .attr("height", (d:any) => {
        let m = d.data;
        return (m.y1 - m.y0 > 5) ? yScale(m.y1 - m.y0) + "px" : yScale(5) + "px";
      })
      .attr("x", (d:any) => {
        let m = d.data;
        return xScale(m.x0) + "px";
      })
      .attr("y", (d:any) => {
        let m = d.data;
        return yScale(m.y0) + "px";
      });

    this.clusters.append("text")
      .attr("opacity", 0)
      .attr("dx", d => xScale((d.data.x0 + d.data.x1) / 2) + "px")
      .attr("dy", d => yScale(d.data.y0 + 12) + "px")
      .attr("font-size", this.treemapData.nodeSize*1.2 + "px")
      .attr("text-anchor", "middle")
      .style("display", "inline-block")
      .style("pointer-events", "none")
      .html(d => `Cluster ${d.data.id}`);
    console.log("clusters", this.clusters);

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
      .attr("width", d => xScale(d.x1 - d.x0) + "px")
      .attr("height", d => xScale(d.y1 - d.y0) + "px")
      .attr("x", d =>  (xScale(d.x0)) + "px")
      .attr("y", d =>  (xScale(d.y0)) + "px")
      .attr("fill", (d:any) => {
        return this.treemapData.colorZ(+d.data.area / areaCount);
      })
      .attr("fill-opacity", this.treemapData.opacity.node);
    console.log("nodes", this.nodes);

    this.nodeTexts = this.clusters.append("g")
      .attr("id", d => "cluster_" + d.data.id + "_texts")
      .selectAll("text")
      .data(d => d.children)
      .join("text")
      .attr("x", d => xScale((d.x0 + this.treemapData.nodeSize*0.5)) + "px")
      .attr("y", d => yScale(d.y0 + this.treemapData.nodeSize*0.6) + "px")
      .attr("font-size", this.treemapData.nodeSize*0.47 + "px")
      .style("display", "inline-block")
      .style("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .html(d => `${d.data.id}`);
    //
  }

  drawEdge(d: any): any {
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeXY = this.treemapData.getNodeXY();

    let k = `M${xScale(nodeXY[d.from-1].x)}, ${yScale(nodeXY[d.from-1].y)}`; // 'path' starting point
    let xdif = nodeXY[d.to-1].x - nodeXY[d.from-1].x; // x diff
    let ydif = nodeXY[d.to-1].y - nodeXY[d.from-1].y; // y diff
    let abs_xdif = Math.abs(xdif); // |x diff|
    let abs_ydif = Math.abs(ydif); // |y diff|

    let xhalf = xScale((nodeXY[d.to-1].x + nodeXY[d.from-1].x) /2); // x's half point between source & target.
    let yhalf = yScale((nodeXY[d.to-1].y + nodeXY[d.from-1].y) /2); // y's half point between source & target.

    if(abs_xdif > abs_ydif) { // if |x diff| > |y diff|
      k += `L${xScale(nodeXY[d.from-1].x)}, ${yhalf}`; // starts drawing : Vertical.
      k += `L${xScale(nodeXY[d.to-1].x)}, ${yhalf}`;
      k += `L${xScale(nodeXY[d.to-1].x)}, ${yScale(nodeXY[d.to-1].y)}`;
    }
    else { // if |x diff| <= |y diff|
      k += `L${xhalf}, ${yScale(nodeXY[d.from-1].y)}`; // starts drawing : Horizontal.
      k += `L${xhalf}, ${yScale(nodeXY[d.to-1].y)}`;
      k += `L${xScale(nodeXY[d.to-1].x)}, ${yScale(nodeXY[d.to-1].y)}`; 
    }
    return k;
  }
  // drawEdge(d: any): any {
  //   const xScale = this.treemapData.xScale;
  //   const yScale = this.treemapData.yScale;
  //   const nodeXY = this.treemapData.getNodeXY();
    
  //   let k = `M${xScale(nodeXY[d.from-1].x)}, ${yScale(nodeXY[d.from-1].y)}`; // 'path' starting point
  //   let xdif = nodeXY[d.to-1].x - nodeXY[d.from-1].x; // x diff
  //   let ydif = nodeXY[d.to-1].y - nodeXY[d.from-1].y; // y diff
  //   let abs_xdif = Math.abs(xdif); // |x diff|
  //   let abs_ydif = Math.abs(ydif); // |y diff|

  //   let xhalf = xScale((nodeXY[d.to-1].x + nodeXY[d.from-1].x) /2); // x's half point between source & target.
  //   let yhalf = yScale((nodeXY[d.to-1].y + nodeXY[d.from-1].y) /2); // y's half point between source & target.

  //   if(abs_xdif > abs_ydif) { // if |x diff| > |y diff|
  //     k += `L${xScale(nodeXY[d.from-1].x)}, ${yhalf}`; // starts drawing : Vertical.
  //     k += `L${xScale(nodeXY[d.to-1].x)}, ${yhalf}`;
  //     k += `L${xScale(nodeXY[d.to-1].x)}, ${yScale(nodeXY[d.to-1].y)}`;
  //     Edge_list.push(new Edge_info(1))//e_case,to_cluster,from_cluster
  //     Edge_list[Edge_list.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
  //   }
  //   else { // if |x diff| <= |y diff|
  //     k += `L${xhalf}, ${yScale(nodeXY[d.from-1].y)}`; // starts drawing : Horizontal.
  //     k += `L${xhalf}, ${yScale(nodeXY[d.to-1].y)}`;
  //     k += `L${xScale(nodeXY[d.to-1].x)}, ${yScale(nodeXY[d.to-1].y)}`;
  //     Edge_list.push(new Edge_info(2))//e_case,to_cluster,from_cluster
  //     Edge_list[Edge_list.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
  //   }
  //   total_length += abs_xdif + abs_ydif;
  //   return k;
  // }
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