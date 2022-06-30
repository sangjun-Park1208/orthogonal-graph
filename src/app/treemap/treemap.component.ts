import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { TreemapData } from 'src/shared/modules/treemap-vis/datas/treemap-data';
import { TreemapSelections } from 'src/shared/modules/treemap-vis/selections/treemap-selections';
import { TreemapEventListeners } from 'src/shared/modules/treemap-vis/event-listeners/treemap-event-listeners';
import { EdgeCrossingCountCalculator } from 'src/shared/modules/treemap-vis/calculate edge crossing/calculate-edge-crossing';

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
    d3.csv('./assets/data/bus-14.csv')
    // d3.csv('./assets/data/my_bus.csv')
      .then((bus: any) => {
        d3.csv('./assets/data/branch-14.csv')
        // d3.csv('./assets/data/my_branch.csv')
          .then((branch: any) => {
            console.log("bus, branch", bus, branch);
            this.renderTreemap(bus, branch);
          })
      });
  }
  
  renderTreemap(bus: IBusData[], branch: IBranchData[]) : void{ 
    const size = {
      width: 1700,
      height: 1000,
      viewBox: {minX: 20, minY: 20, width: 1700, height: 1000},
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
      edge: 1.5
    };
    const nodeSize = 17;
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph

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
      .attr("viewBox", `${-size.viewBox.minX} ${-size.viewBox.minY} ${size.viewBox.width + size.margin.right} ${size.viewBox.height + size.margin.bottom}`)
      .attr("width", size.width)
      .attr("height", size.height)
      .on("click", (event, d) => {
        // console.log("svg click", event, d);
        treemapEventListeners.restoreViewBox(event, d);
      });

    let treemapData = new TreemapData(bus, branch, details, size, nodeSize, strokeWidth, opacity);
    treemapData.setZNodePosition();
    let treemapSelections = new TreemapSelections(treemapData, svg);
    let treemapEventListeners = new TreemapEventListeners(treemapData, treemapSelections);
    let edgeCrossingCalculator = new EdgeCrossingCountCalculator(treemapData, branch);
    edgeCrossingCalculator.calculateEdgeCrossingCount();

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
