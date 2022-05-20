import * as d3 from 'd3';
import { TreemapSelections } from '../selections/treemap-selections';
import { TreemapData } from '../datas/treemap-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';

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
    const svg = this.treemapSelections.getSvg();
    const edges = this.treemapSelections.getEdges();
    const size = this.treemapData.size;
    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentViewportWidth = +currentViewBox[2];
    const xMagnification = defaultViewportWidth / currentViewportWidth;
    const strokeWidth = this.treemapData.strokeWidth.edge / xMagnification;

    // edges(from) : red.
    // starts at selected node.
    edges.filter((m: any, i) => {
      return m.from == +d.data.id;
    })
      .attr('stroke', 'red') // m == from
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", 1);
    
    // edges(to) : green.
    // ends at selected node.
    edges.filter((m: any, i) => {
      return m.to == +d.data.id;
    })  
      .attr('stroke', 'green') // m == to
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", 1);
  };

  // tmp nodes, edges mouseout event listener
  attachedEdgesHighlightOff (event: MouseEvent, d: any) {
    const opacity = this.treemapData.opacity;
    const svg = this.treemapSelections.getSvg();
    const edges = this.treemapSelections.getEdges();
    const size = this.treemapData.size;
    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentViewportWidth = +currentViewBox[2];
    const xMagnification = defaultViewportWidth / currentViewportWidth;
    const strokeWidth = this.treemapData.strokeWidth.edge / xMagnification;

    edges.attr("stroke", "steelblue")
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", opacity.edge);
  }
  
  adjacentNodesHighlightOn (event: MouseEvent, d: any) {
    if (TreemapEventListeners.zoomBool){
      return;
    }
    this.adjacentNodesHighlightOff(event, d);

    const svg = this.treemapSelections.getSvg();
    const nodes = this.treemapSelections.getNodes();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const size = this.treemapData.size;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    const colorZ = this.treemapData.colorZ;

    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentViewportWidth = +currentViewBox[2];
    const xMagnification = defaultViewportWidth / currentViewportWidth;
    let nodeSize = this.treemapData.nodeSize / xMagnification;
    // console.log("node size comparision", this.treemapData.nodeSize, nodeSize);
    // console.log(defaultViewportWidth, currentViewBox, currentViewportWidth, xMagnification);

    nodes.attr("width", d => xScale(nodeSize) )
      .attr("height", d => yScale(nodeSize) )
      .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
      .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2))
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      });

    nodeSize *= 1.75;
    nodes.filter((m, i) => {
      return m === d;
    })
      .attr("stroke", "black")
      .attr("stroke-width", xScale(nodeSize * 0.2))
      .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
      .attr("fill-opacity", 1)
      .attr("width", d => xScale(nodeSize))
      .attr("height", d => yScale(nodeSize))
      .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
      .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2));

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
        .attr("stroke-width", xScale(nodeSize * 0.2))
        .attr("fill-opacity", 1)
        .attr("width", d => xScale(nodeSize))
        .attr("height", d => yScale(nodeSize))
        .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
        .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2));
    }

    // Highlight 'green' nodes : ends at selected node.
    let linkedNodes_to: number[] = [];
    countNum = 0;
    this.colorLinkedNodes_to1(d, linkedNodes_to);
    for(; countNum<linkedNodes_to.length; countNum++){
      const toNode = nodes.filter((m: any, i: any) => {
        return +m.data.id === linkedNodes_to[countNum];
      })
        .attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
        .attr("stroke", "green")
        .attr("stroke-width", xScale(nodeSize * 0.2))
        .attr("fill-opacity", 1)
        .attr("width", d => xScale(nodeSize))
        .attr("height", d => yScale(nodeSize))
        .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
        .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2));
    }
  }
  
  adjacentNodesHighlightOff (event: MouseEvent, d: any) {
    const colorZ = this.treemapData.colorZ;
    const opacity = this.treemapData.opacity;
    const areaCount = this.treemapData.getAreaCount();
    
    const nodes = this.treemapSelections.getNodes();

    nodes.attr("fill", (d: any) => colorZ(+d.data.area / areaCount))
      .attr("fill-opacity", opacity.node)
      .attr("stroke", "none");

    // let nodeSize = this.treemapData.nodeSize;
    // nodes.transition()
    //   .ease(d3.easeLinear)
    //   .duration(1000)
    //   .attr("width", d => xScale(nodeSize) )
    //   .attr("height", d => xScale(nodeSize) )
    //   .attr("x", d =>  (xScale((d.x0 + d.x1) / 2 - nodeSize / 2)) )
    //   .attr("y", d =>  (xScale((d.y0 + d.y1) / 2 - nodeSize / 2)) )
    
    // nodeTexts.transition()
    //   .ease(d3.easeLinear)
    //   .duration(1000)
    //   .attr("x", d => xScale((d.x0 + nodeSize*0.5)) )
    //   .attr("y", d => yScale(d.y0 + nodeSize*0.6) )
    //   .attr("font-size", nodeSize*0.45);
  }

  adjacentNodesTextHighlightOn (event: MouseEvent, d: any) {
    const svg = this.treemapSelections.getSvg();
    const size = this.treemapData.size;
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentViewportWidth = +currentViewBox[2];
    const xMagnification = defaultViewportWidth / currentViewportWidth;
    let nodeSize = this.treemapData.nodeSize / xMagnification;

    const nodeTexts = this.treemapSelections.getNodeTexts();
    // Highlight 'red' nodes : starts from selected node(mouse-overed node).
    nodeTexts.style("fill", "white")
      .attr("x", d => xScale((d.x0 + d.x1) / 2))
      .attr("y", d => yScale((d.y0 + d.y1) / 2))
      .attr("font-size", nodeSize*0.45);

    nodeSize *= 1.75;
    nodeTexts.filter((m, i) => {
      return m === d;
    })
      .style("fill", "black")
      .attr("font-size", nodeSize*0.45);

    let linkedNodes_from: number[] = [];
    let countNum = 0;
    this.colorLinkedNodes_from1(d, linkedNodes_from);
    for(; countNum<linkedNodes_from.length; countNum++){
      nodeTexts.filter((m: any, i: any) => {
        return +m.data.id === linkedNodes_from[countNum];
      })
        .style("fill", "black")
        .attr("font-size", nodeSize*0.45);
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
        .attr("font-size", nodeSize*0.45);
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

  magnifyViewBox = (event: MouseEvent, d: any) => {
    const svg = this.treemapSelections.getSvg();
    const nodes = this.treemapSelections.getNodes();
    const root = this.treemapData.getRoot();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;

    const size = this.treemapData.size;
    const marginLeft = size.margin.left;
    const marginRight = size.margin.right;
    const marginTop = size.margin.top;
    const marginBottom = size.margin.bottom;

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

    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const defaultViewportHeight = size.viewBox.height + size.margin.right;

    const minX = xScale(d3.min(linkedNodesData, d => d.x0));
    const minY = yScale(d3.min(linkedNodesData, d => d.y0));
    const maxX = xScale(d3.max(linkedNodesData, d => d.x1));
    const maxY = yScale(d3.max(linkedNodesData, d => d.y1));

    const zoomMinX = minX - marginLeft;
    const zoomMinY = minY - marginTop;
    const zoomWidth = maxX - minX + marginLeft + marginRight;
    const zoomHeight = maxY - minY + marginTop + marginBottom;

    svg.transition()
      .ease(d3.easeLinear)
      .duration(1000)
      .attr("viewBox", `${zoomMinX} ${zoomMinY} ${zoomWidth} ${zoomHeight}`)
      .on("start", () => {
        nodes.style("pointer-events", "none");
      })
      .on("end", () => {
        nodes.style("pointer-events", "auto");
        this.adjacentNodesHighlightOn(event, d);
        this.attachedEdgesHighlightOn(event, d);
        this.adjacentNodesTextHighlightOn(event, d);
      });

    // let nodeSize = this.treemapData.nodeSize / xMagnification;
    // // this.treemapData.strokeWidth.
    // nodes
    //   .attr("width", d => xScale(nodeSize) )
    //   .attr("height", d => yScale(nodeSize) )
    //   .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
    //   .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2));
    
    // nodeTexts
    //   .attr("x", d => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", d => yScale((d.y0 + d.y1) / 2))
    //   .attr("font-size", nodeSize*0.45);
  }

  restoreViewBox = (event: any, d:any) => {
    const svg = this.treemapSelections.getSvg();
    const nodes = this.treemapSelections.getNodes();
    const nodeTexts = this.treemapSelections.getNodeTexts();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const size = this.treemapData.size;
    
    svg.transition()
      .ease(d3.easeLinear)
      .duration(1000)
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.right}`)
      .on("start", () => {nodes.style("pointer-events", "none");})
      .on("end", () => {nodes.style("pointer-events", "auto");});
    
    // let nodeSize = this.treemapData.nodeSize;
    // nodes.transition()
    //   .ease(d3.easeLinear)
    //   .duration(1000)
    //   .attr("width", d => xScale(nodeSize) )
    //   .attr("height", d => xScale(nodeSize) )
    //   .attr("x", d =>  (xScale((d.x0 + d.x1) / 2 - nodeSize / 2)) )
    //   .attr("y", d =>  (xScale((d.y0 + d.y1) / 2 - nodeSize / 2)) )
    
    // nodeTexts.transition()
    //   .ease(d3.easeLinear)
    //   .duration(1000)
    //   .attr("x", d => xScale((d.x0 + nodeSize*0.5)) )
    //   .attr("y", d => yScale(d.y0 + nodeSize*0.6) )
    //   .attr("font-size", nodeSize*0.45);
  }

  restoreNodeAndTextSize(event: Event, d: any) {
    const nodes = this.treemapSelections.getNodes();
    const nodeTexts = this.treemapSelections.getNodeTexts();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeSize = this.treemapData.nodeSize;

    nodes
      .attr("width", d => xScale(nodeSize) )
      .attr("height", d => xScale(nodeSize) )
      .attr("x", d =>  (xScale((d.x0 + d.x1) / 2 - nodeSize / 2)) )
      .attr("y", d =>  (xScale((d.y0 + d.y1) / 2 - nodeSize / 2)) )
    
    nodeTexts
      .attr("x", d => xScale((d.x0 + nodeSize*0.5)) )
      .attr("y", d => yScale(d.y0 + nodeSize*0.6) )
      .attr("font-size", nodeSize*0.45);
  }
}
