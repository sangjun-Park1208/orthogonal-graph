import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from 'd3';
import louvain from 'graphology-communities-louvain';


@Component({
  selector: 'app-base-graph',
  templateUrl: './base-graph.component.html',
  styleUrls: ['./base-graph.component.css']
})
export class BaseGraphComponent implements OnInit, AfterViewInit {
  @ViewChild('rootsvg', {static : false}) svg!: ElementRef;
  
  nodeGroups: Array<number> = [];
  id: number = 0;
  x: number = 0;
  y: number = 0;
  clusterNum : number = 0;

  constructor() { 

  }

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
  }


  render(bus: any, branch: any): void {

    const graph = new MultiGraph();

    const size = {
      viewBox: { minX: 0, minY: 0, width: 1000, height: 1000 },
      margin: { left: 20, right: 40, top: 20, bottom: 40 },
      padding: { left: 20, right: 40, top: 20, bottom: 40 }
    };

    console.log("bus property", bus.x, bus.y)
    const x = Object.keys(bus.x).map((d): any => { // x좌표
      return bus.x[d];
    });
    const y = Object.keys(bus.y).map((d): any => { // y좌표
      return bus.y[d];
    });
    const xY = Object.keys(bus.x).map((d): any => {
      return { id: bus["bus id"][d], x: bus.x[d], y: bus.y[d] };
    });

    console.log(x);
    console.log(bus.x);

    for(let i=0; i<xY.length; i++){
      graph.addNode(xY[i].id);
    }
    console.log(branch);
    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }
    console.log(graph);
    console.log(graph.nodes());
    // console.log(graph.edges());

    const communities = louvain(graph);
    console.log(communities);

    // console.log(communities[67]); // 0 : cluster num
    // console.log(communities[68]); // 1 : cluster num
    // console.log(communities[1062]); // 18 : cluster num

    for(let i=0; i<19; i++){
      this.nodeGroups[i] = i;
    }

    const a = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
     '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075'];
    const color = d3.scaleOrdinal(this.nodeGroups, a);
   
