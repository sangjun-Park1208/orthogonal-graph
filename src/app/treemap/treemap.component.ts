import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { TreemapData } from 'src/shared/modules/treemap-vis/datas/treemap-data';
import { seqeunce_TreemapData } from 'src/shared/modules/treemap-vis/datas/seqeunce-treemap-data';
import { local_Random_TreemapData } from 'src/shared/modules/treemap-vis/datas/local-random-treemap-data';
import { global_Random_TreemapData } from 'src/shared/modules/treemap-vis/datas/global-random-treemap-data';
import { TreemapSelections } from 'src/shared/modules/treemap-vis/selections/treemap-selections';
import { TreemapSelectionsDevided } from 'src/shared/modules/treemap-vis/selections/treemap-selections-devided';
import { TreemapEventListeners } from 'src/shared/modules/treemap-vis/event-listeners/treemap-event-listeners';
import { EdgeCrossingCountCalculator } from 'src/shared/modules/treemap-vis/calculate edge crossing/calculate-edge-crossing';
import { EdgeMeasurement } from 'src/shared/modules/treemap-vis/calculate edge crossing/edge-measurement';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';

declare var require: any //jStat 쓰기 위해 추가

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})

export class TreemapComponent implements OnInit {
  @ViewChild('rootSvg', { static: false }) rootSvg!: ElementRef;
  @ViewChild('tooltip', { static: false }) tooltip!: ElementRef;

  nodeGroups: Array<number> = [];
  data: number[];
  port: number[];
  measurement: number[]
  mesu_name: String[];
  toggle: String;
  togglenum: number;
  portnum: number;
  // random_measurement: number[]
  statistics_toggle: String;
  random_mean: number[];
  random_median: number[];
  random_min: number[];
  random_max: number[];
  random_std: number[];
  statistics_index: number;
  iter: string;
  bind_time: string;

  ngOnInit(): void {
  }

  constructor() {
    this.data = [14, 30, 57, 118, 300, 1062];
    this.measurement = [];
    this.port=[4,12];
    this.mesu_name = ["Total Length", "Edge Crossing", "Total Bending"];
    this.toggle = "Z_Layout";
    this.togglenum = 1062;
    this.portnum=12;
    // this.random_measurement = [0, 0, 0];
    this.statistics_toggle="Total_Length";
    this.statistics_index=0;
    this.random_mean=[0,0,0];
    this.random_median=[0,0,0];
    this.random_min=[0,0,0];
    this.random_max=[0,0,0];
    this.random_std=[0,0,0];
    this.iter='1000';
    this.bind_time=`0`;
  }

  ngAfterViewInit(): void {
    d3.csv('./assets/data/bus-1062.csv')
      .then((bus: any) => {
        d3.csv('./assets/data/branch-1062.csv')
          .then((branch: any) => {
            // console.log("bus, branch", bus, branch);
            let start= new Date().getTime();
            this.renderTreemap(bus, branch);
            let end=new Date().getTime();
            let t=(end-start)/1000;
            this.bind_time=t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          })
      });
  }

  select(num: number) {
    console.log(num)
    this.togglenum=num;
    d3.csv(`./assets/data/bus-${num}.csv`)
      .then((bus: any) => {
        d3.csv(`./assets/data/branch-${num}.csv`)
          .then((branch: any) => {
            let start= new Date().getTime();
            this.renderTreemap(bus, branch);
            let end=new Date().getTime();
            let t=(end-start)/1000;            
            this.bind_time=t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          })
      });

  }

  port_select(num: number){
    this.portnum=num;
    console.log(`port`,this.portnum);
    d3.csv(`./assets/data/bus-${this.togglenum}.csv`)
      .then((bus: any) => {
        d3.csv(`./assets/data/branch-${this.togglenum}.csv`)
          .then((branch: any) => {
            let start= new Date().getTime();
            this.renderTreemap(bus, branch);
            let end=new Date().getTime();
            let t=(end-start)/1000;
            this.bind_time=t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          })
      });
  }

  ToggleSelect(event: any) {
    this.toggle = event;
    d3.csv(`./assets/data/bus-${this.togglenum}.csv`)
      .then((bus: any) => {
        d3.csv(`./assets/data/branch-${this.togglenum}.csv`)
          .then((branch: any) => {
            let start= new Date().getTime();
            this.renderTreemap(bus, branch);
            let end=new Date().getTime();
            let t=(end-start)/1000;
            this.bind_time=t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
          })
      });
  }

  StatisticsSelect(event: any){
    this.statistics_toggle=event;
    console.log('chan', this.statistics_toggle);
    if(this.statistics_toggle=="Total_Length"){
      this.statistics_index=0;
    }
    if(this.statistics_toggle=="Edge_Crossing"){
      this.statistics_index=1;
    }
    if(this.statistics_toggle=="Total_Bending"){
      this.statistics_index=2;
    }
  }

  // //nodeSize 구하는 함수
  // view_ratiio(){
  //   let tn=this.togglenum;
  //   // return (3.68086+(246.51128-3.68086))/(1+Math.pow((tn/12.21441),0.64459));
  //   // return 16.72141+103.27859*Math.exp(-(tn-14)/177.16331);
  //   return 371.13274*Math.pow(tn,-0.42682);
  // }

