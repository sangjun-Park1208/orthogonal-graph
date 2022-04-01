import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain, { LouvainOptions } from 'graphology-communities-louvain';
import * as rpm from 'src/shared/modules/random-position/random-position.module';
import * as tm from 'src/shared/modules/treemap/treemap.module';
import { ITabularData } from 'src/shared/interfaces/itabular-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data'
import { IBranchData } from 'src/shared/interfaces/ibranch-data';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})

export class TreemapComponent implements OnInit {
  @ViewChild('rootSvg', {static : false}) rootSvg!: ElementRef;

  nodeGroups: Array<number> = [];

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    d3.json('./assets/data/bus-1062 random position.json')
      .then(bus => {
        d3.csv('./assets/data/branch-1062.csv')
          .then(branch => {
            console.log("bus, branch", bus, branch);
            this.renderTreemap(bus, branch);
          })
      });
  } // 콜백헬 프로미스로 해결하기
  renderTreemap(bus: any, branch: any) : void{ // bus, branch별 매개변수
    const size = rpm.getSize(); // viewBox, padding, margin 등 주요 수치 저장 (모듈화 예정)
    const opacity = { // 투명도 수치 저장 변수 (모듈화 예정)
      node: 0.35,
      edge: 0.20,
      cluster: 0.4
    };
    const strokeWidth = 2;
    const nodeSize = 8;
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph
    // prototype 1 코드
    const x = rpm.setX(bus);
    const y = rpm.setY(bus);
    const xY = rpm.setXY(bus);
    console.log("x, y, xY", x, y, xY);

    const xMin = 0;
    const yMin = 0;
    const xMax = d3.max(x);
    const yMax = d3.max(y);
    console.log("xMax, yMax", xMax, yMax);

    const xDomain = [xMin, xMax as number];
    const yDomain = [yMin, yMax as number];

    const xRange = [0, size.width];
    const yRange = [0, size.height];
    console.log("xDomain xRange", xDomain, xRange);
    console.log("yDomain yRange", yDomain, yRange);

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const colorZ = d3.interpolateSinebow;
    
    // 상준형 graphology 코드
    for(let i=0; i<xY.length; i++){
      graph.addNode(xY[i].id);
    }
    console.log(branch);
    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const communities = louvain(graph, {randomWalk: false}); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]
    //

    const clusterCount = tm.setClusterCount(communities);
    console.log("clusterCount", clusterCount);
    
    let tabularData: ITabularData[] = tm.setTabularData(communities, clusterCount);
    console.log("tabularData", tabularData);

    const root = tm.setRoot(tabularData);
    console.log("d3 hierachy node data", root);

    // treemap 형태 지정 알고리즘 선택: treemap.tile(d3.타일링메소드명) (https://github.com/d3/d3-hierarchy/blob/v3.1.1/README.md#treemap-tiling)
    // cluster 내부 정점 여백 조정이나 클러스터간 여백 조정: treemap.padding[Inner, Outer, ...]
    // treemap 크기 조정: treemap.size([width, height])
    // 가로세로 값 반올림: treemap.round(boolean)

    const treemapLayout = tm.setTreemapLayout(size)(root); // default treemap 레이아웃 가져오기
    console.log("treemapLayout", treemapLayout);
    console.log("d3 treemapping data", root);

    const children = root.children as d3.HierarchyNode<any>[];
    console.log("children", children);

    const leaves = root.leaves(); 

    leaves.sort((a: d3.HierarchyNode<any>, b: d3.HierarchyNode<any>) => { // 미정렬시 edge에서 node 좌표 인식에 오류 발생
      return (+a.data.id - +b.data.id);
    });
    console.log("leaves", leaves);