// Louvain algorithm 적용 : 클러스터링 인덱스 부여


    const xMin = 0;
    const yMin = 0;
    const xMax = d3.max(x);
    const yMax = d3.max(y);
    console.log("xMax, yMax", xMax, yMax);

    const xDomain = [xMin, xMax];
    const yDomain = [yMin, yMax];

    const xRange = [size.margin.left + size.padding.left, size.margin.left + size.padding.left + size.viewBox.width - size.margin.right - size.padding.right];
    const yRange = [size.margin.top + size.padding.top, size.margin.top + size.padding.top + size.viewBox.height - size.margin.bottom - size.padding.bottom];
    console.log("xDomain xRange", xDomain, xRange);
    console.log("yDomain yRange", yDomain, yRange);

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);


    const colorLinkedNodes_from = (d: any, linkedNodes: number[]) => { // linkedNodes_from.push() 하는 함수 따로, return하는 함수 따로 -> // for문 내에서 return하는 함수 반복 호출
      edges.filter((s: any, j: any) => {
        return +s.from === +d.id;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.to);
        return h.to;
      });
    } // 함수 따로 빼서 호출하는 방식으로 여러 리턴값 처리

    const colorLinkedNodes_to = (d: any, linkedNodes: number[]) => { // linkedNodes_to.push() 하는 함수 따로, return하는 함수 따로 -> // for문 내에서 return하는 함수 반복 호출
      edges.filter((s: any, j: any) => {
        return +s.to === +d.id;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.from);
        return h.from;
      });
    } // 함수 따로 빼서 호출하는 방식으로 여러 리턴값 처리


    const mouseover = (event: any, d: any) => {
      console.log('id : ' + d.id);
      this.id = d.id;
      this.x = d.x;
      this.y = d.y;
      this.clusterNum = communities[d.id];

      // 선택 노드
      nodes.filter((m, i) => {
        return m === d;
      })
        // .attr("fill", d => color(d.id % 19))
        .attr('fill', 'blue')
        .attr("fill-opacity", 1);

      // 미선택 노드
      nodes.filter((m, i) => {
        return m !== d;
      })
        .attr("fill", d => color(d.id % 19))
        .attr("fill-opacity", 0.1);

      // d.id (마우스오버된 노드의 id) 가, s.from 과 같은 값을 가질 때, 그 때의 s.to를 id로 갖는 노드를 색칠
      let linkedNodes_from: number[] = [];
      let countNum = 0;
      colorLinkedNodes_from(d, linkedNodes_from);
      for(; countNum<linkedNodes_from.length; countNum++){
        nodes.filter((m: any, i: any) => {
          return +m.id === linkedNodes_from[countNum];
        })
          .attr('fill', 'red')
          .attr("fill-opacity", 1);
      }


      // d.id (마우스오버된 노드의 id) 가, s.to 과 같은 값을 가질 때, 그 때의 s.from을 id로 갖는 노드를 색칠
      let linkedNodes_to: number[] = [];
      countNum = 0;
      colorLinkedNodes_to(d, linkedNodes_to);
      for(; countNum<linkedNodes_to.length; countNum++){
        nodes.filter((m: any, i: any) => {
          return +m.id === linkedNodes_to[countNum];
        })
          .attr('fill', 'green')
          .attr("fill-opacity", 1);
      }
      


      
      // 나가는 edges(from) : red
      edges.filter((m: any, i) => {
        return m.from == d.id;
      })
        .attr('stroke', 'red') // m == from
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
      
      // 들어오는 edges(to) : green
      edges.filter((m: any, i) => {
        return m.to == d.id;
      })  
        .attr('stroke', 'green') // m == to
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);

      // 그 외 edges
      edges.filter((m: any, i) => {
        return (m.from != d.id && m.to != d.id); // m == nothing
      })
        .attr("stroke-width", "1px")
        .attr("stroke-opacity", 0.05);
      
      
    };

    const mouseout = (event: any, d: any) => {
      // console.log("mouseout event", event, d);
      nodes.attr("fill", d => color(communities[d.id]))
        .attr("fill-opacity", 1);

      edges.attr("stroke-width", "1px")
        .attr("stroke", "steelblue")
        .attr("stroke-opacity", 0.2);

    }

    const svg = d3.select("#base-graph")
      .attr("viewBox", `${size.viewBox.minX}, ${size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`);


    function drawEdge(d: any): any {

      let k = `M${xScale(x[d.from-1])}, ${yScale(y[d.from-1])}`; // path 시작 지점
      let xdif = x[d.to-1] - x[d.from-1]; // x좌표 차이
      let ydif = y[d.to-1] - y[d.from-1]; // y좌표 차이
      let abs_xdif = Math.abs(xdif); // |x좌표 차이| 
      let abs_ydif = Math.abs(ydif); // |y좌표 차이|

      let xhalf = xScale((x[d.to-1] + x[d.from-1]) /2);
      let yhalf = yScale((y[d.to-1] + y[d.from-1]) /2);

      if(abs_xdif > abs_ydif) {
        k += `L${xScale(x[d.from-1])}, ${yhalf}`;
        k += `L${xScale(x[d.to - 1])}, ${yhalf}`;
        k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`;
      }
      else {
        k += `L${xhalf}, ${yScale(y[d.from-1])}`;
        k += `L${xhalf}, ${yScale(y[d.to - 1])}`;
        k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`; 
      }
      return k;
    }

    const edges = svg.append("g")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any): any => drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2)


    const nodes = svg.append("g")
      .selectAll("rect")
      .data(xY)
      .join("rect")
      .attr("x", (d: any) => (xScale(d.x)) -4)
      .attr("y", (d: any) => (yScale(d.y)) -4)
      // .attr('r', 3)
      .attr('width', 8)
      .attr('height', 8)
      .attr("fill-opacity", 1)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

    nodes
    .attr('fill', d => color(d.id));

    nodes // add tooltip
    .append('title') 
    .text((d:any) => (`id : ${d.id}\n` + `x : ${d.x}\n` + `y : ${d.y}\n` + `cluster num : ${communities[d.id]}`))
    .style("top", (d: any) => d.y)
    .style("left", (d: any) => d.x);

  }

}