  renderTreemap(bus: IBusData[], branch: IBranchData[]): void {
    console.log({ bus, branch })
    const size = {
      width: 1700,
      height: 1000,
      viewBox: { minX: 20, minY: 20, width: 1700, height: 1000 },
      margin: { left: 20, right: 20, top: 20, bottom: 20 },
      padding: { left: 20, right: 20, top: 20, bottom: 20 }
    };
    const opacity = {
      node: 0.6,
      edge: 0.30,
      cluster: 0.2
    };
    const strokeWidth = {
      nodes: 2,
      cluster: 2,
      edge: 1.5
    };
    const nodeSize = 371.13274*Math.pow(this.togglenum,-0.42682);
    console.log('nodeSize',nodeSize);
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph

    // 상준형 graphology 코드
    for (let i = 0; i < bus.length; i++) {
      graph.addNode(bus[i].id);
    }

    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const details = louvain.detailed(graph, { randomWalk: false, resolution: 0.1 }); // assign Louvain Algorithm

    console.log("details", details);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.bottom}`)
      .attr("width", size.width)
      .attr("height", size.height)
      .on("click", (event, d) => {
        // console.log("svg click", event, d);
        treemapEventListeners.restoreViewBox(event, d);
      });
    // 다시 그리기
    svg.select('g.container').remove();
    // 그룹
    const root = svg.append("g")
      .attr("class", "container")
    let treemapData!: TreemapData | seqeunce_TreemapData | local_Random_TreemapData | global_Random_TreemapData;

    let edgeMeasurement: EdgeMeasurement;
    // let treemapSelections: TreemapSelections;
    let treemapSelections: TreemapSelections|TreemapSelectionsDevided; //chan adding
    let treemapEventListeners: TreemapEventListeners;
    if(this.iter=='') this.iter='1';
    let random_count = Number(this.iter);
    console.log('chaskdhfkladsjf',random_count);

    var {jStat}=require('jstat');
    let l_stat=new Array();//total length stat
    let e_stat=new Array();//edge crossing stat
    let b_stat=new Array();//total bending stat

    if (this.toggle == "Z_Layout")
      treemapData = new TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity);
    else if (this.toggle == "Sequence")
      treemapData = new seqeunce_TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity);
    else if (this.toggle == "Local_Random") {
      for (let i = 0; i < random_count; i++) {
        treemapData = new local_Random_TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity);
        treemapData.setZNodePosition();
        edgeMeasurement = new EdgeMeasurement(treemapData, branch);
        l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
        e_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
        b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
      }
    }
    else if (this.toggle == "Global_Random") {
      for (let i = 0; i < random_count; i++) {
        treemapData = new global_Random_TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity);
        treemapData.setZNodePosition();
        edgeMeasurement = new EdgeMeasurement(treemapData, branch);
        l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
        e_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
        b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
      }
    }
    treemapData.setZNodePosition();
    
    if (this.toggle == "Local_Random" || this.toggle == "Global_Random") {
      this.random_mean[0] = jStat(l_stat).mean();
      this.random_mean[1] = jStat(e_stat).mean();
      this.random_mean[2] = jStat(b_stat).mean();
      this.random_median[0] = jStat(l_stat).median();
      this.random_median[1] = jStat(e_stat).median();
      this.random_median[2] = jStat(b_stat).median();
      this.random_min[0] = jStat(l_stat).min();
      this.random_min[1] = jStat(e_stat).min();
      this.random_min[2] = jStat(b_stat).min();
      this.random_max[0] = jStat(l_stat).max();
      this.random_max[1] = jStat(e_stat).max();
      this.random_max[2] = jStat(b_stat).max();
      this.random_std[0] = jStat(l_stat).stdev();
      this.random_std[1] = jStat(e_stat).stdev();
      this.random_std[2] = jStat(b_stat).stdev();
    }
    else{
      this.random_mean.fill(0);
      this.random_median.fill(0);
      this.random_min.fill(0);
      this.random_max.fill(0);
      this.random_std.fill(0);
    }

    // treemapSelections = new TreemapSelections(treemapData, root);
    treemapSelections = new TreemapSelectionsDevided(treemapData, root); //chan adding
    // treemapEventListeners = new TreemapEventListeners(treemapData, treemapSelections);
    treemapEventListeners = new TreemapEventListeners(treemapData, treemapSelections); //chan adding
    edgeMeasurement = new EdgeMeasurement(treemapData, branch);
    this.measurement = edgeMeasurement.calculateEdgeCrossingCount();

    const edges = treemapSelections.getEdges();
    const clusters = treemapSelections.getClusters();
    const nodes = treemapSelections.getNodes();

    clusters.on("mouseenter", (event, d) => {
      console.log("cluster mouseenter", event, d);
      treemapEventListeners.clusterHighlightOn(event, d);
      // treemapEventListeners.clusterNumberOn(event, d);
    })
      .on("mouseleave", (event, d) => {
        // console.log("cluster mouseleave", event, d);
        treemapEventListeners.clusterHighlightOff(event, d);
        // treemapEventListeners.clusterNumberOff(event, d);
      })

    nodes.on("mouseover", (event, d) => {
      console.log("node mouseover", event, d);
      treemapEventListeners.restoreNodeAndTextSize(event, d);
      treemapEventListeners.adjacentNodesHighlightOn(event, d);
      treemapEventListeners.attachedEdgesHighlightOn(event, d);
      treemapEventListeners.adjacentNodesTextHighlightOn(event, d);
      tooltipOn(event, d);
    })
      .on("mouseout", (event, d) => {
        // console.log("node mouseout", event, d);
        tooltipOff(event, d);
      })
      .on("click", (event, d) => {
        console.log("node click", event, d);
        treemapEventListeners.magnifyViewBox(event, d);
        event.stopPropagation();
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
  }
}
