/*
 * 변경/추가 해야할 점
 * 1. zoom 방식을 viewBox 값을 직접 수정하는게 아니라 d3.zoom을 사용하는 방식으로 바꾸기
 * 2. 정점 강조시 관련 간선 색 gradual 하게 바꾸기
 * 3. 정점 강조시 진출, 진입 간선 비율 pie chart 형식으로 띄우기
 * 4. 투명도, 간선 크기 등 수치조절 슬라이더, 정점 세부 데이터 표현 및 검색 레이아웃 우측에 만들기
 */
import * as d3 from 'd3';
import { TreemapSelections } from '../selections/treemap-selections';
import { TreemapData } from '../datas/treemap-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';

export class TreemapEventListeners { 
  private treemapData: TreemapData;
  private treemapSelections: TreemapSelections;

  constructor (treemapData: TreemapData, treemapSelections: TreemapSelections){
    this.treemapData = treemapData;
    this.treemapSelections = treemapSelections;
  }

// node event listener
  // 정점 mouseover, click시 사용 
  // 기능: ( 강조 정점 기준 진출, 진입에 따라 간선 색 변경, viewbox 확대되는 크기에 맞춰 간선 두께 줄이기)
  attachedEdgesHighlightOn (event: MouseEvent, d: any) {
    this.attachedEdgesHighlightOff(event, d);
    const edges = this.treemapSelections.getEdges();
    const magnification = this.calculateViewportMagnification();
    const strokeWidth = this.treemapData.strokeWidth.edge / magnification * ((magnification > 2) ? magnification / 2 : 1);

    // edges(from) : red.
    // starts at selected node.
    edges.filter((m: any, i) => {
      return m.from == +d.data.id;
    })
      .attr('stroke', 'red') // m == from
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", 1)
      .raise();
    
    // edges(to) : green.
    // ends at selected node.
    edges.filter((m: any, i) => {
      return m.to == +d.data.id;
    })  
      .attr('stroke', 'green') // m == to
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", 1)
      .raise();
  };

  attachedEdgesHighlightOff (event: MouseEvent, d: any) {
    const opacity = this.treemapData.opacity;
    const edges = this.treemapSelections.getEdges();
    const magnification = this.calculateViewportMagnification();
    const strokeWidth = this.treemapData.strokeWidth.edge / magnification;

    edges.attr("stroke", "steelblue")
      .attr("stroke-width", strokeWidth)
      .attr("stroke-opacity", opacity.edge);
  }

