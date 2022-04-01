import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain, { LouvainOptions } from 'graphology-communities-louvain';
import * as rpm from 'src/shared/modules/random-position/random-position.module';
import * as tm from 'src/shared/modules/treemap/treemap.module';
import { ITabularData } from 'src/shared/interfaces/itabular-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data'

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

///////////////////////////////////////////////////////////
// 색깔

  //   for(let i=0; i<19; i++){
  //     this.nodeGroups[i] = i; // [0, 1, ... , 18]
  //   }
  //   const a = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
  //   '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075'];
  //  const color = d3.scaleOrdinal(this.nodeGroups, a);



///////////////////////////////////////////////////////////

    const size = rpm.getSize();
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

    const xRange = [0, size.viewBox.width - size.margin.right];
    const yRange = [0, size.viewBox.height - size.margin.bottom];
    console.log("xDomain xRange", xDomain, xRange);
    console.log("yDomain yRange", yDomain, yRange);

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const colorZ = d3.interpolateSinebow;

    // // 선택한 정점과 인접한 간선 모두 배열에 push
    // const colorLinkedNodes_from = (d: any, linkedNodes: number[]) => { // for linkedNodes_from.push()
    //   edges.filter((s: any, j: any) => {
    //     return +s.from === +d.id;
    //   }).filter((h: any, k: any) => {
    //     linkedNodes.push(+h.to);
    //     return h.to;
    //   });
    // }

    // const colorLinkedNodes_to = (d: any, linkedNodes: number[]) => { // for linkedNodes_to.push() 
    //   edges.filter((s: any, j: any) => {
    //     return +s.to === +d.id;
    //   }).filter((h: any, k: any) => {
    //     linkedNodes.push(+h.from);
    //     return h.from;
    //   });
    // }


    
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
    root.sort((a: any, b: any) => { // 랜덤성 없애기 시도 (무시해도됨)
      return +b.id - +a.id;
    })
    console.log("d3 hierachy node data", root);

    // treemap 형태 지정 알고리즘 선택: treemap.tile(d3.타일링메소드명) (https://github.com/d3/d3-hierarchy/blob/v3.1.1/README.md#treemap-tiling)
    // cluster 내부 정점 여백 조정이나 클러스터간 여백 조정: treemap.padding[Inner, Outer, ...]
    // treemap 크기 조정: treemap.size([width, height])
    // 가로세로 값 반올림: treemap.round(boolean)

    const treemapLayout = tm.setTreemapLayout(size)(root); // default treemap 레이아웃 가져오기
    console.log("treemapLayout", treemapLayout);
    console.log("d3 treemapping data", root);

    const leaves = root.leaves();
    leaves.sort((a: d3.HierarchyNode<any>, b: d3.HierarchyNode<any>) => { // 미정렬시 edge에서 node 좌표 인식에 오류 발생
      return (+a.data.id - +b.data.id);
    });
    console.log("leaves", leaves);

    const nodeXY = leaves.map((d:any) => {return {id: +d.id - clusterCount, x: d.x0 + 4, y: d.y0 + 4} as IBusObjectData});
    console.log("nodeXY", nodeXY);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${size.viewBox.minX}, ${size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`);

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

    // const showHighlight = (event: any, d: any) => {
    //   console.log('id : ' + d.id);
    //   // this.id = d.id;
    //   // this.x = d.x;
    //   // this.y = d.y;
    //   // this.clusterNum = communities[d.id]; // for input box in html file.

    //   // selected node
    //   nodes.filter((m, i) => {
    //     return m === d;
    //   })
    //     .attr('fill', 'blue')
    //     .attr("fill-opacity", 1);

    //   // other nodes
    //   nodes.filter((m, i) => {
    //     return m !== d;
    //   })
    //     .attr("fill", (d:any) => colorZ(d.id % 19))
    //     .attr("fill-opacity", 0.1)
    //     .attr('stroke-opacity', 0.2);

    //   // Highlight 'red' nodes : starts from selected node(mouse-overed node).
    //   let linkedNodes_from: number[] = [];
    //   let countNum = 0;
    //   colorLinkedNodes_from(d, linkedNodes_from);
    //   for(; countNum<linkedNodes_from.length; countNum++){
    //     nodes.filter((m: any, i: any) => {
    //       return +m.id === linkedNodes_from[countNum];
    //     })
    //       .attr('fill', 'red')
    //       .attr("fill-opacity", 1);
    //   }

    //   // Highlight 'green' nodes : ends at selected node.
    //   let linkedNodes_to: number[] = [];
    //   countNum = 0;
    //   colorLinkedNodes_to(d, linkedNodes_to);
    //   for(; countNum<linkedNodes_to.length; countNum++){
    //     nodes.filter((m: any, i: any) => {
    //       return +m.id === linkedNodes_to[countNum];
    //     })
    //       .attr('fill', 'green')
    //       .attr("fill-opacity", 1);
    //   }

    //   // edges(from) : red.
    //   // starts from selected node.
    //   edges.filter((m: any, i) => {
    //     return m.from == d.id;
    //   })
    //     .attr('stroke', 'red') // m == from
    //     .attr("stroke-width", "2px")
    //     .attr("stroke-opacity", 1);
      
    //   // edges(to) : green.
    //   // ends at selected node.
    //   edges.filter((m: any, i) => {
    //     return m.to == d.id;
    //   })  
    //     .attr('stroke', 'green') // m == to
    //     .attr("stroke-width", "2px")
    //     .attr("stroke-opacity", 1);

    //   // other edges (no relevance).
    //   edges.filter((m: any, i) => {
    //     return (m.from != d.id && m.to != d.id); // m == nothing
    //   })
    //     .attr("stroke-width", "1px")
    //     .attr("stroke-opacity", 0.05);
    // };

    // const hideHighlight = (event: any, d: any) => { // same with first state.
    //   nodes.attr("fill", (d:any) => colorZ(+d.data.parentId / clusterCount))
    //     .attr("fill-opacity", 1)
    //     .attr('stroke-opacity', 1);

    //   edges.attr("stroke-width", "1px")
    //     .attr("stroke", "steelblue")
    //     .attr("stroke-opacity", 0.2);
    // }
    //



    // const edges = rpm.setEdges(svg, branch, xScale, yScale, nodeXY);
    // console.log("edges", edges);

    const edges = svg.append("g")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any) => drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2);

    const nodes = svg.append("g")
      .attr("id", "nodes")
      .selectAll("rect")
      .data(leaves)
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
        return colorZ(+d.data.parentId / clusterCount);
      })
      .attr("fill-opacity", 0.6)
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

    const tooltip = svg.append("g")
      .attr("id", "tooltip")
      .attr("opacity", 0);
    tooltip.append("rect")
      .attr("width", 80)
      .attr("height", 30)
      .attr("fill", "white")
      .attr("stroke", "black");

    const tooltipText = tooltip.append("text")
      .attr("font-size", 10)
      .attr("x", 5)
      .attr("y", 12);
    tooltipText.append("tspan")
      .attr("id", "id");
    tooltipText.append("tspan")
      .attr("x", 5)
      .attr("dy", 12)
      .attr("id", "parentId");

    const tooltipOn = (event: any, d: any) => {
      tooltip.attr("opacity", 1)
        .attr("transform", `translate(${xScale(d.x0 + 5)}, ${yScale(d.y0 + 5)})`);
      tooltip.select("#id")
        .html(`id: ${+d.data.id - clusterCount}`);
      tooltip.select("#parentId")
        .html(`cluster: ${+d.data.parentId}`);
    }

    const tooltipOff = (event: any, d: any) => {
      tooltip.attr("opacity", 0);
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
    //   .attr("xlink:href", "#nodes");
    // svg.append("use")
    //   .attr("xlink:href", "#tooltip");
  }
}
