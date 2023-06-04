import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as d3 from "d3";
import { INodeData } from 'src/shared/interfaces/inode-data';
import { IStatisticData } from 'src/shared/interfaces/istatistic.data';
import { RandomStatisticsService } from 'src/shared/modules/statistics/random-statistics.service';
import { LoadDataService } from 'src/shared/modules/datas/load-data.service';
import { Layout, TreemapNode } from 'src/shared/modules/node-placement/treemap-node.service';

type clusteringAlgo = "louvain" | "girvan_newman" | "leiden";

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})
export class TreemapComponent implements AfterViewInit {
  @ViewChild('rootSvg', { static: false }) rootSvg!: ElementRef;
  @ViewChild('tooltip', { static: false }) tooltip!: ElementRef;

  girvan_newman_iter: number=8;
  iter: number=1; //반복 횟수
  bind_time: string='0'; //걸린 시간
  layout: Layout='Z_Layout'; //레이아웃 종류(Z_Layout,Sequence,Local_Random,Global_Random)
  measurement: number[]; //Total Length,Edge Crossing,Total Bending
  statisticdata: IStatisticData; //Random_statistics
  statistics_index: number;
  load_datas = [14, 30, 57, 118, 300, 1062]; //load data 개수
  load_data_num = 1062;
  ports = [4, 8, 12]; //port 개수
  port = 12;
  statistics_toggle="Total_Length";
  clustering_algorithm : clusteringAlgo="louvain";

  constructor(private ds: LoadDataService, private rs: RandomStatisticsService, private tn: TreemapNode) {
    this.measurement=rs.measurement;
    this.statisticdata=rs.statisticdata;
  }
  ngAfterViewInit(): void {
    this.apply();
  }

  ngOnInit(): void {
  }

  apply(){
    let data;
    this.ds.iter=this.girvan_newman_iter;
    this.ds.load_data_num=this.load_data_num;
    this.ds.load_data(this.load_data_num, this.clustering_algorithm).then((value) => {
      data = value;
      let start=new Date().getTime();
      this.renderTreemap(data);
      let end=new Date().getTime();
      let t=(end-start)/1000;
      this.bind_time=t.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    });
  }

  renderTreemap(data : INodeData) {
    console.log('data : ',data);
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
    const nodeSize = 371.13274*Math.pow(this.load_data_num,-0.42682);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.bottom}`)
      .attr("width", size.width)
      .attr("height", size.height)
      .on("click", (event, d) => {
        // console.log("svg click", event, d);
        // this.rs.treemapEventListeners.restoreViewBox(event, d);
      });

    svg.select('g.container').remove();

    // 그룹
    const root = svg.append("g")
      .attr("class", "container")
    
    this.tn.layout=this.layout;
    this.rs.layout=this.layout;
    this.tn.iter=this.iter;
    this.tn.port=this.port;
    this.tn.d3_root=root;
    this.tn.init(data.bus,data.branch,data,size,nodeSize,strokeWidth,opacity);
    this.tn.iterNodePosition();
    this.measurement=this.rs.measurement;
    this.statisticdata=this.rs.statisticdata;
    
    const edges = this.tn.treemapSelections.getEdges();
    const clusters = this.tn.treemapSelections.getClusters();
    const nodes = this.tn.treemapSelections.getNodes();
    
    clusters.on("mouseenter", (event:any, d:any) => {
      console.log("cluster mouseenter", event, d);
      this.tn.treemapEventListeners.clusterHighlightOn(event, d);
      // treemapEventListeners.clusterNumberOn(event, d);
    })
      .on("mouseleave", (event:any, d:any) => {
        // console.log("cluster mouseleave", event, d);
        this.tn.treemapEventListeners.clusterHighlightOff(event, d);
        // treemapEventListeners.clusterNumberOff(event, d);
      })

    nodes.on("mouseover", (event:any, d:any) => {
      console.log("node mouseover", event, d);
      this.tn.treemapEventListeners.restoreNodeAndTextSize(event, d);
      this.tn.treemapEventListeners.adjacentNodesHighlightOn(event, d);
      this.tn.treemapEventListeners.attachedEdgesHighlightOn(event, d);
      this.tn.treemapEventListeners.adjacentNodesTextHighlightOn(event, d);
      tooltipOn(event, d);
    })
      .on("mouseout", (event:any, d:any) => {
        // console.log("node mouseout", event, d);
        tooltipOff(event, d);
      })
      .on("click", (event:any, d:any) => {
        console.log("node click", event, d);
        this.tn.treemapEventListeners.magnifyViewBox(event, d);
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
      const clusterCount = this.tn.getClusterCount();

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

}
