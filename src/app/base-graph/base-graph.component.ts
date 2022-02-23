import { AfterContentInit, AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import Graph, { MultiGraph } from 'graphology';
import * as d3 from 'd3';
import { BaseGraphService } from '../base-graph.service';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import forceLayout from 'graphology-layout-force';

@Component({
  selector: 'app-base-graph',
  templateUrl: './base-graph.component.html',
  styleUrls: ['./base-graph.component.css']
})
export class BaseGraphComponent implements OnInit, AfterViewInit {
  @ViewChild('rootsvg', {static : false}) svg!: ElementRef;

  
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
    // console.log('x : ', xY[0].x);
    // xY.forEach(id => {
    //   graph.addNode(xY[id]);
    // })
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
    louvain.assign(graph);

    // const positions = forceAtlas2(graph, {
    //   iterations: 50,
    //   settings: {
    //     gravity: 10
    //   }
    // });
    // console.log(positions);

    const position = forceLayout(graph, {
      maxIterations: 50,
      settings: {
        gravity: 10
      }
    });
    console.log(position);
// Louvain algorithm 적용 : 클러스터링 인덱스 부여


    
    // const branchValue = branch
    // let nodess = graph.nodes();
    // graph.addNode(xY[0].id);
    // graph.addNode(xY);
    // console.log(nodess);
    

    // console.log('y ', y);
    // console.log("new x y", xY);

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
        .attr("fill", "blue")
        .attr("fill-opacity", 0.8);

      edges.filter((m: any, i) => {
        return (m.from == d.id || m.to == d.id);
      })
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
      // 간선과 인접한 정점도 강조할 것
    };

    const mouseout = (event: any, d: any) => {
      // console.log("mouseout event", event, d);
      nodes.attr("fill", "black")
        .attr("fill-opacity", 0.7);

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
      .attr("stroke", "green")
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
      .attr("fill", "black")
      .attr("fill-opacity", 0.7)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);
    // console.log(data)



    const graph1 = new Graph();
    graph1.addNode('a');
    graph1.addNode('b');
    graph1.addNode('c');
    graph1.addNode('d');
    // graph.addNode('e');
    // graph.addNode('f');
    // graph.addNode('g');
    // graph.addNode('h');
    // graph.addNode('i');
    // graph.addNode('j');
    // graph.addNode('k');
    // graph.addNode('l');
    // graph.addNode('m'); 
    // graph.addNode('n');
    // graph.addNode('p');
    // graph.addNode('q');
    // graph.addNode('r');
    // graph.addNode('s');
    // graph.addNode('t');



    graph1.addEdge('a', 'b');
    graph1.addEdge('a', 'c');
    graph1.addEdge('b', 'c');
    graph1.addEdge('c', 'd');
    // graph.addEdge('a', 'm');
    // graph.addEdge('b', 'k');
    // graph.addEdge('a', 'a');
    // graph.addEdge('a', 's');
    // graph.addEdge('a', 'i');
    // graph.addEdge('c', 'e');
    // graph.addEdge('d', 'a');
    // graph.addEdge('d', 'b');
    // graph.addEdge('e', 'c');
    // graph.addEdge('f', 'd');
    // graph.addEdge('f', 'e');
    // graph.addEdge('f', 'g');
    // graph.addEdge('g', 'a');
    // graph.addEdge('g', 't');
    // graph.addEdge('h', 'r');
    // graph.addEdge('h', 'p');
    // graph.addEdge('k', 'a');
    // graph.addEdge('k', 'b');
    // graph.addEdge('m', 't');
    // graph.addEdge('l', 'r');
    // graph.addEdge('n', 's');
    // graph.addEdge('l', 'e');
    
    
    console.log(graph1.edges());
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
