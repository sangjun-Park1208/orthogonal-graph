import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { RandomStatisticsService } from 'src/shared/modules/treemap-vis/datas/random-statistics.service';
import { IStatisticData } from 'src/shared/interfaces/istatistic.data';

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
  portnum: number;
  // random_measurement: number[]
  statistics_toggle: String;
  statistics_index: number;
  bind_time: string;
  iter: string;
  toggle: string;
  togglenum: number;
  statisticdata:IStatisticData;
  

  ngOnInit(): void {
  }

  constructor(private rs:RandomStatisticsService) {
    this.data = [14, 30, 57, 118, 300, 1062];
    this.measurement = [];
    this.port=[4,12];
    this.mesu_name = ["Total Length", "Edge Crossing", "Total Bending"];
    this.toggle="Z_Layout";
    this.togglenum=1062;
    this.rs.togglenum.next(1062);
    this.portnum=12;
    // this.random_measurement = [0, 0, 0];
    this.statisticdata=rs.statisticdata;
    this.statistics_toggle="Total_Length";
    this.statistics_index=0;
    this.iter='1000'
    this.rs.iter.next(this.iter);
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
    console.log('iter : ',this.iter);
    this.rs.iter.next(this.iter);
    this.rs.togglenum.next(num);
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
    d3.csv(`./assets/data/bus-${this.rs.togglenum$}.csv`)
      .then((bus: any) => {
        d3.csv(`./assets/data/branch-${this.rs.togglenum$}.csv`)
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
    console.log('iter : ',this.iter);
    this.rs.iter.next(this.iter);
    this.rs.toggle.next(event);
    d3.csv(`./assets/data/bus-${this.rs.togglenum$}.csv`)
      .then((bus: any) => {
        d3.csv(`./assets/data/branch-${this.rs.togglenum$}.csv`)
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
    this.rs.bus=bus;
    this.rs.branch=branch;
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
    
    this.rs.togglenum$.subscribe((d)=>{
      this.togglenum=d;
    });
    const nodeSize = 371.13274*Math.pow(this.togglenum,-0.42682);
    console.log('nodeSize',nodeSize);
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph
    this.rs.size=size;
    this.rs.opacity=opacity;
    this.rs.strokeWidth=strokeWidth;
    this.rs.nodeSize=nodeSize;

    this.rs.iter$.subscribe((d)=>{
      this.iter=d;
    });
    
    // 상준형 graphology 코드
    for (let i = 0; i < bus.length; i++) {
      graph.addNode(bus[i].id);
    }

    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const details = louvain.detailed(graph, { randomWalk: false, resolution: 0.1 }); // assign Louvain Algorithm
    this.rs.details=details;
    console.log("details", details);

    

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.bottom}`)
      .attr("width", size.width)
      .attr("height", size.height)
      .on("click", (event, d) => {
        // console.log("svg click", event, d);
        this.rs.treemapEventListeners.restoreViewBox(event, d);
      });
    // 다시 그리기
    svg.select('g.container').remove();
    // 그룹
    const root = svg.append("g")
      .attr("class", "container")

    //random-statistics.services.ts
    this.rs.root=root;

    this.rs.toggle.next(this.toggle);
    // this.measurement=this.rs.measurement;
    // this.statisticdata=this.rs.statisticdata;
    this.rs.measurement$.subscribe((d:any)=>{
      console.log('chan',d);
      this.measurement=d;
    });
    this.rs.statisticdata$.subscribe((d:any)=>{
      console.log('chan',d);
      this.statisticdata=d;
    });

    const edges = this.rs.treemapSelections.getEdges();
    const clusters = this.rs.treemapSelections.getClusters();
    const nodes = this.rs.treemapSelections.getNodes();

    clusters.on("mouseenter", (event:any, d:any) => {
      console.log("cluster mouseenter", event, d);
      this.rs.treemapEventListeners.clusterHighlightOn(event, d);
      // treemapEventListeners.clusterNumberOn(event, d);
    })
      .on("mouseleave", (event:any, d:any) => {
        // console.log("cluster mouseleave", event, d);
        this.rs.treemapEventListeners.clusterHighlightOff(event, d);
        // treemapEventListeners.clusterNumberOff(event, d);
      })

    nodes.on("mouseover", (event:any, d:any) => {
      console.log("node mouseover", event, d);
      this.rs.treemapEventListeners.restoreNodeAndTextSize(event, d);
      this.rs.treemapEventListeners.adjacentNodesHighlightOn(event, d);
      this.rs.treemapEventListeners.attachedEdgesHighlightOn(event, d);
      this.rs.treemapEventListeners.adjacentNodesTextHighlightOn(event, d);
      tooltipOn(event, d);
    })
      .on("mouseout", (event:any, d:any) => {
        // console.log("node mouseout", event, d);
        tooltipOff(event, d);
      })
      .on("click", (event:any, d:any) => {
        console.log("node click", event, d);
        this.rs.treemapEventListeners.magnifyViewBox(event, d);
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
      const clusterCount = this.rs.treemapData!.getClusterCount();

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
