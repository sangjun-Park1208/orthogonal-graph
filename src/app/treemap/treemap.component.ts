import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { TreemapData } from 'src/shared/modules/treemap-vis/datas/treemap-data.module';
import { TreemapSelections } from 'src/shared/modules/treemap-vis/selections/treemap-selections.module';
import { TreemapEventListeners } from 'src/shared/modules/treemap-vis/event-listeners/treemap-event-listeners.module';

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
    d3.csv('./assets/data/bus-1062.csv')
      .then((bus: any) => {
        d3.csv('./assets/data/branch-1062.csv')
          .then((branch: any) => {
            console.log("bus, branch", bus, branch);
            this.renderTreemap(bus, branch);
          })
      });
  }
  
  renderTreemap(bus: IBusData[], branch: IBranchData[]) : void{ 
    const size = {
      width: 960,
      height: 960,
      viewBox: {minX: 20, minY: 20, width: 1000, height: 1000},
      margin: {left: 20, right: 20, top: 20, bottom: 20},
      padding: {left: 20, right: 20, top: 20, bottom: 20}
    }; 
    const opacity = { 
      node: 0.45, 
      edge: 0.30,
      cluster: 0.2
    };
    const strokeWidth = {
      nodes: 2,
      cluster: 2,
      edge: 2
    };
    const nodeSize = 9.5;
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph

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
    // 상준형 graphology 코드
    for(let i=0; i<bus.length; i++){
      graph.addNode(bus[i].id);
    }

    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const communities = louvain(graph, {randomWalk: false, resolution: 0.2}); 
    const details = louvain.detailed(graph, {randomWalk: false, resolution: 0.2}); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]
    console.log("details", details);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width + size.margin.right}, ${size.viewBox.height + size.margin.right}`)
      .attr("width", size.width)
      .attr("height", size.height)
      .on("dblclick", (event, d) => {
        treemapEventListeners.restoreViewBox(event, d);
        treemapEventListeners.adjacentNodesHighlightOff(event, d);
        treemapEventListeners.attachedEdgesHighlightOff(event, d);
        treemapEventListeners.adjacentNodesTextHighlightOff(event, d);
      });;

    let treemapData = new TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity)
    let treemapSelections = new TreemapSelections(treemapData, svg);
    let treemapEventListeners = new TreemapEventListeners(treemapData, treemapSelections);

    const Edge_list: Edge_info[] = new Array<Edge_info>();
    let edge_cross_count = 0;
    let total_length = 0;

    branch.forEach(d => initializeEdgeList(d));

    const edges = treemapSelections.getEdges();
    const clusters = treemapSelections.getClusters();
    const nodes = treemapSelections.getNodes();

    clusters.on("mouseenter", (event, d) => {
      console.log("mouseenter", event, d);
      // treemapEventListeners.clusterStrokeHighlightOn(event, d);
      treemapEventListeners.clusterHighlightOn(event, d);
      treemapEventListeners.clusterNumberOn(event, d);
    })
    .on("mouseleave", (event, d) => {
      console.log("mouseleave", event, d);
      // treemapEventListeners.clusterStrokeHighlightOff(event, d);
      treemapEventListeners.clusterHighlightOff(event, d);
      treemapEventListeners.clusterNumberOff(event, d);
    })

    nodes.on("mouseover", (event, d) => {
      console.log("mouseover", event, d);
      treemapEventListeners.adjacentNodesHighlightOn(event, d);
      treemapEventListeners.attachedEdgesHighlightOn(event, d);
      tooltipOn(event, d);
    })
      .on("mouseout", (event, d) => {
      console.log("mouseout", event, d);
      // treemapEventListeners.adjacentNodesHighlightOff(event, d);
      // treemapEventListeners.attachedEdgesHighlightOff(event, d);
      // treemapEventListeners.adjacentNodesTextHighlightOff(event, d);
      tooltipOff(event, d);
    })
    .on("click", (event, d) => {
      treemapEventListeners.adjacentNodesHighlightOn(event, d);
      treemapEventListeners.attachedEdgesHighlightOn(event, d);
      treemapEventListeners.adjacentNodesTextHighlightOn(event, d);
      treemapEventListeners.magnifyViewBox(event, d);
    });
  
    const toolTip = d3.select(this.tooltip.nativeElement)
      .style('opacity', 0)
      .style('background-color', 'black')
      .style('border-radius', '5px')
      .style('padding', '10px')
      .style('color', 'white')
      .style('position', 'fixed')
      .style('z-index', '1000')
      .style('display', 'block');

    const tooltipOn = (event: any, d: any) => {
      const clusterCount = treemapData.getClusterCount();

      toolTip
        .style('opacity', 1)
        .html('id: ' + (+d.id - clusterCount))
        .style('left', +event.x + 15 + 'px')
        .style('top', +event.y + 15 + 'px')
        .style('display', 'block');
    }

    const tooltipOff = (event: any, d: any) => {
      toolTip.style('opacity', 0).style('display', 'none');
    }

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

    function initializeEdgeList(d: any) {
      const xScale = treemapData.xScale;
      const yScale = treemapData.yScale;
      const nodeXY = treemapData.getNodeXY();
      
      let xdif = nodeXY[d.to-1].x - nodeXY[d.from-1].x; // x diff
      let ydif = nodeXY[d.to-1].y - nodeXY[d.from-1].y; // y diff
      let abs_xdif = Math.abs(xdif); // |x diff|
      let abs_ydif = Math.abs(ydif); // |y diff|
  
      let xhalf = xScale((nodeXY[d.to-1].x + nodeXY[d.from-1].x) /2); // x's half point between source & target.
      let yhalf = yScale((nodeXY[d.to-1].y + nodeXY[d.from-1].y) /2); // y's half point between source & target.
  
      if(abs_xdif > abs_ydif) { // if |x diff| > |y diff|
        Edge_list.push(new Edge_info(1))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
      }
      else { // if |x diff| <= |y diff|
        Edge_list.push(new Edge_info(2))//e_case,to_cluster,from_cluster
        Edge_list[Edge_list.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
      }
      total_length += abs_xdif + abs_ydif;
    }
  }
}