//      tmp
//     const nodeXY = leaves.map((d:any) => {return {id: +d.id - clusterCount, x: d.x0 + 4, y: d.y0 + 4} as IBusObjectData});

    let clustersWithNodes: any[] = [];  // 각 cluster에 해당하는 nodes 데이터가 있도록 구조 변경
    for (let i = 0; i < clusterCount; i++){
      const clusterData = {
        data: children.find(d => d.data.id == i + 1),
        children: leaves.filter(d => (i + 1 == d.data.parentId))
      };
      
      clustersWithNodes.push(clusterData);
    }
    console.log("cluster with nodes", clustersWithNodes);

    const nodeXY = leaves.map((d:any) => (
      {id: +d.id - clusterCount, 
        x: (d.x1 - d.x0 > 5) ? (d.x0 + d.x1) / 2 : d.x0 + 2.5, 
        y: (d.y1 - d.y0 > 5) ? (d.y0 + d.y1) / 2 : d.y0 + 2.5} as IBusObjectData));
    console.log("nodeXY", nodeXY);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`)
      .attr("width", size.width)
      .attr("height", size.height);

    // // 상준형 코드 edge, node highlight
    const colorLinkedNodes_from1 = (d: any, linkedNodes: number[]) => { // for linkedNodes_from.push()
      edges.filter((s: any, j: any) => {
        return +s.from === +d.id - clusterCount;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.to);
        return h.to;
      });
    }

    const colorLinkedNodes_to1 = (d: any, linkedNodes: number[]) => { // for linkedNodes_to.push() 
      edges.filter((s: any, j: any) => {
        return +s.to === +d.id - clusterCount;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.from);
        return h.from;
      });
    }

    const edges = svg.append("g")
      .attr("id", "edges")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any) => drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2);
  // straight edges
//     const edges = rpm.setEdges(svg, branch, xScale, yScale, nodeXY);
//     console.log("edges", edges);

    // nodes를 각 cluster에 속해있는 형태로 구조 변경
    const clusters = svg.append("g")
      .attr("id", "cluster and nodes")
      .selectAll("g")
      .data(clustersWithNodes)
      .join("g")
      .attr("id", (d:any) => ("cluster_" + (d.data.data.id)))
      .on("mouseover", (event, d) => {
        clusterStrokeHighlightOn(event, d);
        clusterNodesHighlightOn(event, d);
        clusterNumberOn(event, d);
      })
      .on("mouseout", (event, d) => {
        clusterStrokeHighlightOff(event, d);
        clusterNodesHighlightOff(event, d);
        clusterNumberOff(event, d);
      });

    clusters.append("rect")
      .attr("opacity", opacity.cluster)
      .attr("stroke", "black")
      .attr("fill", "white")
      .attr("stroke-width", 2)
      .attr("width", (d:any) => {
        let m = d.data;
        return (m.x1 - m.x0 > 5) ? xScale(m.x1 - m.x0) : xScale(5);
      })
      .attr("height", (d:any) => {
        let m = d.data;
        return (m.y1 - m.y0 > 5) ? yScale(m.y1 - m.y0) : yScale(5);
      })
      .attr("x", (d:any) => {
        let m = d.data;
        return xScale(m.x0);
      })
      .attr("y", (d:any) => {
        let m = d.data;
        return yScale(m.y0);
      });

    clusters.append("text")
      .attr("opacity", 0)
      .attr("dx", d => xScale((d.data.x0 + d.data.x1) / 2))
      .attr("dy", d => yScale(d.data.y0 + 12))
      .attr("font-size", 4)
      .attr("text-anchor", "middle")
      .html(d => `Cluster ${d.data.id}`)
      
    console.log("clusters", clusters);
      
    const nodes = clusters.append("g")
      .attr("id", d => "cluster_" + d.data.id + "_nodes")
      .selectAll("rect")
      .data(d => d.children)
      .join("rect")
      .attr("id", (d:any) => {
        return (+d.data.id - clusterCount);
      })
      // .attr("width", (d:any) => {
      //   return (d.x1 - d.x0 > 5) ? xScale(d.x1 - d.x0) : xScale(5);
      // })
      // .attr("height", (d:any) => {
      //   return (d.y1 - d.y0 > 5) ? yScale(d.y1 - d.y0) : yScale(5);
      // })
      .attr("width", 8)
      .attr("height", 8)
      .attr("x", (d:any) =>  (xScale(d.x0)))
      .attr("y", (d:any) =>  (xScale(d.y0)))

      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
        // console.log("hsl convertion", hsl);
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      })
      .attr("fill-opacity", opacity.node)
      .on("mouseover", (event, d) => {
        console.log("mouseover", event, d);
        nodes.call(nodesHighlightOn, d);
        edgesHighlightOn(edges, d, clusterCount);
        tooltipOn(event, d);
        // showHighlight(event, d);
      })
      .on("mouseout", (event, d) => {
        console.log("mouseout", event, d);
        nodes.call(nodesHighlightOff);
        edgesHighlightOff(edges);
        tooltipOff(event, d);
        // hideHighlight(event, d);
      });
    console.log("nodes", nodes); 

    // 규한형 tooltip 참고해서 다듬는 중...
    const tooltip = svg.append("g")
      .attr("id", "tooltip")
      .attr("opacity", 0);
    tooltip.append("rect")
      .attr("width", 40)
      .attr("height", 18)
      .attr("fill", "white")
      .attr("stroke", "black");

    const tooltipText = tooltip.append("text")
      .attr("font-size", 5)
      .attr("x", 5)
      .attr("y", 7);
    tooltipText.append("tspan")
      .attr("id", "id");
    tooltipText.append("tspan")
      .attr("x", 5)
      .attr("dy", 7)
      .attr("id", "parentId");

    const tooltipOn = (event: any, d: any) => {
      tooltip.attr("transform", `translate(${xScale(d.x0 + 10)}, ${yScale(d.y0 + 10)})`)
        .attr("opacity", 1)
        .select("rect")
        .attr("width", 40)
        .attr("height", 18);
      tooltip.select("#id")
        .html(`id: ${+d.data.id - clusterCount}`);
      tooltip.select("#parentId")
        .html(`cluster: ${+d.data.parentId}`);
    }

    const tooltipOff = (event: any, d: any) => {
      tooltip.attr("opacity", 0)
        .select("rect")
        .attr("width", 0)
        .attr("height", 0);
      tooltip.select("#id")
        .html("");
      tooltip.select("#parentId")
        .html("");
    }
    
    // // 상준형 drawEdge 코드
    function drawEdge(d: any): any {

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

    function edgesHighlightOn (edges: d3.Selection<any, any, any, any>, d: any, clusterCount: number) {  // d3 이벤트 리스너의 매개변수 event형 찾아야함 any 최소화해야한다..
      // edges.filter((m, i) => {
      //   return (+m.from == +d.id - clusterCount || +m.to == +d.id - clusterCount);
      // })
      //   .attr("stroke-width", "2px")
      //   .attr("stroke-opacity", 1);
      // // 간선과 인접한 정점도 강조할 것
      edges.filter((m: any, i) => {
        return m.from == +d.id - clusterCount;
      })
        .attr('stroke', 'red') // m == from
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
      
      // edges(to) : green.
      // ends at selected node.
      edges.filter((m: any, i) => {
        return m.to == +d.id - clusterCount;
      })  
        .attr('stroke', 'green') // m == to
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
  
      // other edges (no relevance).
      edges.filter((m: any, i) => {
        return (m.from != +d.id - clusterCount && m.to != +d.id - clusterCount); // m == nothing
      })
        .attr("stroke-width", "1px")
        .attr("stroke-opacity", 0.05);
    };
    
    function nodesHighlightOn (nodes: d3.Selection<any, any, any, any>, d: any) {
      // nodes.filter((m, i) => {
      //   return m === d;
      // })
      //   .attr("fill-opacity", 1);
      console.log("d parentId", d.data.parentId);
  
      nodes.filter((m, i) => {
        return m === d;
      })
        .attr('fill', 'blue')
        .attr("fill-opacity", 1);
  
      // other nodes
      nodes.filter((m, i) => {
        return m !== d;
      })
        .attr("fill", m => colorZ(m.data.parentId / clusterCount))
        .attr("fill-opacity", 0.1)
        .attr('stroke-opacity', 0.2);
  
      // Highlight 'red' nodes : starts from selected node(mouse-overed node).
      let linkedNodes_from: number[] = [];
      let countNum = 0;
      colorLinkedNodes_from1(d, linkedNodes_from);
      for(; countNum<linkedNodes_from.length; countNum++){
        nodes.filter((m: any, i: any) => {
          return +m.id - clusterCount === linkedNodes_from[countNum];
        })
          .attr('fill', 'red')
          .attr("fill-opacity", 1);
      }
  
      // Highlight 'green' nodes : ends at selected node.
      let linkedNodes_to: number[] = [];
      countNum = 0;
      colorLinkedNodes_to1(d, linkedNodes_to);
      for(; countNum<linkedNodes_to.length; countNum++){
        nodes.filter((m: any, i: any) => {
          return +m.id - clusterCount === linkedNodes_to[countNum];
        })
          .attr('fill', 'green')
          .attr("fill-opacity", 1);
      }
      // console.log("linkedNodes from, to", linkedNodes_from, linkedNodes_to)
    }

    // tmp nodes, edges mouseout event listener
    function edgesHighlightOff (edges: d3.Selection<any, any, any, any>) {
      edges.attr("stroke", "steelblue")
        .attr("stroke-width", "1px")
        .attr("stroke-opacity", 0.2);
    }
    
    function nodesHighlightOff (nodes: d3.Selection<any, any, any, any>) {
      nodes.attr("fill", m => colorZ(m.data.parentId / clusterCount))
        .attr("fill-opacity", 0.6)
        .attr('stroke-opacity', 0.2);
    }









    // const edges = svg.append("g")
    //   .selectAll("path")
    //   .data(branch)
    //   .join("path")
    //   .attr("d", (d: any): any => drawEdge(d))
    //   .attr("stroke", "steelblue")
    //   .attr("fill", "none")
    //   .attr("stroke-opacity", 0.2)
    // //

    // // tooltip >>> nodes >>> edges 순으로 배치하기
    // svg.append("use")

    // cluster mouseover, mouseout event listener
    const clusterNodesHighlightOn = (event: any, d:any) => {
      const clusterNodesSelection = d3.select(`#cluster_${d.data.id}_nodes`)
        .selectAll("rect")
        .attr("fill", (d: any) => colorZ(+d.data.parentId / clusterCount));

      // console.log("clusterNodesSelection", clusterNodesSelection);
    }

    const clusterNodesHighlightOff = (event: any, d:any) => {
      const clusterNodesSelection = d3.select(`#cluster_${d.data.id}_nodes`)
        .selectAll("rect")
        .attr("fill", (d:any) => {
          const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
          // console.log("hsl convertion", hsl);
          return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
        });

      // console.log("clusterNodesSelection", clusterNodesSelection);
    }

    const clusterStrokeHighlightOn = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("rect")
        .attr("stroke-width", 3)
        .attr("opacity", opacity.cluster + 0.2);
    }

    const clusterStrokeHighlightOff = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("rect")
        .attr("stroke-width", 2)
        .attr("opacity", opacity.cluster);
      // clusters.
    }

    const clusterNumberOn = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("text")
        .attr("opacity", 1);
    }

    const clusterNumberOff = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("text")
        .attr("opacity", 0);
    }

    // rpm edges, nodes mouseover event listener
//     const edgesHighlightOn = (event: any, d: any) => {  // d3 이벤트 리스너의 매개변수 event형 찾아야함 any 최소화해야한다..
//       // clusterCount를 d3.select로 가져오든 뭐든 해당 리스너에서 자체적으로 가져올 수 있게 해야함. 외부변수에서 가져오면 이벤트리스너 규격 못지킴
//       d3.select("#edges")
//         .filter((m: any, i) => {
//         return (+m.from == +d.id - clusterCount || +m.to == +d.id - clusterCount);
//       })
//         .attr("stroke-width", "2px")
//         .attr("stroke-opacity", 1);
//       // 간선과 인접한 정점도 강조할 것
//     };

//     const nodesHighlightOn = (event: any, d: any) => {
//       d3.select(`#cluster_${d.id}_nodes`)
//         .filter((m, i) => {
//         return m === d;
//       })
//         .attr("fill-opacity", 1);
//     }

     // svg.append("use")

    //   .attr("xlink:href", "#nodes");
    // svg.append("use")
    //   .attr("xlink:href", "#tooltip");
  }
}