  // node highlight 
  // (정점 mouseover, click시 사용)
  // 대상 정점과 인접한 모든 정점 (시작 노드 끝노드에 따라 색 변경) 강조, viewbox 변경에 따라 정점 가로, 세로, 시작 위치 변경 
  adjacentNodesHighlightOn (event: MouseEvent, d: any) {
    this.adjacentNodesHighlightOff(event, d);

    const nodes = this.treemapSelections.getNodes();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const clusterCount = this.treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    const colorZ = this.treemapData.colorZ;

    const magnification = this.calculateViewportMagnification();
    let nodeSize = this.treemapData.nodeSize / magnification * ((magnification > 2) ? magnification / 2 : 1);
    const strokeWidth = nodeSize * 0.15;

    nodes.attr("width", d => xScale(nodeSize) )
      .attr("height", d => yScale(nodeSize) )
      .attr("x", d =>  xScale((d.x0 + d.x1) / 2 - nodeSize / 2))
      .attr("y", d =>  yScale((d.y0 + d.y1) / 2 - nodeSize / 2))
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      });

    nodes.filter((m, i) => {
      return m === d;
    })
      .attr("stroke", "black")
      .attr("stroke-width", xScale(strokeWidth))
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
        .attr("stroke-width", xScale(strokeWidth))
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
        .attr("stroke-width", xScale(strokeWidth))
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

    nodes.attr("fill", (d: any) => colorZ(+d.data.parentId / areaCount))
      .attr("fill-opacity", opacity.node)
      .attr("stroke", "none");
  }

  // (정점 mouseover click시 사용)
  // 강조되는 정점 id 텍스트를 검정색으로 강조 (이외 노드는 하얀색으로 처리) 변경되는 viewbox 값에 맞춰 글자 크기 줄이기
  adjacentNodesTextHighlightOn (event: MouseEvent, d: any) {
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const magnification = this.calculateViewportMagnification();
    console.log("magnification", magnification);
    let nodeSize = this.treemapData.nodeSize / magnification * ((magnification > 1) ? magnification / 2 : 1);

    const nodeTexts = this.treemapSelections.getNodeTexts();
    // Highlight 'red' nodes : starts from selected node(mouse-overed node).
    nodeTexts.style("fill", "white")
      .attr("font-size", xScale(nodeSize*0.45));

    nodeTexts.filter(d => d.data.id / 1000 >= 1)
      .selectAll("#a")
      .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
      .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2));

    nodeTexts.filter(d => d.data.id / 1000 >= 1)
      .selectAll("#b")
      .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
      .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2 + nodeSize * 0.4));

    nodeTexts.filter(d => d.data.id / 1000 < 1)
      .selectAll("text")
      .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
      .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2));

    nodeTexts.filter((m, i) => {
      return m === d;
    })
      .style("fill", "black")

    // Highlight 'red' nodes : starts at selected node.
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
    const nodeTexts = this.treemapSelections.getNodeTexts();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    let nodeSize = this.treemapData.nodeSize;

    nodeTexts
      .style("fill", "black")
      .attr("font-size", xScale(nodeSize*0.4));

    // nodeTexts.filter(d => d.data.id / 1000 >= 1)
    //   .selectAll("#a")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2));

    // nodeTexts.filter(d => d.data.id / 1000 >= 1)
    //   .selectAll("#b")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2 + nodeSize * 0.4));

    // nodeTexts.filter(d => d.data.id / 1000 < 1)
    //   .selectAll("text")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2));
      
    nodeTexts
      .selectAll("text")
      .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
      .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2 + nodeSize * 0.4));
  }

  colorLinkedNodes_from1 (d: any, linkedNodes: number[]) { // for linkedNodes_from.push()
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.from === +d.data.id;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.to);
      return h.to;
    });
  };

  colorLinkedNodes_to1 (d: any, linkedNodes: number[]) { // for linkedNodes_to.push() 
    const edges = this.treemapSelections.getEdges();

    edges.filter((s: any, j: any) => {
      return +s.to === +d.data.id;
    }).filter((h: any, k: any) => {
      linkedNodes.push(+h.from);
      return h.from;
    });
  };

  // cluster mouseover, mouseout event listener
  // (클러스터 mouseover 시 사용)
  // 클러스터 투명도 감소
  clusterHighlightOn = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        return +d.clusterinfo.data.id == +m.clusterinfo.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster*0.5);
  }

  clusterHighlightOff = (event: any, d:any) => {
    const cluster = this.treemapSelections.getClusters()
      .filter(m => {
        return +d.clusterinfo.data.id == +m.clusterinfo.data.id;
      })
      .select("rect");
    
    const clusterNodesSelection = cluster
      .attr("fill-opacity", this.treemapData.opacity.cluster);
  }

  // (클러스터 mouseover시 사용)
  // 클러스터 테두리 생성
  // 현재는 미사용
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

  // (클러스터 mouseover시 사용)
  // 클러스터 숫자 표현
  // 현재는 미사용
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

  // (정점 click 시 사용)
  // 클릭한 정점과 인접한 모든 정점을 고려해 확대시킬 영역의 viewBox 값 구한 후 애니메이션화
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
    this.colorLinkedNodes_from1(d, linkedNodes_from);

    let linkedNodes_to: number[] = [];
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

    const zoomMinX = minX - marginLeft;
    const zoomMinY = minY - marginTop;
    const zoomWidth = maxX - minX + marginLeft + marginRight;
    const zoomHeight = maxY - minY + marginTop + marginBottom;
    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const defaultViewportHeight = size.viewBox.height + size.margin.bottom;
    const xMagnification = defaultViewportWidth / zoomWidth;
    const yMagnification = defaultViewportHeight / zoomHeight;
    const magnification = Math.min(xMagnification, yMagnification);

    svg.transition()
      .ease(d3.easeLinear)
      .duration(100 * magnification)
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
  }

  // (svg 내에서 노드 외 영역 click시 사용)
  // 기본 viewbox 값으로 복구
  restoreViewBox = (event: any, d:any) => {
    const svg = this.treemapSelections.getSvg();
    const nodes = this.treemapSelections.getNodes();
    const size = this.treemapData.size;
    const magnification = this.calculateViewportMagnification();
    
    svg.transition()
      .ease(d3.easeLinear)
      .duration((magnification == 1) ? 0 : 100 * magnification)
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.right}`)
      .on("start", () => {nodes.style("pointer-events", "none");})
      .on("end", () => {
        nodes.style("pointer-events", "auto");
        this.adjacentNodesHighlightOff(event, d);
        this.attachedEdgesHighlightOff(event, d);
        this.adjacentNodesTextHighlightOff(event, d);
        this.restoreNodeAndTextSize(event, d);
      });
  }

  // (svg 내에서 노드 외 영역 click시 사용)
  // 기본 정점, 텍스트 크기로 복구
  restoreNodeAndTextSize(event: Event, d: any) {
    const nodes = this.treemapSelections.getNodes();
    const nodeTexts = this.treemapSelections.getNodeTexts();
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeSize = this.treemapData.nodeSize;

    nodes
      .attr("width", d => xScale(nodeSize) )
      .attr("height", d => yScale(nodeSize) )
      .attr("x", d =>  (xScale((d.x0 + d.x1) / 2 - nodeSize / 2)))
      .attr("y", d =>  (yScale((d.y0 + d.y1) / 2 - nodeSize / 2)));
    
    nodeTexts
      .attr("font-size", nodeSize*0.4);
  }

  // node highlight, node text highlight, edge highlight 에 사용
  // 기본 viewBox 크기와 비교해 어느 정도 확대되었는지 계산
  calculateViewportMagnification(): number {
    const svg = this.treemapSelections.getSvg();
    const size = this.treemapData.size;
    const defaultViewportWidth = size.viewBox.width + size.margin.right;
    const defaultViewportHeight = size.viewBox.height + size.margin.bottom;
    const currentViewBox = svg.attr("viewBox").split(" ");
    const currentViewportWidth = +currentViewBox[2];
    const currentViewportHeight = +currentViewBox[3];
    const xMagnification = defaultViewportWidth / currentViewportWidth;
    const yMagnification = defaultViewportHeight / currentViewportHeight;

    // return (xMagnification + yMagnification) / 2;
    return Math.min(xMagnification, yMagnification);
  }
}
