import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { TreemapDataModule } from 'src/shared/modules/treemap-vis/datas/treemap-data.module';
import { TreemapSelectionsModule } from 'src/shared/modules/treemap-vis/selections/treemap-selections.module';
import { TreemapEventListenersModule } from 'src/shared/modules/treemap-vis/event-listeners/treemap-event-listeners.module';

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
  } // 콜백헬 프로미스로 해결하기
  renderTreemap(bus: IBusData[], branch: IBranchData[]) : void{ // bus, branch별 매개변수
    const size = {
      width: 960,
      height: 960,
      viewBox: {minX: 20, minY: 20, width: 1000, height: 1000},
      margin: {left: 20, right: 20, top: 20, bottom: 20},
      padding: {left: 20, right: 20, top: 20, bottom: 20}
    }; // viewBox, padding, margin 등 주요 수치 저장 (모듈화 예정)
    const opacity = { // 투명도 수치 저장 변수 (모듈화 예정)
      node: 0.45, // property 값이 number인 프로퍼티가 유동적으로 여러개 받을 수 있는 타이핑 찾기
      edge: 0.30,
      cluster: 0.5
    };
    const strokeWidth = {
      nodes: 1.5,
      cluster: 2,
      edge: 2
    };
    const nodeSize = 9.5;
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph
    
    const colorZ = d3.interpolateSinebow;
    
    // 상준형 graphology 코드
    for(let i=0; i<bus.length; i++){
      graph.addNode(bus[i].id);
    }
    console.log(branch);
    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const communities = louvain(graph, {randomWalk: false}); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]
    //

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${-size.viewBox.minX}, ${-size.viewBox.minY}, ${size.viewBox.width + size.margin.right}, ${size.viewBox.height + size.margin.right}`)
      .attr("width", size.width)
      .attr("height", size.height);

    let treemapData = new TreemapDataModule(bus, branch, communities, size, nodeSize, strokeWidth, opacity)
    let treemapSelections = new TreemapSelectionsModule(treemapData, svg);
    let treemapEventListeners = new TreemapEventListenersModule(treemapData, treemapSelections);

    const edges = treemapSelections.getEdges();
    const clusters = treemapSelections.getClusters();
    const nodes = treemapSelections.getNodes();

    clusters.on("mouseenter", (event, d) => {
      console.log("mouseenter", event, d);
      // treemapEventListeners.clusterStrokeHighlightOn(event, d);
      treemapEventListeners.clusterNodesHighlightOn(event, d);
      treemapEventListeners.clusterNumberOn(event, d);
    })
    .on("mouseleave", (event, d) => {
      console.log("mouseleave", event, d);
      // treemapEventListeners.clusterStrokeHighlightOff(event, d);
      treemapEventListeners.clusterNodesHighlightOff(event, d);
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
      treemapEventListeners.adjacentNodesHighlightOff(event, d);
      treemapEventListeners.attachedEdgesHighlightOff(event, d);
      tooltipOff(event, d);
    })
    
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
