import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from "d3";
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data';
import { ISize } from 'src/shared/interfaces/isize';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { cluster, ScaleContinuousNumeric, ScaleLinear, ValueFn } from 'd3';

// oriented from prototype 1 code
let size : ISize = {
  viewBox: {minX: 0, minY: 0, width: 1000, height: 1000},
  margin: {left: 20, right: 20, top: 20, bottom: 20},
  padding: {left: 20, right: 20, top: 20, bottom: 20}
};

export function getSize(){
  return size;
}

export function setX(bus: IBusData) : Array<number> {
    return Object.keys(bus.x).map((d: string) => {
      return bus.x[+d];
    });
  }

export function setY(bus: IBusData) : Array<number> { 
    return Object.keys(bus.x).map((d:string) => {
      return bus.y[+d];
    });
  }

export function setXY(bus: IBusData) : Array<IBusObjectData> {
    return Object.keys(bus.x).map((d:string) => {
      return {id: bus["bus id"][+d], x: bus.x[+d], y: bus.y[+d]};
    })
  }

  // selection 객체는 의존 관계를 갖는 대상이 너무 많아 모듈 멤버로 넣을지 고민중...
  // -> svg.call 이용하는 형태로 전환
export function setBorder(selection: any, size: ISize): void {
    selection.append("g")
      .append("rect")
      .attr("fill", "none")
      .attr("stroke", "black")
      .attr("width", size.margin.left + size.viewBox.width - size.margin.left)
      .attr("height", size.margin.top + size.viewBox.height - size.margin.top);
}

export function setEdges(selection: d3.Selection<any, unknown, null, undefined>, // default edges selection 객체 리턴
    branch: Array<IBranchData>, 
    xScale: ScaleLinear<any, any, any>, 
    yScale: ScaleLinear<any, any, any>,
    xY: Array<IBusObjectData>) {
    return selection.append("g")
      .selectAll("path")
      .data(branch)
      .join("path")
      .attr("d", d => `M${xScale(xY[+d.from-1].x)}, ${yScale(xY[+d.from-1].y)} L${xScale(xY[+d.to-1].x)}, ${yScale(xY[+d.to-1].y)}`)
      .attr("stroke", "black")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.2);
  }

export function setNodes(selection: d3.Selection<any, unknown, null, undefined>, // default nodes selection 객체 리턴
    xScale: ScaleLinear<any, any, any>, 
    yScale: ScaleLinear<any, any, any>,
    xY: Array<IBusObjectData>) {
    return selection.append("g")
      .selectAll("circle")
      .data(xY)
      .join("circle")
      .attr("cx", d => (xScale(d.x)))
      .attr("cy", d => (yScale(d.y)))
      .attr("r", 5)
      .attr("fill", "black")
      .attr("fill-opacity", 0.4);
  }

// export function edgesHighlightOn (edges: d3.Selection<any, any, any, any>, d: any, clusterCount: number) {  // d3 이벤트 리스너의 매개변수 event형 찾아야함 any 최소화해야한다..
//   edges.filter((m, i) => {
//     return (+m.from == +d.id - clusterCount || +m.to == +d.id - clusterCount);
//   })
//     .attr("stroke-width", "2px")
//     .attr("stroke-opacity", 1);
//   // 간선과 인접한 정점도 강조할 것
// };

// export function nodesHighlightOn (nodes: d3.Selection<any, any, any, any>, d: any) {
//   nodes.filter((m, i) => {
//     return m === d;
//   })
//     .attr("fill-opacity", 1);
// }

// export function edgesHighlightOff (edges: d3.Selection<any, any, any, any>) {
//   edges.attr("stroke-width", "1px")
//     .attr("stroke-opacity", 0.2);
// }

// export function nodesHighlightOff (nodes: d3.Selection<any, any, any, any>) {
//   nodes.attr("fill-opacity", 0.6);
// }
