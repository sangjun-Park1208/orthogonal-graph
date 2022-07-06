import { TreemapData } from '../datas/treemap-data';
import * as d3 from 'd3';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { from } from 'rxjs';


export class TreemapSelections { 
  private treemapData: TreemapData;
  private svg: d3.Selection<any, unknown, null, undefined>;

  private edges: d3.Selection<d3.BaseType | SVGPathElement, IBranchData, SVGGElement, unknown>;
  private clusters: d3.Selection<d3.BaseType | SVGGElement, IClusterData, SVGGElement, unknown>;
  private nodes: d3.Selection<d3.BaseType | SVGRectElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>;
  private nodeTexts: d3.Selection<d3.BaseType | SVGTextElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>;
  // private nodePort: d3.Selection<d3.BaseType | SVGRectElement, IBusData, d3.BaseType, d3.HierarchyRectangularNode<any>>;

  
  constructor (treemapData: TreemapData, svg: d3.Selection<any, unknown, null, undefined>){
    this.treemapData = treemapData;
    this.svg = svg;
    const colorZ = treemapData.colorZ;
    const clusterCount = treemapData.getClusterCount();
    const areaCount = this.treemapData.getAreaCount();
    const allRP = this.treemapData.getAllRelativePosition();

    this.edges = this.svg.append("g")
      .attr("id", "edges")
      .selectAll("path")
      .data(this.treemapData.branch)
      .join("path")
      .attr("d", (d: any) => this.port_drawEdge(d))
      .attr("stroke", "steelblue")
      .attr("stroke-width", this.treemapData.strokeWidth.edge)
      .attr("fill", "none")
      .attr("stroke-opacity", this.treemapData.opacity.edge)
      .attr("shape-rendering", "crispEdges");
    console.log("edges", this.edges);
    // console.log("All_RP", allRP);

    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
  
    this.clusters = this.svg.append("g")
      .attr("id", "clusters_and_nodes")
      .selectAll("g")
      .data(this.treemapData.getClustersWithNodes())
      .join("g")
      .attr("id", (d:any) => ("cluster_" + (d.clusterinfo.data.id)));
      // d == clusterWithNodes : 9 clusters
      // each cluster has single object
      // each object has 'child'
  
    this.clusters.append("rect")
      .attr("fill", (d:any) => {
        const hsl = d3.hsl(colorZ(+d.clusterinfo.data.id / clusterCount));
        // console.log("hsl convertion", hsl);
        return `hsl(${hsl.h}, 0%, ${hsl.l}%)`;
      })
      // .attr("fill", "hsl(0, 0%, 70%)")
      .attr("fill-opacity", this.treemapData.opacity.cluster)
      .attr("width", (d:any) => {
        let m = d.clusterinfo;
        return (m.x1 - m.x0 > 5) ? xScale(m.x1 - m.x0)  : xScale(5) ;
      })
      .attr("height", (d:any) => {
        let m = d.clusterinfo;
        return (m.y1 - m.y0 > 5) ? yScale(m.y1 - m.y0)  : yScale(5) ;
      })
      .attr("x", (d:any) => {
        let m = d.clusterinfo;
        return xScale(m.x0) ;
      })
      .attr("y", (d:any) => {
        let m = d.clusterinfo;
        return yScale(m.y0) ;
      })
    //  .attr("shape-rendering", "crispEdges");

    // this.clusters.append("text")
    //   .attr("opacity", 0)
    //   .attr("dx", d => xScale((d.data.x0 + d.data.x1) / 2) )
    //   .attr("dy", d => yScale(d.data.y0 + this.treemapData.nodeSize*1.5))
    //   .attr("font-size", this.treemapData.nodeSize)
    //   .attr("text-anchor", "middle")
    //   .style("display", "inline-block")
    //   .style("pointer-events", "none")
    //   .html(d => `Cluster ${d.data.id}`)
    //   .attr("shape-rendering", "crispEdges");
    // console.log("clusters", this.clusters);

    const nodeSize = this.treemapData.nodeSize;
    const communities = this.treemapData.details.communities;
    console.log('nodesize', nodeSize)
    this.nodes = this.clusters.append("g")
      .attr("id", d => "cluster_" + d.clusterinfo.id + "_nodes")
      .selectAll("rect")
      .data(d => d.children)
      .join("rect")
      .attr("id", (d:any) => {
        return d.data.id;
      })
      // .attr("width", (d:any) => {
      //   return (d.x1 - d.x0 > 5) ? xScale(d.x1 - d.x0) : xScale(5);
      // })
      // .attr("height", (d:any) => {
      //   return (d.y1 - d.y0 > 5) ? yScale(d.y1 - d.y0) : yScale(5);
      // })
      // .attr("width", d => (d.x1 - d.x0 < nodeSize) ? xScale(nodeSize) : xScale(d.x1 - d.x0))
      // .attr("height", d => (d.y1 - d.y0 < nodeSize) ? xScale(nodeSize) : xScale(d.y1 - d.y0))
      // .attr("x", d =>  (xScale(d.x0)) )
      // .attr("y", d =>  (xScale(d.y0)) )
      .attr("width", d => xScale(nodeSize) )
      .attr("height", d => yScale(nodeSize) )
      .attr("x", d =>  (xScale((d.x0 + d.x1) / 2 - nodeSize / 2)))
      .attr("y", d =>  (yScale((d.y0 + d.y1) / 2 - nodeSize / 2)))
      .attr("fill", (d:any) => {
        return this.treemapData.colorZ(+d.data.parentId / areaCount);
      })
      .attr("fill-opacity", this.treemapData.opacity.node)
      .attr("shape-rendering", "crispEdges");
    console.log("nodes", this.nodes);

    this.nodeTexts = this.clusters.append("g")
      .attr("id", d => "cluster_" + d.clusterinfo.id + "_texts")
      .selectAll("g")
      .data(d => d.children)
      .join("g")
      .attr("text-anchor", "middle")
      .attr("font-weight", "bold")
      .attr("font-size", xScale(this.treemapData.nodeSize * 0.45))
      .style("display", "inline-block")
      .style("pointer-events", "none")
      .attr("shape-rendering", "crispEdges");

    // this.nodeTexts.filter(d => d.data.id / 1000 >= 1) // 1000이상의 인덱스는 천의 자리, 백의 자리로 나눠서 표시
    //   .append("text")
    //   .attr("id", "a")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2))
    //   .html(d => {
    //     return `${d.data.id}`.toString().substring(0,2);
    //   })

    // this.nodeTexts.filter(d => d.data.id / 1000 >= 1) 
    //   .append("text")
    //   .attr("id", "b")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2 + nodeSize * 0.4))
    //   .html(d => {
    //     return `${d.data.id}`.toString().substring(2,4);
    //   });

    // this.nodeTexts.filter(d => d.data.id / 1000 < 1) // 1000 미만의 인덱스는 한 줄에 표시
    //   .append("text")
    //   .attr("x", (d:any) => xScale((d.x0 + d.x1) / 2))
    //   .attr("y", (d:any) => yScale((d.y0 + d.y1) / 2))
    //   .html(d => {
    //     return `${d.data.id}`;
    //   });
      this.nodeTexts
        .append("text")
        .attr("x", (d: any) => xScale((d.x0 + d.x1) / 2))
        .attr("y", (d: any) => yScale((d.y0 + d.y1) / 2))
        .html(d => {
          return `${d.data.id}`;
        });
  }

