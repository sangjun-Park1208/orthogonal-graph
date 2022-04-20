import * as d3 from 'd3';
import { TreemapSelections } from '../selections/treemap-selections.module';
import { TreemapData } from '../datas/treemap-data.module';

export class TreemapEventListeners { 
  private treemapData: TreemapData;
  private treemapSelections: TreemapSelections;

  constructor (treemapData: TreemapData, treemapSelections: TreemapSelections){
    this.treemapData = treemapData;
    this.treemapSelections = treemapSelections;
  }

  attachedEdgesHighlightOn (event: MouseEvent, d: any) {
    const clusterCount = this.treemapData.getClusterCount();
    const strokeWidth = this.treemapData.strokeWidth;

    const edges = this.treemapSelections.getEdges(); 

    // edges(from) : red.
    // starts at selected node.
    edges.filter((m: any, i) => {
      return m.from == +d.id - clusterCount;
    })
      .attr('stroke', 'red') // m == from
      .attr("stroke-width", strokeWidth.edge * 1.1)
      .attr("stroke-opacity", 1);
    
    // edges(to) : green.
    // ends at selected node.
    edges.filter((m: any, i) => {
      return m.to == +d.id - clusterCount;
    })  
      .attr('stroke', 'green') // m == to
      .attr("stroke-width", strokeWidth.edge * 1.1)
      .attr("stroke-opacity", 1);
  };

  // tmp nodes, edges mouseout event listener
  attachedEdgesHighlightOff (event: MouseEvent, d: any) {
    const strokeWidth = this.treemapData.strokeWidth;
    const opacity = this.treemapData.opacity;
    const edges = this.treemapSelections.getEdges()

    edges.attr("stroke", "steelblue")
      .attr("stroke-width", strokeWidth.edge)
      .attr("stroke-opacity", opacity.edge);
  }
  
  adjacentNodesHighlightOn (event: MouseEvent, d: any) {
    const strokeWidth = this.treemapData.strokeWidth;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    const colorZ = this.treemapData.colorZ;

    const nodes = this.treemapSelections.getNodes();
    // console.log("nodes", nodes);
    nodes.attr("fill", (d:any) => {
      const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
      // console.log("hsl convertion", hsl);
      return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
    });

    nodes.filter((m, i) => {
      return m === d;
    })
      .attr("stroke", "black")
      .attr("stroke-width", strokeWidth.nodes)
      .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
      .attr("fill-opacity", 1);
    // Highlight 'red' nodes : starts from selected node(mouse-overed node).
    let linkedNodes_from: number[] = [];
    let countNum = 0;
    this.colorLinkedNodes_from1(d, linkedNodes_from);
    for(; countNum<linkedNodes_from.length; countNum++){
      nodes.filter((m: any, i: any) => {
        return +m.id - clusterCount === linkedNodes_from[countNum];
      })
        .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
        .attr("stroke", "red")
        .attr("stroke-width", strokeWidth.nodes)
        .attr("fill-opacity", 1);
    }

    // Highlight 'green' nodes : ends at selected node.
    let linkedNodes_to: number[] = [];
    countNum = 0;
    this.colorLinkedNodes_to1(d, linkedNodes_to);
    for(; countNum<linkedNodes_to.length; countNum++){
      nodes.filter((m: any, i: any) => {
        return +m.id - clusterCount === linkedNodes_to[countNum];
      })
        .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
        .attr("stroke", "green")
        .attr("stroke-width", strokeWidth.nodes)
        .attr("fill-opacity", 1);
    }
    // console.log("linkedNodes from, to", linkedNodes_from, linkedNodes_to)
  }
  
  adjacentNodesHighlightOff (event: MouseEvent, d: any) {
    // console.log("node data", d);
    const colorZ = this.treemapData.colorZ;
    const opacity = this.treemapData.opacity;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    
    const clusters = this.treemapSelections.getClusters();
    const nodes = this.treemapSelections.getNodes()
      // .filter(m => {
      //   return d.data.parentId == m.data.data.id;
      // });

    let nodesSelection = nodes
      // .select("g")
      // .selectAll("rect")
      // .attr("fill", (d:any) => {
      //   const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
      //   // console.log("hsl convertion", hsl);
      //   return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      // })
      .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
      .attr("fill-opacity", opacity.node)
      .attr("stroke", "none");

    // console.log("clusters", clusters);
    // clusters
    //   .filter((m: any) => {
    //     return d.data.parentId != m.data.data.id; 
    //   })
    //   .select("g")
    //   .selectAll("rect")
    //   .attr("fill", (d:any) => {
    //     const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
    //     return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
    //   })
    //   .attr("fill-opacity", opacity.node)
    
    // console.log("nodesSelection", nodesSelection);
  }

  colorLinkedNodes_from1 (d: any, linkedNodes: number[]) { // for linkedNodes_from.push()
    const clusterCount = this.treemapData.getClusterCount();
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.from === +d.id - clusterCount;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.to);
      return h.to;
    });
  };

  colorLinkedNodes_to1 (d: any, linkedNodes: number[]) { // for linkedNodes_to.push() 
    const clusterCount = this.treemapData.getClusterCount();
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.to === +d.id - clusterCount;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.from);
      return h.from;
    });
  };
  // cluster mouseover, mouseout event listener
  clusterHighlightOn = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        // console.log(+d.data.data.id, +m.data.data.id);
        return +d.data.data.id == +m.data.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster*0.5);
    // console.log(d.data.data.id, clusterNodesSelection);
  }

  clusterHighlightOff = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        // console.log(+d.data.data.id, +m.data.data.id);
        return +d.data.data.id == +m.data.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster);

    // console.log("clusterNodesSelection", clusterNodesSelection);
  }

  clusterStrokeHighlightOn = (event: any, d: any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => m == d)
    const opacity = this.treemapData.opacity;
    const strokeWidth = this.treemapData.strokeWidth;

    cluster
      .select("rect")
      .attr("stroke-width", strokeWidth.cluster*1.1)
      .attr("stroke-opacity", opacity.cluster*1.2);
  }

  clusterStrokeHighlightOff = (event: any, d: any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => m == d);
    const opacity = this.treemapData.opacity;
    const strokeWidth = this.treemapData.strokeWidth;

    cluster
      .select("rect")
      .attr("stroke-width", strokeWidth.cluster)
      .attr("stroke-opacity", opacity.cluster);
    // clusters.
  }

  clusterNumberOn = (event: any, d: any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => m == d);
      
    cluster
      .select("text")
      .attr("opacity", 1);
  }

  clusterNumberOff = (event: any, d: any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => m == d);

    cluster
      .select("text")
      .attr("opacity", 0);
  }
}
