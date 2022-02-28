import { AfterContentInit, AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Graph, { MultiGraph } from 'graphology';
import * as d3 from 'd3';
import louvain from 'graphology-communities-louvain';
import { analyzeAndValidateNgModules } from '@angular/compiler';



@Component({
  selector: 'app-base-graph',
  templateUrl: './base-graph.component.html',
  styleUrls: ['./base-graph.component.css']
})
export class BaseGraphComponent implements OnInit, AfterViewInit {
  @ViewChild('rootsvg', {static : false}) svg!: ElementRef;
  
  nodeGroups: Array<number> = [];
  
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

    console.log(xY);

    for(let i=0; i<xY.length; i++){
      graph.addNode(xY[i].id);
    }
    console.log(branch);
    for(let i=0; i<branch.length; i++){
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }
    console.log(graph);
    console.log(graph.nodes());
    
    const communities = louvain(graph);
    console.log(communities);

    // console.log(communities[67]); // 0 : cluster num
    // console.log(communities[68]); // 1 : cluster num
    // console.log(communities[1062]); // 18 : cluster num

    // louvain.assign(graph);

    for(let i=0; i<19; i++){
      this.nodeGroups[i] = i;
    }

    const a = ["#8a3eb2", "#ae3cb2","#d03ea9","#ef4494","#ff5079","#ff645b","#ff7d42","#f89b32","#e0ba2f",
    "#c8d53b","#b3eb53","#8bf457","#5ff761","#3bf277","#24e795","#1ad4b4","#1dbbcd","#2a9fdd"]; // 색 추가
    const color = d3.scaleOrdinal(this.nodeGroups, a);
    console.log(color);
    

// Louvain algorithm 적용 : 클러스터링 인덱스 부여


    const xMin = 0;
    const yMin = 0;
    const xMax = d3.max(x);
    const yMax = d3.max(y);
    const xAdditional = xMax * 0.1;
    const yAdditional = yMax * 0.1;
    console.log("xMax, yMax", xMax, yMax);

    const xDomain = [xMin, xMax];
    const yDomain = [yMin, yMax];

    const xRange = [size.margin.left + size.padding.left, size.margin.left + size.padding.left + size.viewBox.width - size.margin.right - size.padding.right];
    const yRange = [size.margin.top + size.padding.top, size.margin.top + size.padding.top + size.viewBox.height - size.margin.bottom - size.padding.bottom];
    console.log("xDomain xRange", xDomain, xRange);
    console.log("yDomain yRange", yDomain, yRange);

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);




    const mouseover = (event: any, d: any) => {
      // 콘솔 대신 툴바 띄우기
      console.log("mouseover event", event, d);
      nodes.filter((m, i) => {
        return m === d;
      })
        .attr("fill", d => color(d))
        .attr("fill-opacity", 1);

      nodes.filter((m, i) => {

        return m !== d; // true 인 nodes만 리턴
      })
        .attr("fill", d => color(d))
        .attr("fill-opacity", 0.3);

      edges.filter((m: any, i) => {
        return (m.from == d.id || m.to == d.id);
      })
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
      // 간선과 인접한 정점도 강조할 것

      edges.filter((m: any, i) => {
        return (m.from != d.id && m.to != d.id);
      })
        .attr("stroke-width", "1px")
        .attr("stroke-opacity", 0.1);
      
      


      
    };

    const mouseout = (event: any, d: any) => {
      // console.log("mouseout event", event, d);
      nodes.attr("fill", d => color(d))
        .attr("fill-opacity", 1);

      edges.attr("stroke-width", "1px")
        .attr("stroke-opacity", 0.2);

    }

    const svg = d3.select("#base-graph")
      .attr("viewBox", `${size.viewBox.minX}, ${size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`);

    // const border = svg.append("g")
    //   .append("rect")
    //   .attr("fill", "none")
    //   .attr("stroke", "black")
    //   .attr("width", size.margin.left + size.viewBox.width - size.margin.left)
    //   .attr("height", size.margin.top + size.viewBox.height - size.margin.top);

    const edges = svg.append("g")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any): any => `M${xScale(x[d.from - 1])}, ${yScale(y[d.from - 1])} L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`) // path 그릴 때 수정할 예정.
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2);

    const nodes = svg.append("g")
      .selectAll("rect")
      .data(xY)
      .join("rect")
      .attr("x", (d: any) => (xScale(d.x)))
      .attr("y", (d: any) => (yScale(d.y)))
      // .attr("r", 3)
      .attr('width', 6)
      .attr('height', 6)
      // .attr("fill", "black")
      .attr("fill-opacity", 1)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);
    // console.log(data)

    nodes
    .attr('fill', d => color(d));

    // const graph1 = new Graph();
    // graph1.addNode('a');
    // graph1.addNode('b');
    // graph1.addNode('c');
    // graph1.addNode('d');

    // graph1.addEdge('a', 'b');
    // graph1.addEdge('a', 'c');
    // graph1.addEdge('b', 'c');
    // graph1.addEdge('c', 'd');
    
    // console.log(graph1.edges());

    // console.log('Number of nodes', graph.order);
    // console.log('Number of edges', graph.size);

    // graph.forEachNode(node => {
    //   // console.log(typeof(node)); // string
    //   console.log(node); // 'John', 'Martha'
    //   // console.log(graph.nodes());
    // });

    // graph.forEachEdge(edge => {
    //   console.log(edge);
    // })
    // // console.log(graph.edge)
    // // const directedGraph = toDirected(graph)
    // const communities = louvain(graph);
    // console.log(communities);

    // louvain.assign(graph);


    // const viewWidth = 900;
    // const viewHeight = 900;
    // const svgRoot = d3.select(this.svg.nativeElement)
    //   .attr('viewBox', `0 0 ${viewWidth} ${viewHeight}`)
    //   .attr('width', viewWidth)
    //   .attr('height', viewHeight);
    
    // svgRoot.select('g.container').remove();

    
    // const svg = svgRoot.append('g')
    //   .attr('class', 'container');

    // const gn = svg.append('g').attr('class', 'node-group');
    // const gl = svg.append('g').attr('class', 'link-group');
      
    // const nodes = gn.selectAll('circle')
    //   .data(graph.nodes)
    //   .enter()
    //   .append('circle')
    //   .attr('r', 3)
    //   .attr('fill', (d) => 'black')
    //   .attr('cx', 50)
    //   .attr('cy', 50);
    
    // const links = gl.selectAll('line')
    //   .data(graph.edges)
    //   .enter()
    //   .append('line')
    //   .attr('stroke', 'black');

    

    
    
  }

}
