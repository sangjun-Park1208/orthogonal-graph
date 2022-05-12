import * as d3 from 'd3';
import { TreemapSelections } from '../selections/treemap-selections.module';
import { TreemapData } from '../datas/treemap-data.module';

export class TreemapEventListeners { 
  private treemapData: TreemapData;
  private treemapSelections: TreemapSelections;
  private static zoomBool: Boolean;

  constructor (treemapData: TreemapData, treemapSelections: TreemapSelections){
    this.treemapData = treemapData;
    this.treemapSelections = treemapSelections;
    TreemapEventListeners.zoomBool = false;
  }

  attachedEdgesHighlightOn (event: MouseEvent, d: any) {
    if (TreemapEventListeners.zoomBool){
      return;
    }
    this.attachedEdgesHighlightOff(event, d);
    const clusterCount = this.treemapData.getClusterCount();
    const strokeWidth = this.treemapData.strokeWidth;

    const edges = this.treemapSelections.getEdges(); 

    // edges(from) : red.
    // starts at selected node.
    edges.filter((m: any, i) => {
      return m.from == +d.data.id;
    })
      .attr('stroke', 'red') // m == from
      .attr("stroke-width", strokeWidth.edge * 1.1)
      .attr("stroke-opacity", 1);
    
    // edges(to) : green.
    // ends at selected node.
    edges.filter((m: any, i) => {
      return m.to == +d.data.id;
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
    if (TreemapEventListeners.zoomBool){
      return;
    }
    this.adjacentNodesHighlightOff(event, d);

    const strokeWidth = this.treemapData.strokeWidth;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    const colorZ = this.treemapData.colorZ;

    const nodes = this.treemapSelections.getNodes();
    nodes.attr("fill", (d:any) => {
      const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
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
        return +m.data.id === linkedNodes_from[countNum];
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
        return +m.data.id === linkedNodes_to[countNum];
      })
        .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
        .attr("stroke", "green")
        .attr("stroke-width", strokeWidth.nodes)
        .attr("fill-opacity", 1);
    }
  }
  
  adjacentNodesHighlightOff (event: MouseEvent, d: any) {
    const colorZ = this.treemapData.colorZ;
    const opacity = this.treemapData.opacity;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    
    const clusters = this.treemapSelections.getClusters();
    const nodes = this.treemapSelections.getNodes()

    let nodesSelection = nodes.attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
      .attr("fill-opacity", opacity.node)
      .attr("stroke", "none");
  }

  adjacentNodesTextHighlightOn (event: MouseEvent, d: any) {
    const clusters = this.treemapSelections.getClusters();
    const areaCount = this.treemapData.getAreaCount();
    const colorZ = this.treemapData.colorZ;

    const nodeTexts = this.treemapSelections.getNodeTexts();
    // Highlight 'red' nodes : starts from selected node(mouse-overed node).
    nodeTexts.style("fill", "white");

    nodeTexts.filter((m, i) => {
      return m === d;
    })
      .style("fill", "black")

    let linkedNodes_from: number[] = [];
    let countNum = 0;
    this.colorLinkedNodes_from1(d, linkedNodes_from);
    for(; countNum<linkedNodes_from.length; countNum++){
      nodeTexts.filter((m: any, i: any) => {
        return +m.data.id === linkedNodes_from[countNum];
      })
        .style("fill", "black")
    }

    // Highlight 'green' nodes : ends at selected node.
    let linkedNodes_to: number[] = [];
    countNum = 0;
    this.colorLinkedNodes_to1(d, linkedNodes_to);
    for(; countNum<linkedNodes_to.length; countNum++){
      nodeTexts.filter((m: any, i: any) => {
        return +m.data.id === linkedNodes_to[countNum];
      })
        .style("fill", "black")
    }
  }
  
  adjacentNodesTextHighlightOff (event: MouseEvent, d: any) {
    const colorZ = this.treemapData.colorZ;
    const opacity = this.treemapData.opacity;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    
    const clusters = this.treemapSelections.getClusters();
    const nodeTexts = this.treemapSelections.getNodeTexts()

    let nodeTextsManipulation = nodeTexts
      .style("fill", "black");
  }

  colorLinkedNodes_from1 (d: any, linkedNodes: number[]) { // for linkedNodes_from.push()
    const clusterCount = this.treemapData.getClusterCount();
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.from === +d.data.id;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.to);
      return h.to;
    });
  };

  colorLinkedNodes_to1 (d: any, linkedNodes: number[]) { // for linkedNodes_to.push() 
    const clusterCount = this.treemapData.getClusterCount();
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.to === +d.data.id;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.from);
      return h.from;
    });
  };

  // cluster mouseover, mouseout event listener
  clusterHighlightOn = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        return +d.data.data.id == +m.data.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster*0.5);
  }

  clusterHighlightOff = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        return +d.data.data.id == +m.data.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster);
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

  magnifyViewBox = (event: Event, d: any) => {
    const svg = this.treemapSelections.getSvg();
    const root = this.treemapData.getRoot();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;

    const marginLeft = this.treemapData.size.margin.left;
    const marginRight = this.treemapData.size.margin.right;
    const marginTop = this.treemapData.size.margin.top;
    const marginBottom = this.treemapData.size.margin.bottom;

    let linkedNodes_from: number[] = [];
    let countNum = 0;
    this.colorLinkedNodes_from1(d, linkedNodes_from);

    let linkedNodes_to: number[] = [];
    countNum = 0;
    this.colorLinkedNodes_to1(d, linkedNodes_to);

    let linkedNodes: number[] = linkedNodes_from.concat(linkedNodes_to);

    let linkedNodesData: any[] = [];
    linkedNodesData.push(root.find(m => d.data.id == m.data.id && m.data.parentId != 0));
    linkedNodes.forEach(d => {
      linkedNodesData.push(root.find(m => {
        return d == m.data.id && m.data.parentId != 0;
      }));
    })

    const minX = xScale(d3.min(linkedNodesData, d => d.x0));

    const minY = yScale(d3.min(linkedNodesData, d => d.y0));

    const maxX = xScale(d3.max(linkedNodesData, d => d.x1));

    const maxY = yScale(d3.max(linkedNodesData, d => d.y1));

    svg.transition()
      .ease(d3.easeLinear)
      .duration(1000)
      .attr("viewBox", `${minX - marginLeft} ${minY - marginTop} ${maxX - minX + marginLeft + marginRight} ${maxY - minY + marginTop + marginBottom}`);
  }

  restoreViewBox = (event: any, d:any) => {
    const svg = this.treemapSelections.getSvg();
    const size = this.treemapData.size;

    svg.transition()
      .ease(d3.easeLinear)
      .duration(1000)
      .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width + size.margin.right}, ${size.viewBox.height + size.margin.right}`);
  }
}
