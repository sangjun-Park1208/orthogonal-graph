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
  @ViewChild('tooltip', {static : false}) tooltip!: ElementRef;

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
      node: 0.45,
      edge: 0.30,
      cluster: 0.5
    };
    const strokeWidth = {
      nodes: 1.5,
      cluster: 2,
      edge: 2
    };
    const nodeSize = 9.5;
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

    class Edge_info {
      private e_case: number;
      public e_type: number[] = [1, 2, 1];//h,w,h
      public xy: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

      constructor(e_case: number) {
        this.e_case = e_case;
      }

      public init(x1: number, x2: number, y1: number, y2: number) {
        if (this.e_case == 1) {
          this.xy[0][0] = x1;
          this.xy[0][1] = y1;
          this.xy[0][2] = x1;
          this.xy[0][3] = (y1 + y2) / 2;
          this.xy[1][0] = x1;
          this.xy[1][1] = (y1 + y2) / 2;
          this.xy[1][2] = x2;
          this.xy[1][3] = (y1 + y2) / 2;
          this.xy[2][0] = x2;
          this.xy[2][1] = (y1 + y2) / 2;
          this.xy[2][2] = x2;
          this.xy[2][3] = y2;
        }
        else if (this.e_case == 2) {
          this.e_type[0] = 2, this.e_type[1] = 1, this.e_type[2] = 2;
          this.xy[0][0] = x1;
          this.xy[0][1] = y1;
          this.xy[0][2] = (x1 + x2) / 2;
          this.xy[0][3] = y1;
          this.xy[1][0] = (x1 + x2) / 2;
          this.xy[1][1] = y1;
          this.xy[1][2] = (x1 + x2) / 2;
          this.xy[1][3] = y2;
          this.xy[2][0] = (x1 + x2) / 2;
          this.xy[2][1] = y2;
          this.xy[2][2] = x2;
          this.xy[2][3] = y2;
        }
      }
      public e_sort() {
        for (let i = 0; i < 3; i++) {//좌표 크기대로 정렬
          if (this.xy[i][0] > this.xy[i][2] || this.xy[i][1] > this.xy[i][3]) {
            let temp = this.xy[i][0];
            this.xy[i][0] = this.xy[i][2];
            this.xy[i][2] = temp;
            temp = this.xy[i][1];
            this.xy[i][1] = this.xy[i][3];
            this.xy[i][3] = temp;
          }
        }
      }
    }

    const Edge_list: Edge_info[] = new Array<Edge_info>();
    let edge_cross_count = 0;
    let total_length = 0;

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
        x: d.x0 + nodeSize / 2,
        y: d.y0 + nodeSize / 2} as IBusObjectData));
    console.log("nodeXY", nodeXY);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width-100}, ${size.viewBox.height-100}`)
      .attr("width", size.width)
      .attr("height", size.height);

    // // 상준형 코드 edge, node highlight
    const edges = svg.append("g")
      .attr("id", "edges")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any) => drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("stroke-width", strokeWidth.edge)
      .attr("fill", "none")
      .attr("stroke-opacity", opacity.edge);
  // straight edges
//     const edges = rpm.setEdges(svg, branch, xScale, yScale, nodeXY);
//     console.log("edges", edges);

    // nodes를 각 cluster에 속해있는 형태로 구조 변경
    const clusters = svg.append("g")
      .attr("id", "clusters_and_nodes")
      .selectAll("g")
      .data(clustersWithNodes)
      .join("g")
      .attr("id", (d:any) => ("cluster_" + (d.data.data.id)))
      .on("mouseenter", (event, d) => {
        console.log("cluster mouseenter", event, d);
        clusterStrokeHighlightOn(event, d);
        clusterNodesHighlightOn(event, d);
        clusterNumberOn(event, d);
      })
      .on("mouseleave", (event, d) => {
        console.log("cluster mouseleave", event, d);
        clusterStrokeHighlightOff(event, d);
        clusterNodesHighlightOff(event, d);
        clusterNumberOff(event, d);
      });

    clusters.append("rect")
      .attr("fill", (d: any) => colorZ(+d.data.data.id / clusterCount))
      // .attr("fill", "hsl(0, 0%, 70%)")
      .attr("fill-opacity", 0.2)
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
      .attr("font-size", nodeSize*1.2)
      .attr("text-anchor", "middle")
      .html(d => `Cluster ${d.data.id}`);

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
      .attr("width", nodeSize)
      .attr("height", nodeSize)
      .attr("x", (d:any) =>  (xScale(d.x0)))
      .attr("y", (d:any) =>  (xScale(d.y0)))
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      })
      .attr("fill-opacity", opacity.node)
      .on("mouseover", (event, d) => {
        console.log("mouseover", event, d);
        adjacentNodesHighlightOn(event, d)
        attachedEdgesHighlightOn(event, d);
        tooltipOn(event, d);
        // showHighlight(event, d);
      })
      .on("mouseout", (event, d) => {
        console.log("mouseout", event, d);
        adjacentNodesHighlightOff(event, d);
        attachedEdgesHighlightOff(edges);
        tooltipOff(event, d);
        // hideHighlight(event, d);
      });
    console.log("nodes", nodes);

    // 규한형 tooltip 참고해서 다듬는 중...
    const toolTip = d3.select(this.tooltip.nativeElement)
      .style('opacity', 0)
      .style('background-color', 'black')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('color', 'white')

      .style('position', 'fixed')
      .style('z-index', '1000')
      .style('display', 'block');
    //   .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`)
    //   .attr("width", size.width)
    //   .attr("height", size.height)
    //   .append("g")
    //   .attr("opacity", 0);
    // toolTip.append("rect")
    //   .attr("width", 40)
    //   .attr("height", 18)
    //   .attr("fill", "white")
    //   .attr("stroke", "black");

    const tooltipText = toolTip.append("text")
      .attr("font-size", 5)
      .attr("x", 5)
      .attr("y", 7);
    tooltipText.append("tspan")
      .attr("id", "id");
    tooltipText.append("tspan")
      .attr("x", 5)
      .attr("dy", 7)
      .attr("id", "parentId");

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
        Edge_list.push(new Edge_info(1))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(x[d.from - 1], x[d.to - 1], y[d.from - 1], y[d.to - 1])
      }
      else { // if |x diff| <= |y diff|
        k += `L${xhalf}, ${yScale(nodeXY[d.from-1].y)}`; // starts drawing : Horizontal.
        k += `L${xhalf}, ${yScale(nodeXY[d.to-1].y)}`;
        k += `L${xScale(nodeXY[d.to-1].x)}, ${yScale(nodeXY[d.to-1].y)}`;
        Edge_list.push(new Edge_info(2))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(x[d.from - 1], x[d.to - 1], y[d.from - 1], y[d.to - 1])
      }
      total_length += abs_xdif + abs_ydif;
      return k;
    }

    function attachedEdgesHighlightOn (event: MouseEvent, d: any) {  // d3 이벤트 리스너의 매개변수 event형 찾아야함 any 최소화해야한다..
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
        .attr("stroke-width", strokeWidth.edge*1.1)
        .attr("stroke-opacity", 1);

      // edges(to) : green.
      // ends at selected node.
      edges.filter((m: any, i) => {
        return m.to == +d.id - clusterCount;
      })
        .attr('stroke', 'green') // m == to
        .attr("stroke-width", strokeWidth.edge*1.1)
        .attr("stroke-opacity", 1);

      // other edges (no relevance).
      // edges.filter((m: any, i) => {
      //   return (m.from != +d.id - clusterCount && m.to != +d.id - clusterCount); // m == nothing
      // })
      //   .attr("stroke-width", strokeWidth.edge)
      //   .attr("stroke-opacity", opacity.edge);
    };

    function adjacentNodesHighlightOn (event: MouseEvent, d: any) {
      // nodes.filter((m, i) => {
      //   return m === d;
      // })
      //   .attr("fill-opacity", 1);
      console.log("d parentId", d.data.parentId);

      nodes.filter((m, i) => {
        return m === d;
      })
        .attr("stroke", "black")
        .attr("stroke-width", strokeWidth.nodes)
        .attr("fill-opacity", 1);

      // other nodes
      // nodes.filter((m, i) => {
      //   return m !== d;
      // })
      //   .attr("fill", m => colorZ(m.data.parentId / clusterCount))
      //   .attr("fill-opacity", 0.1)
      //   .attr('stroke-opacity', 0.2);

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
    function attachedEdgesHighlightOff (edges: d3.Selection<any, any, any, any>) {
      edges.attr("stroke", "steelblue")
        .attr("stroke-width", strokeWidth.edge)
        .attr("stroke-opacity", opacity.edge);
    }

    function adjacentNodesHighlightOff (event: MouseEvent, d: any) {
      // console.log("node data", d);
      let nodesSelection = d3.select(`#cluster_${d.data.parentId}_nodes`)
        .selectAll("rect")
        .attr("fill", (d: any) => colorZ(+d.data.parentId / clusterCount))
        .attr("fill-opacity", opacity.node)
        .attr("stroke", "none");

      nodesSelection = d3.select("#clusters_and_nodes")
        .selectChildren()
        .filter((m: any) => {
          return d.data.parentId != m.data.data.id;
        })
        .select("g")
        .selectAll("rect")
        .attr("fill", (d:any) => {
          const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
          return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
        })
        .attr("fill-opacity", opacity.node)

      console.log("nodesSelection", nodesSelection);
    }

    const colorLinkedNodes_from1 = (d: any, linkedNodes: number[]) => { // for linkedNodes_from.push()
      edges.filter((s: any, j: any) => {
        return +s.from === +d.id - clusterCount;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.to);
        return h.to;
      });
    };

    const colorLinkedNodes_to1 = (d: any, linkedNodes: number[]) => { // for linkedNodes_to.push()
      edges.filter((s: any, j: any) => {
        return +s.to === +d.id - clusterCount;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.from);
        return h.from;
      });
    };

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
        .attr("stroke-width", strokeWidth.cluster*1.1)
        .attr("stroke-opacity", opacity.cluster*1.2);
    }

    const clusterStrokeHighlightOff = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("rect")
        .attr("stroke-width", strokeWidth.cluster)
        .attr("stroke-opacity", opacity.cluster);
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

    const tooltipOn = (event: any, d: any) => {
      toolTip
        .style('opacity', 1)
        .html('id: ' + (+d.id - clusterCount))
        .style('left', +event.x + 15 + 'px')
        .style('top', +event.y + 15 + 'px')
        .style('display', 'block');
      // toolTip.attr("transform", `translate(${xScale(d.x0 + 10)}, ${yScale(d.y0 + 10)})`)
      //   .attr("opacity", 1)
      //   .select("rect")
      //   .attr("width", 40)
      //   .attr("height", 18);
      // toolTip.select("#id")
      //   .html(`id: ${+d.data.id - clusterCount}`);
      // toolTip.select("#parentId")
      //   .html(`cluster: ${+d.data.parentId}`);
    }

    const tooltipOff = (event: any, d: any) => {
      toolTip.style('opacity', 0).style('display', 'none');
      // toolTip.attr("opacity", 0)
      //   .select("rect")
      //   .attr("width", 0)
      //   .attr("height", 0);
      // toolTip.select("#id")
      //   .html("");
      // toolTip.select("#parentId")
      //   .html("");
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

    let same_count: number[] = [];
    function Edge_cross(i: number, j: number) {
      let temp = 0;
      for (let k = 0; k < i; k++) {
        temp += k;
      }
      for (let m = 0; m < 3; m++) {
        for (let n = 0; n < 3; n++) {
          if (Edge_list[i].e_type[m] != Edge_list[j].e_type[n]) {
            if (Edge_list[i].e_type[m] == 1) {
              //wh
              if (Edge_list[j].xy[n][0] <= Edge_list[i].xy[m][0] && Edge_list[i].xy[m][0] <= Edge_list[j].xy[n][2]
                && Edge_list[i].xy[m][1] <= Edge_list[j].xy[n][1] && Edge_list[j].xy[n][1] <= Edge_list[i].xy[m][3]) {
                same_count[temp + j]++;
                if (same_count[temp + j] == 1) break;
              }
            }
            //hw
            else if (Edge_list[j].xy[n][1] <= Edge_list[i].xy[m][1] && Edge_list[i].xy[m][1] <= Edge_list[j].xy[n][3]
              && Edge_list[i].xy[m][0] <= Edge_list[j].xy[n][0] && Edge_list[j].xy[n][0] <= Edge_list[i].xy[m][2]) {
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
            }
          }
          else if (Edge_list[i].e_type[m] == 2) {//ww
            if (Edge_list[i].xy[m][1] == Edge_list[j].xy[n][1] && !(Edge_list[i].xy[m][2] < Edge_list[j].xy[n][0]
              || Edge_list[j].xy[n][2] < Edge_list[i].xy[m][0])) {
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
            }
          }
          else if (Edge_list[i].e_type[m] == 1) {//hh
            if (Edge_list[i].xy[m][0] == Edge_list[j].xy[n][0] && !(Edge_list[i].xy[m][3] < Edge_list[j].xy[n][1]
              || Edge_list[j].xy[n][3] < Edge_list[i].xy[m][1])) {
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
            }
          }
        }
        if (same_count[temp + j] == 1) {
          edge_cross_count++;
          break;
        }
      }
    }

    // let test=0;
    for (let i = 0; i < branch.length; i++) {
      let temp = 0;
      for (let k = 0; k < i; k++) {
        temp += k;
      }
      for (let j = 0; j < i; j++) {
        same_count.push(0);
        if ((Edge_list[i].xy[0][0] == Edge_list[j].xy[0][0] && Edge_list[i].xy[0][1] == Edge_list[j].xy[0][1])
          || (Edge_list[i].xy[0][0] == Edge_list[j].xy[2][2] && Edge_list[i].xy[0][1] == Edge_list[j].xy[2][3])
          || (Edge_list[i].xy[2][2] == Edge_list[j].xy[0][0] && Edge_list[i].xy[2][3] == Edge_list[j].xy[0][1])
          || (Edge_list[i].xy[2][2] == Edge_list[j].xy[2][2] && Edge_list[i].xy[2][3] == Edge_list[j].xy[2][3])){
          same_count[temp + j]--;
        }
      }
    }

    for (let i = 0; i < branch.length; i++) {//branch.length  까지
      Edge_list[i].e_sort();
      for (let j = 0; j < i; j++) {
        if (i == j) continue;
        Edge_cross(i, j);
      }
    }

    console.log("total_length : " + total_length);
    console.log("edge_crossing : " + edge_cross_count);

  }
}
