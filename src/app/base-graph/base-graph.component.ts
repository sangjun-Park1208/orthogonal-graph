import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from 'd3';
import louvain from 'graphology-communities-louvain';
import { brushY } from 'd3';

@Component({
  selector: 'app-base-graph',
  templateUrl: './base-graph.component.html',
  styleUrls: ['./base-graph.component.css']
})
export class BaseGraphComponent implements OnInit, AfterViewInit {
  @ViewChild('rootsvg', { static: false }) svg!: ElementRef;

  nodeGroups: Array<number> = [];
  id: number = 0;
  x: number = 0;
  y: number = 0;
  clusterNum: number = 0; // used in input box

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
  }

  render(bus: any, branch: any): void {

    const graph = new MultiGraph(); // duplicated edges -> Multi Graph

    const size = {
      viewBox: { minX: 0, minY: 0, width: 1000, height: 1000 },
      margin: { left: 20, right: 20, top: 20, bottom: 20 },
      padding: { left: 20, right: 20, top: 20, bottom: 20 }
    };

    console.log("bus property", bus.x, bus.y)
    const x = Object.keys(bus.x).map((d): any => { // x
      return bus.x[d];
    });
    const y = Object.keys(bus.y).map((d): any => { // y
      return bus.y[d];
    });
    const xY = Object.keys(bus.x).map((d): any => { // Object mapping
      return { id: bus["bus id"][d], x: bus.x[d], y: bus.y[d] };
    });

    for (let i = 0; i < xY.length; i++) {
      graph.addNode(xY[i].id);
    }
    console.log(branch);
    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const communities = louvain(graph); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]

    for (let i = 0; i < 19; i++) {
      this.nodeGroups[i] = i; // [0, 1, ... , 18]
    }

    const a = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c',
      '#fabebe', '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075'];
    const color = d3.scaleOrdinal(this.nodeGroups, a);
    // Louvain algorithm -> attach colors

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

    const colorLinkedNodes_from = (d: any, linkedNodes: number[]) => { // for linkedNodes_from.push()
      edges.filter((s: any, j: any) => {
        return +s.from === +d.id;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.to);
        return h.to;
      });
    }

    const colorLinkedNodes_to = (d: any, linkedNodes: number[]) => { // for linkedNodes_to.push()
      edges.filter((s: any, j: any) => {
        return +s.to === +d.id;
      }).filter((h: any, k: any) => {
        linkedNodes.push(+h.from);
        return h.from;
      });
    }

    const mouseover = (event: any, d: any) => {
      console.log('id : ' + d.id);
      this.id = d.id;
      this.x = d.x;
      this.y = d.y;
      this.clusterNum = communities[d.id]; // for input box in html file.

      // selected node
      nodes.filter((m, i) => {
        return m === d;
      })
        .attr('fill', 'blue')
        .attr("fill-opacity", 1);

      // other nodes
      nodes.filter((m, i) => {
        return m !== d;
      })
        .attr("fill", d => color(d.id % 19))
        .attr("fill-opacity", 0.1)
        .attr('stroke-opacity', 1);

      // Highlight 'red' nodes : starts from selected node(mouse-overed node).
      let linkedNodes_from: number[] = [];
      let countNum = 0;
      colorLinkedNodes_from(d, linkedNodes_from);
      for (; countNum < linkedNodes_from.length; countNum++) {
        nodes.filter((m: any, i: any) => {
          return +m.id === linkedNodes_from[countNum];
        })
          .attr('fill', 'red')
          .attr("fill-opacity", 1);
      }

      // Highlight 'green' nodes : ends at selected node.
      let linkedNodes_to: number[] = [];
      countNum = 0;
      colorLinkedNodes_to(d, linkedNodes_to);
      for (; countNum < linkedNodes_to.length; countNum++) {
        nodes.filter((m: any, i: any) => {
          return +m.id === linkedNodes_to[countNum];
        })
          .attr('fill', 'green')
          .attr("fill-opacity", 1);
      }

      // edges(from) : red.
      // starts from selected node.
      edges.filter((m: any, i) => {
        return m.from == d.id;
      })
        .attr('stroke', 'red') // m == from
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);

      // edges(to) : green.
      // ends at selected node.
      edges.filter((m: any, i) => {
        return m.to == d.id;
      })
        .attr('stroke', 'green') // m == to
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);

      // other edges (no relevance).
      edges.filter((m: any, i) => {
        return (m.from != d.id && m.to != d.id); // m == nothing
      })
        .attr("stroke-width", "1px")
        .attr("stroke-opacity", 1);
    };

    const mouseout = (event: any, d: any) => { // same with first state.
      nodes.attr("fill", d => color(communities[d.id]))
        .attr("fill-opacity", 1)
        .attr('stroke-opacity', 1);

      edges.attr("stroke-width", "1px")
        .attr("stroke", "steelblue")
        .attr("stroke-opacity", 1);
    }

    const svg = d3.select("#base-graph")
      .attr("viewBox", `${size.viewBox.minX}, ${size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`);

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

        // console.log("x:"+x1+", y:"+y1+", x:"+x2+", y:"+y2);
        // for (let i = 0; i < 3; i++) {//좌표 크기대로 정렬
        //   if (this.xy[i][0] > this.xy[i][2] || this.xy[i][1] > this.xy[i][3]) {
        //     let temp = this.xy[i][0];
        //     this.xy[i][0] = this.xy[i][2];
        //     this.xy[i][2] = temp;
        //     temp = this.xy[i][1];
        //     this.xy[i][1] = this.xy[i][3];
        //     this.xy[i][3] = temp;
        //   }
        // }
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

    function drawEdge(d: any): any {

      let k = `M${xScale(x[d.from - 1])}, ${yScale(y[d.from - 1])}`; // 'path' starting point
      let xdif = x[d.to - 1] - x[d.from - 1]; // x diff
      let ydif = y[d.to - 1] - y[d.from - 1]; // y diff
      let abs_xdif = Math.abs(xdif); // |x diff|
      let abs_ydif = Math.abs(ydif); // |y diff|

      let xhalf = xScale((x[d.to - 1] + x[d.from - 1]) / 2); // x's half point between source & target.
      let yhalf = yScale((y[d.to - 1] + y[d.from - 1]) / 2); // y's half point between source & target.

      if (abs_xdif > abs_ydif) { // if |x diff| > |y diff|
        k += `L${xScale(x[d.from - 1])}, ${yhalf}`; // starts drawing : Vertical.
        k += `L${xScale(x[d.to - 1])}, ${yhalf}`;
        k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`;
        Edge_list.push(new Edge_info(1))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(x[d.from - 1], x[d.to - 1], y[d.from - 1], y[d.to - 1])
        // console.log(x[d.from - 1])
        // console.log(y[d.from - 1])
        // console.log(x[d.to - 1])
        // console.log(y[d.to - 1])
      }
      else { // if |x diff| <= |y diff|
        k += `L${xhalf}, ${yScale(y[d.from - 1])}`; // starts drawing : Horizontal.
        k += `L${xhalf}, ${yScale(y[d.to - 1])}`;
        k += `L${xScale(x[d.to - 1])}, ${yScale(y[d.to - 1])}`;
        Edge_list.push(new Edge_info(2))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(x[d.from - 1], x[d.to - 1], y[d.from - 1], y[d.to - 1])
        // console.log(x[d.from - 1])
        // console.log(y[d.from - 1])
        // console.log(x[d.to - 1])
        // console.log(y[d.to - 1])
      }
      total_length += abs_xdif + abs_ydif;
      return k;
    }

    const edges = svg.append("g")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", (d: any): any => drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("fill", "none")
      .attr("stroke-opacity", 1)

    const nodes = svg.append("g")
      .selectAll("rect")
      .data(xY)
      .join("rect")
      .attr("x", (d: any) => (xScale(d.x)) - 4)
      .attr("y", (d: any) => (yScale(d.y)) - 4)
      // .attr('r', 3)
      .attr('width', 8)
      .attr('height', 8)
      .attr("fill-opacity", 1)
      .attr('stroke', 'black')
      .on("mouseover", mouseover)
      .on("mouseout", mouseout);

    nodes // add color based on cluster number.
      .attr('fill', d => color(d.id));

    nodes // add tooltip.
      .append('title')
      .text((d: any) => (`id : ${d.id}\n` + `x : ${d.x}\n` + `y : ${d.y}\n` + `cluster num : ${communities[d.id]}`))
      .style("top", (d: any) => d.y)
      .style("left", (d: any) => d.x);

    let same_count: number[] = [];
    function Edge_cross(i: number, j: number) {
      // if(Edge_list[i].xy[0][0]==Edge_list[j].xy[0][0]&&Edge_list[i].xy[0][1]==Edge_list[j].xy[0][1]) console.log("1");//edge_cross_count--;
      // if(Edge_list[i].xy[0][0]==Edge_list[j].xy[2][2]&&Edge_list[i].xy[0][1]==Edge_list[j].xy[2][3]) console.log("2");//edge_cross_count--;
      // if(Edge_list[i].xy[2][2]==Edge_list[j].xy[0][0]&&Edge_list[i].xy[2][3]==Edge_list[j].xy[0][1]) console.log("3");//edge_cross_count--;
      // Edge_list[i].e_sort();
      // Edge_list[j].e_sort();
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
                console.log("1");
                console.log("temp+j: " + (temp + j));
                console.log("same_count : " + same_count[temp + j])
                console.log("i:" + i);
                console.log("m:" + m);
                console.log("x:" + Edge_list[i].xy[m][0]);
                console.log("y:" + Edge_list[i].xy[m][1]);
                console.log("j:" + j);
                console.log("n:" + n);
                console.log("x:" + Edge_list[j].xy[n][0]);
                console.log("y:" + Edge_list[j].xy[n][1]);
                if(temp+j==25){
                  console.log("----------------------------")
                  console.log("x:"+Edge_list[i].xy[m][2]);
                  console.log("y:"+Edge_list[i].xy[m][3]);
                  console.log("x:"+Edge_list[j].xy[m][2]);
                  console.log("y:"+Edge_list[j].xy[m][3]);
                  console.log("----------------------------")
                }
                same_count[temp + j]++;
                if (same_count[temp + j] == 1) break;
              }
            }
            //hw
            else if (Edge_list[j].xy[n][1] <= Edge_list[i].xy[m][1] && Edge_list[i].xy[m][1] <= Edge_list[j].xy[n][3]
              && Edge_list[i].xy[m][0] <= Edge_list[j].xy[n][0] && Edge_list[j].xy[n][0] <= Edge_list[i].xy[m][2]) {
              console.log("2");//=추가
              console.log("temp+j: " + (temp + j));
              console.log("same_count : " + same_count[temp + j])
              console.log("i:" + i);
              console.log("m:" + m);
              console.log("x:" + Edge_list[i].xy[m][0]);
              console.log("y:" + Edge_list[i].xy[m][1]);
              console.log("j:" + j);
              console.log("n:" + n);
              console.log("x:" + Edge_list[j].xy[n][0]);
              console.log("y:" + Edge_list[j].xy[n][1]);
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
            }
          }
          else if (Edge_list[i].e_type[m] == 2) {//ww
            if (Edge_list[i].xy[m][1] == Edge_list[j].xy[n][1] && !(Edge_list[i].xy[m][2] < Edge_list[j].xy[n][0]
              || Edge_list[j].xy[n][2] < Edge_list[i].xy[m][0])) {
              console.log("3");
              console.log("temp+j: " + (temp + j));
              console.log("same_count : " + same_count[temp + j])
              console.log("i:" + i);
              console.log("m:" + m);
              console.log("x:" + Edge_list[i].xy[m][0]);
              console.log("y:" + Edge_list[i].xy[m][1]);
              console.log("j:" + j);
              console.log("n:" + n);
              console.log("x:" + Edge_list[j].xy[n][0]);
              console.log("y:" + Edge_list[j].xy[n][1]);
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
            }
          }
          else if (Edge_list[i].e_type[m] == 1) {//hh
            if (Edge_list[i].xy[m][0] == Edge_list[j].xy[n][0] && !(Edge_list[i].xy[m][3] < Edge_list[j].xy[n][1]
              || Edge_list[j].xy[n][3] < Edge_list[i].xy[m][1])) {
              console.log("4");
              console.log("temp+j: " + (temp + j));
              console.log("same_count : " + same_count[temp + j])
              console.log("i:" + i);
              console.log("m:" + m);
              console.log("x:" + Edge_list[i].xy[m][0]);
              console.log("y:" + Edge_list[i].xy[m][1]);
              console.log("j:" + j);
              console.log("n:" + n);
              console.log("x:" + Edge_list[j].xy[n][0]);
              console.log("y:" + Edge_list[j].xy[n][1]);
              same_count[temp + j]++;
              if (same_count[temp + j] == 1) break;
              // console.log("i:"+i);
              // console.log("m:"+m);
              // console.log("x:"+Edge_list[i].xy[m][0]);
              // console.log("y:"+Edge_list[i].xy[m][1]);
              // console.log("j:"+j);
              // console.log("n:"+n);
              // console.log("x:"+Edge_list[j].xy[n][0]);
              // console.log("y:"+Edge_list[j].xy[n][1]);
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
          if(temp+j==25) console.log("asdjfklsadjfklsad")
        }
        // if(Edge_list[i].xy[0][0]==Edge_list[j].xy[0][0]&&Edge_list[i].xy[0][1]==Edge_list[j].xy[0][1])console.log("1");
        // if(Edge_list[i].xy[0][0]==Edge_list[j].xy[2][2]&&Edge_list[i].xy[0][1]==Edge_list[j].xy[2][3])console.log("2");
        // if(Edge_list[i].xy[2][2]==Edge_list[j].xy[2][2]&&Edge_list[i].xy[2][3]==Edge_list[j].xy[2][3])console.log("3");
        // if ((Edge_list[i].xy[0][0] == Edge_list[j].xy[0][0] && Edge_list[i].xy[0][1] == Edge_list[j].xy[0][1])
        //   || (Edge_list[i].xy[0][0] == Edge_list[j].xy[2][2] && Edge_list[i].xy[0][1] == Edge_list[j].xy[2][3])
        //   || (Edge_list[i].xy[2][2]==Edge_list[j].xy[2][2]&&Edge_list[i].xy[2][3]==Edge_list[j].xy[2][3]))
        //   // test++;
      }
    }
    // console.log(`test:${test}`);

    for (let i = 0; i < branch.length; i++) {//branch.length  까지
      Edge_list[i].e_sort();
      for (let j = 0; j < i; j++) {
        if (i == j) continue;
        Edge_cross(i, j);
      }
    }

    // edge_cross_count-=(branch.length)*2-xY.length;


    console.log("same_count : "+same_count.length);
    console.log("total_length : " + total_length);
    console.log("edge_crossing : " + edge_cross_count);
  }
}
