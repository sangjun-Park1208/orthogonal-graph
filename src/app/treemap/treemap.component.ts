import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MultiGraph } from 'graphology';
import * as d3 from "d3"
import louvain, { LouvainOptions } from 'graphology-communities-louvain';
import * as rpm from 'src/shared/modules/random-position/random-position.module';
import * as tm from 'src/shared/modules/treemap/treemap.module';
import { ITabularData } from 'src/shared/interfaces/itabular-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data'
import { IBranchData } from 'src/shared/interfaces/ibranch-data';

@Component({
  selector: 'app-treemap',
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.css']
})

export class TreemapComponent implements OnInit {
  @ViewChild('rootSvg', {static : false}) rootSvg!: ElementRef;

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    d3.json('./assets/data/bus-1062 random position.json')
      .then(bus => {
        d3.csv('./assets/data/branch-1062.csv')
          .then(branch => {
            console.log("bus, branch", bus, branch);
            this.renderTreemap(bus, branch);
          })
      });
  } // 콜백헬 프로미스로 해결하기

  renderTreemap(bus: any, branch: any) : void{ // bus, branch별 매개변수
    const size = rpm.getSize();
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph
    // prototype 1 코드
    const x = rpm.setX(bus);
    const y = rpm.setY(bus);
    const xY = rpm.setXY(bus);
    console.log("x, y, xY", x, y, xY);

    const xMin = 0;
    const yMin = 0;
    const xMax = d3.max(x);
    const yMax = d3.max(y);
    console.log("xMax, yMax", xMax, yMax);

    const xDomain = [xMin, xMax as number];
    const yDomain = [yMin, yMax as number];

    const xRange = [0, size.viewBox.width - size.margin.right];
    const yRange = [0, size.viewBox.height - size.margin.bottom];
    console.log("xDomain xRange", xDomain, xRange);
    console.log("yDomain yRange", yDomain, yRange);

    const xScale = d3.scaleLinear(xDomain, xRange);
    const yScale = d3.scaleLinear(yDomain, yRange);
    const colorZ = d3.interpolateSinebow;

    const opacity = {
      node: 0.35,
      edge: 0.20,
      cluster: 0.4
    }

    // 상준형 graphology 코드
    for(let i=0; i<xY.length; i++){
      graph.addNode(xY[i].id);
    }
    console.log(branch);
    for (let i = 0; i < branch.length; i++) {
      graph.addEdge(branch[i].from, branch[i].to); // 중복 있어서 multi graph로 만듦
    }

    const communities = louvain(graph, {randomWalk: false}); // assign Louvain Algorithm
    console.log("communities", communities); // data type : number[]
    //

    const clusterCount = tm.setClusterCount(communities);
    console.log("clusterCount", clusterCount);
    
    let tabularData: ITabularData[] = tm.setTabularData(communities, clusterCount);
    console.log("tabularData", tabularData);

    const root = tm.setRoot(tabularData);
    root.sort((a: any, b: any) => { // 랜덤성 없애기 시도 (무시해도됨)
      return +b.id - +a.id;
    })
    console.log("d3 hierachy node data", root);

    // treemap 형태 지정 알고리즘 선택: treemap.tile(d3.타일링메소드명) (https://github.com/d3/d3-hierarchy/blob/v3.1.1/README.md#treemap-tiling)
    // cluster 내부 정점 여백 조정이나 클러스터간 여백 조정: treemap.padding[Inner, Outer, ...]
    // treemap 크기 조정: treemap.size([width, height])
    // 가로세로 값 반올림: treemap.round(boolean)

    const treemapLayout = tm.setTreemapLayout(size)(root); // default treemap 레이아웃 가져오기
    console.log("treemapLayout", treemapLayout);
    console.log("d3 treemapping data", root);

    const children = root.children as d3.HierarchyNode<any>[];
    console.log("children", children);

    const leaves = root.leaves(); //2차원 배열로 수정
    console.log("leaves", leaves);

    let clustersWithNodes: any[] = [];
    for (let i = 0; i < clusterCount; i++){
      const clusterData = {
        data: children.find(d => d.data.id == i + 1),
        children: leaves.filter(d => (i + 1 == d.data.parentId))
      };
      
      clustersWithNodes.push(clusterData);
    }
    console.log("cluster with nodes", clustersWithNodes);

    const nodeXY = leaves.map((d:any) => {return {id: +d.id - clusterCount, x: (d.x1 - d.x0 > 5) ? (d.x0 + d.x1) / 2 : d.x0 + 2.5, y: (d.y1 - d.y0 > 5) ? (d.y0 + d.y1) / 2 : d.y0 + 2.5} as IBusObjectData});
    nodeXY.sort((a: IBusObjectData, b: IBusObjectData) => {
      return (+a.id - +b.id);
    })
    console.log("nodeXY", nodeXY);

    const svg = d3.select(this.rootSvg.nativeElement)
      .attr("viewBox", `${size.viewBox.minX}, ${size.viewBox.minY}, ${size.viewBox.width}, ${size.viewBox.height}`);

    const edges = rpm.setEdges(svg, branch, xScale, yScale, nodeXY);
    console.log("edges", edges);

    const clusters = svg.append("g")
      .attr("id", "cluster and nodes")
      .selectAll("g")
      .data(clustersWithNodes)
      .join("g")
      .attr("id", (d:any) => ("cluster_" + (d.data.data.id)))
      .on("mouseover", (event, d) => {
        clusterStrokeHighlightOn(event, d);
        clusterNodesHighlightOn(event, d);
        clusterNumberOn(event, d);
      })
      .on("mouseout", (event, d) => {
        clusterStrokeHighlightOff(event, d);
        clusterNodesHighlightOff(event, d);
        clusterNumberOff(event, d);
      });

    clusters.append("rect")
      .attr("opacity", opacity.cluster)
      .attr("stroke", "black")
      .attr("fill", "white")
      .attr("stroke-width", 2)
      .attr("width", (d:any) => {
        let m = d.data;
        return (m.x1 - m.x0 > 5) ? xScale(m.x1 - m.x0) : xScale(5);
      })
      .attr("height", (d:any) => {
        let m = d.data;
        return (m.y1 - m.y0 > 5) ? yScale(m.y1 - m.y0) : yScale(5);
      })
      .attr("x", (d:any) => {
        let m = d.data;
        return xScale(m.x0);
      })
      .attr("y", (d:any) => {
        let m = d.data;
        return yScale(m.y0);
      });

    clusters.append("text")
      .attr("opacity", 0)
      .attr("dx", d => xScale((d.data.x0 + d.data.x1) / 2))
      .attr("dy", d => yScale(d.data.y0 + 12))
      .attr("font-size", 4)
      .attr("text-anchor", "middle")
      .html(d => `Cluster ${d.data.id}`)
      
    console.log("clusters", clusters);
      
    const nodes = clusters.append("g")
      .attr("id", d => "cluster_" + d.data.id + "_nodes")
      .selectAll("rect")
      .data(d => d.children)
      .join("rect")
      .attr("id", (d:any) => {
        return (+d.data.id - clusterCount);
      })
      .attr("width", (d:any) => {
        return (d.x1 - d.x0 > 5) ? xScale(d.x1 - d.x0) : xScale(5);
      })
      .attr("height", (d:any) => {
        return (d.y1 - d.y0 > 5) ? yScale(d.y1 - d.y0) : yScale(5);
      })
      // .attr("width", 5)
      // .attr("height", 5)
      .attr("x", (d:any) => {
        return xScale(d.x0);
      })
      .attr("y", (d:any) => {
        return yScale(d.y0);
      })
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
        // console.log("hsl convertion", hsl);
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      })
      .attr("fill-opacity", opacity.node)
      .on("mouseover", (event, d) => {
        console.log("mouseover", event, d);
        nodes.call(rpm.nodesHighlightOn, d);
        rpm.edgesHighlightOn(edges, d, clusterCount);
        tooltipOn(event, d);
        // showHighlight(event, d);
      })
      .on("mouseout", (event, d) => {
        console.log("mouseout", event, d);
        nodes.call(rpm.nodesHighlightOff);
        rpm.edgesHighlightOff(edges);
        tooltipOff(event, d);
        // hideHighlight(event, d);
      });
    console.log("nodes", nodes); 

    const tooltip = svg.append("g")
      .attr("id", "tooltip")
      .attr("opacity", 0);
    tooltip.append("rect")
      .attr("width", 40)
      .attr("height", 18)
      .attr("fill", "white")
      .attr("stroke", "black");

    const tooltipText = tooltip.append("text")
      .attr("font-size", 5)
      .attr("x", 5)
      .attr("y", 7);
    tooltipText.append("tspan")
      .attr("id", "id");
    tooltipText.append("tspan")
      .attr("x", 5)
      .attr("dy", 7)
      .attr("id", "parentId");

    const tooltipOn = (event: any, d: any) => {
      tooltip.attr("transform", `translate(${xScale(d.x0 + 10)}, ${yScale(d.y0 + 10)})`)
        .attr("opacity", 1)
        .select("rect")
        .attr("width", 40)
        .attr("height", 18);
      tooltip.select("#id")
        .html(`id: ${+d.data.id - clusterCount}`);
      tooltip.select("#parentId")
        .html(`cluster: ${+d.data.parentId}`);
    }

    const tooltipOff = (event: any, d: any) => {
      tooltip.attr("opacity", 0)
        .select("rect")
        .attr("width", 0)
        .attr("height", 0);
      tooltip.select("#id")
        .html("");
      tooltip.select("#parentId")
        .html("");
    }

    const clusterNodesHighlightOn = (event: any, d:any) => {
      const clusterNodesSelection = d3.select(`#cluster_${d.data.id}_nodes`)
        .selectAll("rect")
        .attr("fill", (d: any) => colorZ(+d.data.parentId / clusterCount));

      // console.log("clusterNodesSelection", clusterNodesSelection);
    }

    const clusterNodesHighlightOff = (event: any, d:any) => {
      const clusterNodesSelection = d3.select(`#cluster_${d.data.id}_nodes`)
        .selectAll("rect")
        .attr("fill", (d:any) => {
          const hsl = d3.hsl(colorZ(+d.data.parentId / clusterCount));
          // console.log("hsl convertion", hsl);
          return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
        });

      // console.log("clusterNodesSelection", clusterNodesSelection);
    }

    const clusterStrokeHighlightOn = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("rect")
        .attr("stroke-width", 3)
        .attr("opacity", opacity.cluster + 0.2);
    }

    const clusterStrokeHighlightOff = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("rect")
        .attr("stroke-width", 2)
        .attr("opacity", opacity.cluster);
      // clusters.
    }

    const clusterNumberOn = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("text")
        .attr("opacity", 1);
    }

    const clusterNumberOff = (event: any, d: any) => {
      d3.select(`#cluster_${d.data.id}`)
        .select("text")
        .attr("opacity", 0);
    }

    // random-position module method temporary revision
    const edgesHighlightOn = (event: any, d: any) => {  // d3 이벤트 리스너의 매개변수 event형 찾아야함 any 최소화해야한다..
      // clusterCount를 d3.select로 가져오든 뭐든 해당 리스너에서 자체적으로 가져올 수 있게 해야함. 외부변수에서 가져오면 이벤트리스너 규격 못지킴
      d3.select("#edges")
        .filter((m: any, i) => {
        return (+m.from == +d.id - clusterCount || +m.to == +d.id - clusterCount);
      })
        .attr("stroke-width", "2px")
        .attr("stroke-opacity", 1);
      // 간선과 인접한 정점도 강조할 것
    };

    const nodesHighlightOn = (event: any, d: any) => {
      d3.select(`#cluster_${d.id}_nodes`)
        .filter((m, i) => {
        return m === d;
      })
        .attr("fill-opacity", 1);
    }

     // svg.append("use")
    //   .attr("xlink:href", "#nodes");
    // svg.append("use")
    //   .attr("xlink:href", "#tooltip");
  }
}
