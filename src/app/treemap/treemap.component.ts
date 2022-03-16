import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})

export class TreemapComponent implements OnInit {
  @ViewChild('rootSvg', {static : false}) rootSvg!: ElementRef;
  
  size = {
    viewBox: { minX: 0, minY: 0, width: 1000, height: 1000 },
    margin: { left: 20, right: 20, top: 20, bottom: 20 },
    padding: { left: 20, right: 20, top: 20, bottom: 20 }
  };

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    d3.json('./assets/data/bus-1062 random position.json')
      .then(bus => {
        d3.csv('./assets/data/branch-1062.csv')
          .then(branch => {
            this.render(bus, branch);
          })
      });
  } // 콜백헬 프로미스로 해결하기

  render(bus: any, branch: any) : void{ // bus, branch별 매개변수
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph

    const x = Object.keys(bus.x).map((d): any => { // x
      return bus.x[d];
    });
    const y = Object.keys(bus.y).map((d): any => { // y
      return bus.y[d];
    });
    const xY = Object.keys(bus.x).map((d): any => { // Object mapping
      return { id: bus["bus id"][d], x: bus.x[d], y: bus.y[d] };
    });
    const xMin = 0;
    const yMin = 0;
    const xMax = d3.max(x);
    const yMax = d3.max(y);
    console.log("xMax, yMax", xMax, yMax);

    const xDomain = [xMin, xMax];
    const yDomain = [yMin, yMax];

    const xRange = [this.size.margin.left + this.size.padding.left, this.size.margin.left + this.size.padding.left + this.size.viewBox.width - this.size.margin.right - this.size.padding.right];
    const yRange = [this.size.margin.top + this.size.padding.top, this.size.margin.top + this.size.padding.top + this.size.viewBox.height - this.size.margin.bottom - this.size.padding.bottom];
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
    //
    
    const communities = louvain(graph); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]

    const clusterCount = d3.max(Object.keys(communities).map(d => {
      return communities[d];
    })) as number + 1;
    console.log("clusterCount", clusterCount);
    
    let tabularData: any[] = [];
    tabularData = Object.keys(communities).map(d => {
      return {id: +d + clusterCount, parentId: communities[d] + 1};
    });
    
    tabularData.push({id: 0})
    for (let i = 0; i < clusterCount; i++){
      tabularData.push({id: i + 1, parentId: 0});
    }
    console.log("tabularData", tabularData);

    const root = d3.stratify()  // tabularData 인터페이스 지정할 것
      (tabularData);
    root.count();
    console.log("d3 hierachy node data", root);

    const treemapLayout = d3.treemap()
      .tile(d3.treemapBinary)
      .size([this.size.viewBox.width - this.size.margin.left - this.size.margin.right, this.size.viewBox.height - this.size.margin.bottom - this.size.margin.top])
      .paddingInner(this.size.padding.left)
      .paddingOuter(this.size.padding.left)
      .paddingLeft(this.size.padding.left)
      .paddingBottom(this.size.padding.bottom)
      .paddingRight(this.size.padding.right)
      .paddingTop(this.size.padding.top)
      .round(true)(root);
    console.log("d3 treemapping data", root);

    const leaves = root.leaves();
    console.log("leaves", leaves);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("width", this.size.viewBox.width)
      .attr("height", this.size.viewBox.height);

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
        .attr("transform", `translate(${d.x0 + 5}, ${d.y0 + 5})`);
      tooltip.select("#id")
        .html(`id: ${+d.data.id - clusterCount}`);
        // treemap layout 초기화 후에는 root내 연결된 모든 노드에 대해 id 값 재변경하기
      tooltip.select("#parentId")
        .html(`cluster: ${+d.data.parentId}`);
    }

    const tooltipOff = (event: any, d: any) => {
      tooltip.attr("opacity", 0);
    }

    // // 상준형 코드 edge, node highlight
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
    // //

    const nodes = svg.append("g")
      .attr("id", "nodes")
      .selectAll("rect")
      .data(leaves)
      .join("rect")
      .attr("id", (d:any) => {
        return +d.data.id - clusterCount;
      })
      .attr("width", (d:any) => {
        return (d.x1 - d.x0 > 5) ? d.x1 - d.x0 : 5;
      })
      .attr("height", (d:any) => {
        return (d.y1 - d.y0 > 5) ? d.y1 - d.y0 : 5;
      })
      // .attr("width", 5)
      // .attr("height", 5)
      .attr("x", (d:any) => {
        return d.x0;
      })
      .attr("y", (d:any) => {
        return d.y0;
      })
      .attr("fill", (d:any) => {
        return colorZ(+d.data.parentId / clusterCount);
      })
      .on("mouseover", (event, d) => {
        tooltipOn(event, d);
        // showHighlight(event, d);
      })
      .on("mouseout", (event, d) => {
        tooltipOff(event, d);
        // hideHighlight(event, d);
      });
    console.log("nodes", nodes); 
    
    // // 상준형 drawEdge 코드
    // function drawEdge(d: any): any {

    //   let k = `M${xScale(x[d.from-1])}, ${yScale(y[d.from-1])}`; // 'path' starting point
    //   let xdif = x[d.to-1] - x[d.from-1]; // x diff
    //   let ydif = y[d.to-1] - y[d.from-1]; // y diff
    //   let abs_xdif = Math.abs(xdif); // |x diff|
    //   let abs_ydif = Math.abs(ydif); // |y diff|

    //   let xhalf = xScale((x[d.to-1] + x[d.from-1]) /2); // x's half point between source & target.
    //   let yhalf = yScale((y[d.to-1] + y[d.from-1]) /2); // y's half point between source & target.

    //   if(abs_xdif > abs_ydif) { // if |x diff| > |y diff|
    //     k += `L${xScale(x[d.from-1])}, ${yhalf}`; // starts drawing : Vertical.
    //     k += `L${xScale(x[d.to - 1])}, ${yhalf}`;
    //     k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`;
    //   }
    //   else { // if |x diff| <= |y diff|
    //     k += `L${xhalf}, ${yScale(y[d.from-1])}`; // starts drawing : Horizontal.
    //     k += `L${xhalf}, ${yScale(y[d.to - 1])}`;
    //     k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`; 
    //   }
    //   return k;
    // }

    // const edges = svg.append("g")
    //   .selectAll("path")
    //   .data(branch)
    //   .join("path")
    //   .attr("d", (d: any): any => drawEdge(d))
    //   .attr("stroke", "steelblue")
    //   .attr("fill", "none")
    //   .attr("stroke-opacity", 0.2)
    // //

    svg.append("use")
      .attr("xlink:href", "#nodes");
    svg.append("use")
      .attr("xlink:href", "#tooltip");
  }
}