  drawEdge(d: any): any {
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeXY = this.treemapData.getNodeXY();

    const fromNode = nodeXY.find(function (m) {
      return d.from == m.id;
    }) as IBusObjectData;
    const toNode = nodeXY.find(function (m) {
      return d.to == m.id;
    }) as IBusObjectData;

    let k = `M${xScale(fromNode.x)}, ${yScale(fromNode.y)}`; // 'path' starting point
    let xdif = toNode.x - fromNode.x; // x diff
    let ydif = toNode.y - fromNode.y; // y diff
    let absXdif = Math.abs(xdif); // |x diff|
    let absYdif = Math.abs(ydif); // |y diff|

    let xhalf = xScale((toNode.x + fromNode.x) /2); // x's half point between source & target.
    let yhalf = yScale((toNode.y + fromNode.y) /2); // y's half point between source & target.

    if(absXdif > absYdif) { // if |x diff| > |y diff|
      k += `L${xScale(fromNode.x)}, ${yhalf}`; // starts drawing : Vertical.
      k += `L${xScale(toNode.x)}, ${yhalf}`;
      k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`;
    }
    else { // if |x diff| <= |y diff|
      k += `L${xhalf}, ${yScale(fromNode.y)}`; // starts drawing : Horizontal.
      k += `L${xhalf}, ${yScale(toNode.y)}`;
      k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`; 
    }
    return k;
  }

  port_drawEdge(d: any): any { // 단자 입출력 edge drawing
    const xScale = this.treemapData.xScale;
    const yScale = this.treemapData.yScale;
    const nodeXY = this.treemapData.getNodeXY();
    const clusterCount = this.treemapData.getClusterCount();
    const relPo = this.treemapData.getRelativePosition(d.from);
    // console.log(`relpo`, relPo);
    // console.log(`nodeXY`, nodeXY);
    // console.log("d", d);
    const fRP = nodeXY.find(function(m){return d.from == m.id}) as IBusObjectData;
    // console.log(`nodeXY.relativePosition`, fRP)

    const fromNode = nodeXY.find(function (m) {
      return d.from == m.id;
    }) as IBusObjectData;
    const toNode = nodeXY.find(function (m) {
      return d.to == m.id;
    }) as IBusObjectData;
    console.log(fromNode)

    // fromNode.relativePosition = this.treemapData.getRelativePosition(+d.from);
    // console.log('d.from', d.from);

    let k = ''; // 'path' starting point
    let xdif = toNode.x - fromNode.x; // x diff
    let ydif = toNode.y - fromNode.y; // y diff
    let absXdif = Math.abs(xdif); // |x diff|
    let absYdif = Math.abs(ydif); // |y diff|

    const nodesize = this.treemapData.nodeSize;
    const checkIsNeighbor = (nodesize / 2) * 5;
    const xdist = (toNode.x - fromNode.x) **2;
    const ydist = (toNode.y - fromNode.y) **2;
    const dist = Math.sqrt(xdist + ydist);


    // if(dist < checkIsNeighbor){
    //   k += `M${xScale(fromNode.x)}, ${yScale(fromNode.y)}`;
    //   k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`;
    // }
    // console.log(`fromNode.relativePos`, fromNode.relativePosition)
    
    if(fromNode.relativePosition.includes(toNode.id)){
      // console.log(`from_relativePosition "${fromNode.id}", toNodeID`, from_relativePosition, toNode.id)
      k += `M${xScale(fromNode.x)}, ${yScale(fromNode.y)}`;
      k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`;
    }
    else{
      if(xdif > 0 && ydif > 0){
        if(absXdif < absYdif){
          k += `M${xScale(fromNode.p5[0])}, ${yScale(fromNode.p5[1])}`; // 출발 지점

          if(fromNode.relativePosition[1] == -1){ // 우측에 Node가 없는 경우
            k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
            k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(toNode.p11[1])}`;
            k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
          }
          else {
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[1] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p5[0] + toNode.p11[0]) / 2 < blockNode.p9[0]){ // Node Overlap 없는 상황
              k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
              k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(toNode.p11[1])}`;
              k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
            }
            else{ // Node overlap 발생 -> 우회 : edge bending 횟수 증가
              k += `L${xScale((fromNode.p5[0] + blockNode.p9[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
              k += `L${xScale((fromNode.p5[0] + blockNode.p9[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
            }
          }  
        }
        else{
          k += `M${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1])}`; // 출발 지점

          if(fromNode.relativePosition[2] == -1){ // 하단에 노드가 없는 경우
            k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
            k += `L${xScale(toNode.p0[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[2] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p6[1] + toNode.p0[1]) / 2 < blockNode.p2[1]){ // Node overlap 없는 상황
              k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
              k += `L${xScale(toNode.p0[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
              k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + blockNode.p2[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale((fromNode.p6[1] + blockNode.p2[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale(toNode.p11[1])}`;
              k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
            }
          }
        }
      }
      else if(xdif > 0 && ydif < 0){
        if(absXdif < absYdif){
          k += `M${xScale(fromNode.p3[0])}, ${yScale(fromNode.p3[1])}`; // 출발 지점

          if(fromNode.relativePosition[1] == -1){ // 우측에 노드가 없는 경우
            k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
            k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(toNode.p9[1])}`;
            k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[1] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p3[0] + toNode.p9[0]) / 2 < blockNode.p11[0]){ // Node overlap 없는 상황
              k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
              k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(toNode.p9[1])}`;
              k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale((fromNode.p3[0] + blockNode.p11[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
              k += `L${xScale((fromNode.p3[0] + blockNode.p11[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
            }
          }
        }
        else{
          k += `M${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1])}`; // 출발 지점

          if(fromNode.relativePosition[0] == -1){ // 상단에 노드가 없는 경우
            k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
            k += `L${xScale(toNode.p8[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[0] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p2[1] + toNode.p8[1]) / 2 > blockNode.p6[1]){ // Node overlap 없는 경우
              k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
              k += `L${xScale(toNode.p8[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
              k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + blockNode.p6[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale((fromNode.p2[1] + blockNode.p6[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale(toNode.p9[1])}`;
              k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
            }
          }
        }
      }
      else if(xdif < 0 && ydif > 0){
        if(absXdif < absYdif){
          k += `M${xScale(fromNode.p9[0])}, ${yScale(fromNode.p9[1])}`; // 출발 지점

          if(fromNode.relativePosition[3] == -1){ // 좌측에 노드가 없는 경우
            k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
            k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(toNode.p3[1])}`;
            k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[3] == m.id+1;
            }) as IBusObjectData;


            if((fromNode.p9[0] + toNode.p3[0]) / 2 > blockNode.p5[0]){ // Node overlap 없는 경우
              k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
              k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(toNode.p3[1])}`;
              k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale((fromNode.p9[0] + blockNode.p5[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
              k += `L${xScale((fromNode.p9[0] + blockNode.p5[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
            }
          }
        }
        else{
          k += `M${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1])}`; // 출발 지점

          if(fromNode.relativePosition[2] == -1){ // 하단에 노드가 없는 경우
            k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
            k += `L${xScale(toNode.p2[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[2] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p8[1] + toNode.p2[1]) / 2 < blockNode.p0[1]){ // Node overlap 없는 경우
              k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
              k += `L${xScale(toNode.p2[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
              k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + blockNode.p0[1]) / 2)}`;
              k += `L${xScale(toNode.p3[0] - (nodesize / 3)*2)}, ${yScale((fromNode.p8[1] + blockNode.p0[1]) / 2)}`;
              k += `L${xScale(toNode.p3[0] - (nodesize / 3)*2)}, ${yScale(toNode.p3[1])}`;
              k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
            }
          }
        }
      }
      else if(xdif < 0 && ydif < 0){
        if(absXdif < absYdif){
          k += `M${xScale(fromNode.p11[0])}, ${yScale(fromNode.p11[1])}`; // 출발 지점

          if(fromNode.relativePosition[3] == -1){
            k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
            k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(toNode.p5[1])}`;
            k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[3] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p11[1] + toNode.p5[1]) / 2 > blockNode.p3[0]){ // Node overlap 없는 경우
              k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
              k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(toNode.p5[1])}`;
              k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
            }
            else{ // Node overlap 발생 -> 우회

              k += `L${xScale((fromNode.p11[0] + blockNode.p3[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
              k += `L${xScale((fromNode.p11[0] + blockNode.p3[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.y - (nodesize / 3)*2)}`;
              k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
            }
          }
        }
        else{
          k += `M${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1])}`; // 출발 지점

          if(fromNode.relativePosition[0] == -1){
            k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
            k += `L${xScale(toNode.p6[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
          }
          else{
            let blockNode = nodeXY.find(function (m) {
              return fromNode.relativePosition[0] == m.id+1;
            }) as IBusObjectData;

            if((fromNode.p0[1] + toNode.p6[1]) / 2 > blockNode.p8[1]){
              k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
              k += `L${xScale(toNode.p6[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
              k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
            }
            else{

              k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + blockNode.p8[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale((fromNode.p0[1] + blockNode.p8[1]) / 2)}`;
              k += `L${xScale(toNode.x - (nodesize / 3)*2)}, ${yScale(toNode.p5[1])}`;
              k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
            }
          }

        }
      }
      else if(xdif == 0){
        let rd = Math.floor(Math.random()*2);
        if(ydif > 0){
          if(rd == 0){
            k += `M${xScale(fromNode.p9[0])}, ${yScale(fromNode.p9[1])}`;
            k += `L${xScale(fromNode.p9[0] - (nodesize / 3)*2)}, ${yScale(fromNode.p9[1])}`;
            k += `L${xScale(fromNode.p9[0] - (nodesize / 3)*2)}, ${yScale(toNode.p11[1])}`;
            k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`
          }
          else{
            k += `M${xScale(fromNode.p5[0])}, ${yScale(fromNode.p5[1])}`;
            k += `L${xScale(fromNode.p5[0] + (nodesize / 3)*2)}, ${yScale(fromNode.p5[1])}`;
            k += `L${xScale(fromNode.p5[0] + (nodesize / 3)*2)}, ${yScale(toNode.p3[1])}`;
            k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`
          }
        }
        else{
          if(rd == 0){
            k += `M${xScale(fromNode.p11[0])}, ${yScale(fromNode.p11[1])}`;
            k += `L${xScale(fromNode.p11[0] - (nodesize / 3)*2)}, ${yScale(fromNode.p11[1])}`;
            k += `L${xScale(fromNode.p11[0] - (nodesize / 3)*2)}, ${yScale(toNode.p9[1])}`;
            k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`
          }
          else{
            k += `M${xScale(fromNode.p3[0])}, ${yScale(fromNode.p3[1])}`;
            k += `L${xScale(fromNode.p3[0] + (nodesize / 3)*2)}, ${yScale(fromNode.p3[1])}`;
            k += `L${xScale(fromNode.p3[0] + (nodesize / 3)*2)}, ${yScale(toNode.p5[1])}`;
            k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`
          }
        }
      }
      else if(ydif == 0){
        let rd = Math.floor(Math.random()*2);
        if(xdif > 0){
          if(rd == 0){
            k += `M${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1])}`;
            k += `L${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1] - (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1] - (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
          }
          else{
            k += `M${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1])}`;
            k += `L${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1] + (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1] + (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
          }
        }
        else{
          if(rd == 0){
            k += `M${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1])}`;
            k += `L${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1] - (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1] - (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
          }
          else{
            k += `M${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1])}`;
            k += `L${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1] + (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1] + (nodesize / 3)*2)}`;
            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
          } 
        }  
      }
    }
    return k;
  }
  
  getSvg() {
    return this.svg;
  };

  setEdges(edges: d3.Selection<d3.BaseType | SVGPathElement, IBranchData, SVGGElement, unknown>) {
    this.edges = edges;
  };

  getEdges() {
    return this.edges;
  };

  setClusters(clusters: d3.Selection<d3.BaseType | SVGGElement, IClusterData, SVGGElement, unknown>) {
    this.clusters = clusters;
  };

  getClusters() {
    return this.clusters;
  };

  setNodes(nodes: d3.Selection<d3.BaseType | SVGRectElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>) {
    this.nodes = nodes;
  };

  getNodes() {
    return this.nodes;
  };

  setNodeTexts(nodeTexts: d3.Selection<d3.BaseType | SVGTextElement, d3.HierarchyRectangularNode<any>, SVGGElement, IClusterData>) {
    this.nodes = nodeTexts;
  };

  getNodeTexts() {
    return this.nodeTexts;
  };
}
