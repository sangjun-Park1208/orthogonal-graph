import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { shuffle } from 'd3';
import { DetailedLouvainOutput } from 'graphology-communities-louvain';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';
import { IConstant } from 'src/shared/interfaces/iconstant';
import { ISize } from 'src/shared/interfaces/isize';
import { ITabularData } from 'src/shared/interfaces/itabular-data';
import { EdgeMeasurement } from '../calculate edge crossing/edge-measurement';
import { RandomStatisticsService } from '../statistics/random-statistics.service';
import { TreemapEventListeners } from '../event-listeners/treemap-event-listeners';
import { TreemapSelections } from '../selections/treemap-selections';
import { INodeData } from 'src/shared/interfaces/inode-data';

export type Layout = 'Z_Layout'|'Sequence'|'Local_Random'|'Global_Random'

@Injectable({
  providedIn: 'root'
})

export class TreemapNode {
  private _bus: IBusData[];
  private _branch: IBranchData[];
  private _details: INodeData;

  private _size: ISize;
  private _nodeSize: number;
  private _strokeWidth: IConstant;
  private _opacity: IConstant;
  private _colorZ: any;

  private _xScale: d3.ScaleLinear<number, number, never>;
  private _yScale: d3.ScaleLinear<number, number, never>;

  private clusterCount: number;
  private areaCount: number;
  private tabularData: ITabularData[];
  private root: d3.HierarchyNode<any>;
  private nodeXY: IBusObjectData[];
  private clustersWithNodes: IClusterData[];
  private leaves: d3.HierarchyNode<any>[];
  private children: d3.HierarchyNode<any>[];
  private clusterInterval: number[][];
  private relativePosition: number[][]; // [id][N, E, S, W]

  layout:Layout;
  port:number;
  iter:number;
  d3_root: d3.Selection<SVGGElement, unknown, null, undefined>;
  treemapSelections: TreemapSelections;
  treemapEventListeners: TreemapEventListeners;
  init(_bus: IBusData[], _branch: IBranchData[], _details: INodeData, _size: ISize, _nodeSize: number, _strokeWidth: IConstant, _opacity: IConstant){
    this._bus = _bus;
    this._branch = _branch;
    this._details = _details;

    this._size = _size;
    this._nodeSize = _nodeSize;
    this._strokeWidth = _strokeWidth;
    this._opacity = _opacity;
    this.clusterCount = this.layout=='Global_Random' ? 1 : _details.count; // Community 개수

    this._colorZ = d3.interpolateSinebow;

    let tabularData: ITabularData[] = [];
    let clusterCount = this.clusterCount;

    const communities = _details.communities;
    tabularData = Object.keys(communities).map(d => { // 잎 추가 (노드 id는 클러스터 노드)
      return {id: +d + clusterCount, parentId: this.layout=='Global_Random' ? +1 : communities[d] + 1};
    });


    let areaSet = new Set();
    Object.keys(communities).map(d => {
      areaSet.add(+communities[d]);
    });
    this.areaCount = areaSet.size;
    tabularData.push({id: 0, parentId: undefined})  // 루트 추가

    for (let i = 0; i < clusterCount; i++){ // 클러스터 정점 추가
      tabularData.push({id: i + 1, parentId: 0});
    }
    this.tabularData = tabularData;

    let root: d3.HierarchyNode<any> = d3.stratify()
      (tabularData);
    root.count();
    console.log("root", root);

    this.children = root.children as d3.HierarchyNode<any>[];
    this.leaves = root.leaves().map(d => {
      // console.log("leaf data before", d);
      let bus = _bus.find((m) => {
        return m.id == d.data.id - clusterCount;
      })
      Object.assign(d.data, bus);
      // console.log("leaf data after", d);
      return d;
    });
    this.leaves.sort((a: d3.HierarchyNode<any>, b: d3.HierarchyNode<any>) => { // 미정렬시 edge에서 node 좌표 인식에 오류 발생
      return (+a.data.id - +b.data.id);
    });

    const size = this.size;
    d3.treemap()
      .tile(d3.treemapSquarify)
      .size([size.viewBox.width - size.margin.right, size.viewBox.height - size.margin.bottom])
      .paddingInner(size.padding.left)
      .paddingOuter(size.padding.left)
      .paddingLeft(size.padding.left)
      .paddingBottom(size.padding.bottom)
      .paddingRight(size.padding.right)
      .paddingTop(size.padding.top)
      .round(true)
      (root);

    let x: [number, number][] = [];
    root.each((d) => {
      let m = d as d3.HierarchyRectangularNode<any>;
      x.push([m.x0, m.x1]);
    });
    const xMin = d3.min(x, d => d[0]);
    const xMax = d3.max(x, d => d[1]);


    let y: [number, number][] = [];
    root.each((d) => {
      let m = d as d3.HierarchyRectangularNode<any>;
      y.push([m.y0, m.y1]);
    });
    this.root = root;

    const yMin = d3.min(y, d => d[0]);
    const yMax = d3.max(y, d => d[1]);

    const xDomain = [xMin as number, xMax as number];
    const yDomain = [yMin as number, yMax as number];

    const xRange = [0, size.width];
    const yRange = [0, size.height];

    this._xScale = d3.scaleLinear(xDomain, xRange);
    this._yScale = d3.scaleLinear(yDomain, yRange);

    let clustersWithNodes = [];
    for (let i = 0; i < clusterCount; i++){
      const clusterData = {
        clusterinfo: this.children.find(d => d.data.id == i + 1) as d3.HierarchyRectangularNode<any>, // 동일한 cluster
        children: this.leaves.filter(d => (i + 1 == d.data.parentId) ) as d3.HierarchyRectangularNode<any>[] // 해당 cluster의 자식노드(bus)들
      };
      clustersWithNodes.push(clusterData); // -> cluster1 ~ cluster9까지 세트화
    }

    this.clustersWithNodes = clustersWithNodes;
    this.clusterInterval = [];
    for (let i = 0; i < clusterCount; i++){ // 9회 수행 (cluster 갯수 == 9)
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1; // ex) i번 cluster 직사각형의 우하단 x좌표
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0; // ex) i번 cluster 직사각형의 좌상단 x좌표    (x0, y0)  (x1, y0)
      const clusterY1 = clustersWithNodes[i].clusterinfo.y1; // ex) i번 cluster 직사각형의 우하단 y좌표
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0; // ex) i번 cluster 직사각형의 좌상단 y좌표    (x0, y1)  (x1, y1)

      const nodeCount = clustersWithNodes[i].children.length; // i번 cluster에 속한 노드 개수 : 118
      const clusterWidth = clusterX1 - clusterX0;
      const clusterHeight = clusterY1 - clusterY0;

      let heightNodeCount = Math.ceil(Math.sqrt((clusterHeight / clusterWidth) * nodeCount));
      let widthNodeCount = Math.ceil(nodeCount / heightNodeCount);

      heightNodeCount += 1;
      widthNodeCount += 1;
      const widthInterval = clusterWidth / widthNodeCount;
      const heightInterval = clusterHeight / heightNodeCount;
      this.clusterInterval.push([widthInterval, heightInterval]);
    }
    this.clustersWithNodes = clustersWithNodes;
    console.log('clusterWithNodes', this.clustersWithNodes)

    this.nodeXY = this.leaves.map((d:any) => (
      {id: +d.id - clusterCount,
        x: (d.x0 + d.x1) / 2,
        y: (d.y0 + d.y1) / 2,
        p0: [d.x0 + (d.x1-d.x0)*(1/4), d.y0],
        p1: [d.x0 + (d.x1-d.x0)*(1/2), d.y0],
        p2: [d.x0 + (d.x1-d.x0)*(3/4), d.y0],
        p3: [d.x1, d.y0 + (d.y1-d.y0)*(1/4)],
        p4: [d.x1, d.y0 + (d.y1-d.y0)*(1/2)],
        p5: [d.x1, d.y0 + (d.y1-d.y0)*(3/4)],
        p6: [d.x1 - (d.x1-d.x0)*(1/4), d.y1],
        p7: [d.x1 - (d.x1-d.x0)*(1/2), d.y1],
        p8: [d.x1 - (d.x1-d.x0)*(3/4), d.y1],
        p9: [d.x0, d.y1 - (d.y1-d.y0)*(1/4)],
        p10: [d.x0, d.y1 - (d.y1-d.y0)*(1/2)],
        p11: [d.x0, d.y1 - (d.y1-d.y0)*(3/4)],
        relativePosition: []
      } as IBusObjectData));

    this.relativePosition = [];
  }
  constructor(private rs: RandomStatisticsService){
  }


  public set bus(bus: IBusData[]) {
    this._bus = bus;
  }

  public get bus(){
    return this._bus;
  }

  public set colorZ(colorZ: any) {
    this._colorZ = colorZ;
  }

  public get colorZ(){
    return this._colorZ;
  }

  public set branch(branch: IBranchData[]) {
    this._branch = branch;
  }

  public get branch(){
    return this._branch;
  }

  public set details(details: INodeData){
    this._details = details;
  }

  public get details() {
    return this._details;
  }

  public set size(size: ISize){
    this._size = size;
  }

  public get size() {
    return this._size;
  }

  public set nodeSize(nodeSize: number){
    this._nodeSize = nodeSize;
  }

  public get nodeSize() {
    return this._nodeSize;
  }

  public set strokeWidth(strokeWidth: IConstant) {
    this._strokeWidth = strokeWidth;
  }

  public get strokeWidth() {
    return this._strokeWidth;
  }

  public set opacity(opacity: IConstant) {
    this._opacity = opacity;
  }

  public get opacity() {
    return this._opacity;
  }

  public set xScale(_xScale: d3.ScaleLinear<number, number, never>) {
    this._xScale = _xScale;
  }

  public get xScale() {
    return this._xScale;
  }

  public set yScale(_yScale: d3.ScaleLinear<number, number, never>) {
    this._yScale = _yScale;
  }

  public get yScale() {
    return this._yScale;
  }

  public setClusterCount() {
    let details = this.details;
    this.clusterCount = details.count;
  }

  public setTabularData() {
    let tabularData: ITabularData[] = [];
    let clusterCount = this.clusterCount;
    let communities = this.details.communities;
    tabularData = Object.keys(communities).map(d => { // 잎 추가 (노드 id는 클러스터 노드)
      return {id: +d + clusterCount, parentId: communities[d] + 1};
    });

    tabularData.push({id: 0, parentId: undefined})  // 루트 추가

    for (let i = 0; i < clusterCount; i++){ // 클러스터 정점 추가
      tabularData.push({id: i + 1, parentId: 0});
    }
    this.tabularData = tabularData;
  }

  public setNodeXY() {
    const clusterCount = this.clusterCount;
    const nodeSize = this.nodeSize;

    this.nodeXY = this.leaves.map((d:any) => (
      {id: +d.id - clusterCount,
        x: d.x0 + nodeSize / 2,
        y: d.y0 + nodeSize / 2,
        p0: [d.x0 + (d.x1-d.x0)*(1/4), d.y0],
        p1: [d.x0 + (d.x1-d.x0)*(1/2), d.y0],
        p2: [d.x0 + (d.x1-d.x0)*(3/4), d.y0],
        p3: [d.x1, d.y0 + (d.y1-d.y0)*(1/4)],
        p4: [d.x1, d.y0 + (d.y1-d.y0)*(1/2)],
        p5: [d.x1, d.y0 + (d.y1-d.y0)*(3/4)],
        p6: [d.x1 - (d.x1-d.x0)*(1/4), d.y1],
        p7: [d.x1 - (d.x1-d.x0)*(1/2), d.y1],
        p8: [d.x1 - (d.x1-d.x0)*(3/4), d.y1],
        p9: [d.x0, d.y1 - (d.y1-d.y0)*(1/4)],
        p10: [d.x0, d.y1 - (d.y1-d.y0)*(1/2)],
        p11: [d.x0, d.y1 - (d.y1-d.y0)*(3/4)],
        relativePosition: this.relativePosition[+d.id - clusterCount]
      } as IBusObjectData));

  }

  public setClustersWithNodes() {
    let clustersWithNodes: IClusterData[] = [];  // 각 cluster에 해당하는 nodes 데이터가 있도록 구조 변경
    for (let i = 0; i < this.clusterCount; i++){
      const clusterData = {
        clusterinfo: this.children.find(d => d.data.id == i + 1) as d3.HierarchyRectangularNode<any>,
        children: this.leaves.filter(d => (i + 1 == d.data.parentId) ) as d3.HierarchyRectangularNode<any>[]
      };
      clustersWithNodes.push(clusterData);
    }
    this.clustersWithNodes = clustersWithNodes;
  }

  public getRelativePosition(id: number): number[]{
    return this.relativePosition[id];
  }

  public setRelativePosition(id: number, relativePos: number[]){
    this.relativePosition[id] = relativePos;
  }

  public getAllRelativePosition(){
    return this.relativePosition;
  }

  public getClusterCount() {
    return this.clusterCount;
  }

  public getAreaCount() {
    return this.areaCount;
  }

  public getTabularData() {
    return this.tabularData;
  }

  public getNodeXY() {
    return this.nodeXY;
  }

  public getRoot() {
    return this.root;
  }

  public getClustersWithNodes() {
    return this.clustersWithNodes;
  }

  public getClusterInterval() {
    return this.clusterInterval;
  }

  public iterNodePosition(){
    let edgeMeasurement;
    this.rs.fill_zero();
    if(this.layout=="Z_Layout"){
      this.setZNodePosition();
    }
    else if(this.layout=="Sequence"){
      this.setSeqNodePosition();
    }
    else if(this.layout=="Local_Random"){
      for(let i=0;i<this.iter;i++){
        this.setLocalNodePosition();
        edgeMeasurement=new EdgeMeasurement(this,this.branch,this.port);
        this.rs.l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
        this.rs.c_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
        this.rs.b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
      }
    }
    else if (this.layout == "Global_Random") {
      for (let i = 0; i < this.iter; i++) {
        this.setGlobalNodePosition();
        edgeMeasurement=new EdgeMeasurement(this,this.branch,this.port);
        this.rs.l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
        this.rs.c_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
        this.rs.b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
      }
    }
    this.treemapSelections=new TreemapSelections(this,this.d3_root,this.port);
    this.treemapEventListeners=new TreemapEventListeners(this,this.treemapSelections);
    edgeMeasurement=new EdgeMeasurement(this,this.branch,this.port);
    this.rs.edgeMeasurement=edgeMeasurement;
    this.rs.measurement=edgeMeasurement.calculateEdgeCrossingCount();
    this.rs.statistic_measurement();
  }

  public setZNodePosition(){ // 'ㄹ'  layout 작성 알고리즘
    const clusterCount = this.getClusterCount();
    const nodeSize = this.nodeSize;
    let clustersWithNodes = this.getClustersWithNodes();

    for (let i = 0; i < clusterCount; i++){ // 9회 수행
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1;  // Cluster box 끝 x좌표
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0;  // Cluster box 시작 x좌표
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0;  // Cluster box 시작 y좌표

      const nodeCount = clustersWithNodes[i].children.length;
      const widthInterval = this.clusterInterval[i][0]; // 각 클러스터 별 children node들 간의 너비 간격
      const heightInterval = this.clusterInterval[i][1]; // 각 클러스터 별 children node들 간의 높이 간격

      const children = clustersWithNodes[i].children;
      // console.log('children', children);


      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;


      let horizonLineCount = 1;
      let verticalLineCount = 1;
      let columnCount = 1; // 열 개수
      let rowCount = 1; // 행 개수
      let lastRowRemain = 0; // 마지막 행에 남아 있는 Node 개수
      let forwardIDDiff = 1;
      let reverseIdDiff;

      let checkColumnCount = 0;
      if(checkColumnCount == 0){ // Cluster 별 처음 한 번만 수행
        for(let k = 0; k < nodeCount; k++){
          x += dx;
          if(x + nodeSize > clusterX1)
            break;
          columnCount++;
        }
        if(columnCount>1)columnCount--;
        checkColumnCount++;
        rowCount = Math.ceil(nodeCount / columnCount);
        lastRowRemain = nodeCount % columnCount;
        x = clusterX0;
      }
      if(lastRowRemain == 0) lastRowRemain = columnCount;
      reverseIdDiff = columnCount*2 - forwardIDDiff;
      // console.log({nodeSize,x,dx,clusterX0,columnCount,rowCount,clusterX1});
      // for (let j = i*nodeCount+1; j <= (i+1)*nodeCount; j++){ // 118회 수행
      for (let j = 1; j <= nodeCount; j++){ // 118회 수행
        /* 각 노드 별 [North, East, South, West] 상대위치 결정 알고리즘 추가 */
        // console.log(`(${horizonLineCount}, ${verticalLineCount})`);
        let relativePositionID = [0, 0, 0, 0];
        x += dx;
        if(columnCount==1){
          x = clusterX1 - widthInterval;
          y += heightInterval;
          if(horizonLineCount==rowCount){
            relativePositionID[0] = +children[j-2].data.id; // j-1
            relativePositionID[1] = -1;
            relativePositionID[2] = -1;
            relativePositionID[3] = -1; // j+1
          }
          else{
            if(horizonLineCount==1){
              relativePositionID[0] = -1; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
            else{  
              relativePositionID[0] = +children[j-2].data.id; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
          }
          horizonLineCount++;
        }
        else if(dx > 0){ // 방향 : 왼쪽 --> 오른쪽
          if(x + nodeSize > clusterX1){ // 오른쪽 초과한 경우
            dx *= -1;
            x = clusterX1 - widthInterval;
            y += heightInterval; // 바로 아래에 배치
            
            horizonLineCount++;

            if(horizonLineCount == rowCount) { // 아래에 노드가 존재하지 않는 경우
              if(j==nodeCount){
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = -1;
                relativePositionID[3] = -1; // j+1
              }
              else {
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j].data.id; // j+1
              }
            }
            else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행일 때
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우\
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j].data.id; // j+1
              }
              else{ // 하단에 노드가 존재하는 경우 ***********************************
                // console.log(`j+reverseIdDiff-1(${j+reverseIdDiff-1}), nodeCount(${nodeCount})`)
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = +children[j + reverseIdDiff-1].data.id; // j + forwardIDDiff
                // relativePositionID[3] = +children[j+1].data.id; // j+1
                relativePositionID[3] = +children[j].data.id; // j+1

              }
            }
            else{ //아래에서 첫 번째,두 번째행이 아니고, 아래에 노드가 존재하는 경우
              relativePositionID[0] = +children[j-2].data.id; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j + forwardIDDiff-1].data.id; // j + forwardIDDiff-2
              relativePositionID[3] = +children[j].data.id; // j+1
            }
            verticalLineCount=columnCount-1;
            forwardIDDiff = columnCount*2-3;
            reverseIdDiff = columnCount*2 - forwardIDDiff;
            
          }
          else{ // 아직 초과하지 않은 경우
            if(horizonLineCount == 1){ // 1행인 경우**********************************************
              if(verticalLineCount == 1){ // 1열인 경우 (= Cluster의 첫 번째 노드인 경우)
                relativePositionID[0] = -1;
                // relativePositionID[1] = +children[j+1].data.id; // j+1
                relativePositionID[1] = +children[j].data.id; // j+1
                (verticalLineCount > columnCount-lastRowRemain)?relativePositionID[2] = +children[j + reverseIdDiff-1].data.id:relativePositionID[2] =-1;
                relativePositionID[3] = -1;

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else if(verticalLineCount == columnCount){ // 마지막 열인 경우
                relativePositionID[0] = -1;
                relativePositionID[1] = -1;
                // relativePositionID[2] = +children[j+1].data.id; // j+1
                relativePositionID[2] = +children[j].data.id; // j+1
                relativePositionID[3] = +children[j-2].data.id; // j-1

              }
              else{ // 양 끝 열이 아닌 경우
                relativePositionID[0] = -1;
                // relativePositionID[1] = +children[j+1].data.id; // j+1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = +children[j + reverseIdDiff-1].data.id; // j + reverseIdDiff-2
                relativePositionID[3] = +children[j-2].data.id; // j-1

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
            else if(horizonLineCount == rowCount){ // 마지막 행인 경우
              if(verticalLineCount == lastRowRemain){
                // if(j==5){
                //   console.log({columnCount,rowCount});
                // }
                relativePositionID[0] = +children[j - forwardIDDiff-1].data.id; // j - forwardIDDiff
                relativePositionID[1] = -1;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id; // j-1
              }
              else if(verticalLineCount == 1){ // 1열인 경우
                // console.log('asdfjdkasfj',{j,forwardIDDiff,reverseIdDiff,verticalLineCount});
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 1열 || 마지막 노드가 아닌 경우
                // console.log({j,forwardIDDiff,reverseIdDiff,verticalLineCount});
                relativePositionID[0] = +children[j-forwardIDDiff-1].data.id; // j-forwardIDDiff
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id; // j-1

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
            else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행인 경우
              if(verticalLineCount==1){ // 1열인 경우
                if(verticalLineCount <= columnCount-lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                  relativePositionID[0] = +children[j-2].data.id;
                  relativePositionID[1] = +children[j].data.id;
                  relativePositionID[2] = -1;
                  relativePositionID[3] = -1;

                  forwardIDDiff += 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount++;
                }
                else{ // 하단에 노드가 존재하는 경우
                  relativePositionID[0] = +children[j-2].data.id;
                  relativePositionID[1] = +children[j].data.id;
                  relativePositionID[2] = +children[j+reverseIdDiff-1].data.id;
                  relativePositionID[3] = -1;

                  forwardIDDiff += 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount++;
                }
              }
              else if(verticalLineCount == columnCount){ // 마지막 열인 경우 - 무조건 하단에 노드 존재
                relativePositionID[0] = +children[j-forwardIDDiff-1].data.id;
                relativePositionID[1] = -1;
                relativePositionID[2] = +children[j].data.id;
                relativePositionID[3] = +children[j-2].data.id;

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 1열 || 마지막 열이 아닌 경우
                if(verticalLineCount <= columnCount-lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                  relativePositionID[0] = +children[j-forwardIDDiff-1].data.id;
                  relativePositionID[1] = +children[j].data.id;
                  relativePositionID[2] = -1;
                  relativePositionID[3] = +children[j-2].data.id;

                  forwardIDDiff += 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount++;
                }
                else{ // 하단에 노드가 존재하는 경우
                  relativePositionID[0] = +children[j-forwardIDDiff-1].data.id;
                  relativePositionID[1] = +children[j].data.id;
                  relativePositionID[2] = +children[j+reverseIdDiff-1].data.id;
                  relativePositionID[3] = +children[j-2].data.id;

                  forwardIDDiff += 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount++;
                }
              }

            }
            else{ // 1행 || 마지막 행이 아닌 경우 **************************************
              if(verticalLineCount == 1){ // 1열인 경우

                relativePositionID[0] = +children[j-2].data.id; // j-1
                // relativePositionID[1] = +children[j+1].data.id; // j+1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = +children[j + reverseIdDiff-1].data.id; // j + reverseIdDiff-2
                relativePositionID[3] = -1;

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else if(verticalLineCount == columnCount){ // 마지막 열인 경우
                relativePositionID[0] = +children[j-forwardIDDiff-1].data.id; // j-forwardIDDiff
                relativePositionID[1] = -1;
                relativePositionID[2] = +children[j].data.id; // j+1
                relativePositionID[3] = +children[j-2].data.id; // j-1
                
              }
              else{ // 양 끝 열이 아닌 경우
                relativePositionID[0] = +children[j - forwardIDDiff-1].data.id; // j - forwardIDDiff
                // relativePositionID[1] = +children[j+1].data.id; // j+1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = +children[j + reverseIdDiff-1].data.id; // j + reverseIdDiff-2
                relativePositionID[3] = +children[j-2].data.id; // j-1

                forwardIDDiff += 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
          }
        }
        else{ // 방향 : 왼쪽 <-- 오른쪽
          if(x - nodeSize < clusterX0){ // 왼쪽 초과한 경우
            dx *= -1;
            x =  clusterX0 + widthInterval;
            y += heightInterval; // 바로 아래에 배치

            // console.log({j,verticalLineCount,horizonLineCount,forwardIDDiff});

            horizonLineCount++;

            if(horizonLineCount == rowCount) { // 아래에 노드가 존재하지 않는 경우
              if (j == nodeCount) {
                relativePositionID[0] = +children[j - 2].data.id; // j-1
                relativePositionID[1] = -1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;
              }
              else {
                relativePositionID[0] = +children[j - 2].data.id; // j-1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;
              }
            }
            else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행일 때
              if(verticalLineCount<= columnCount-lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;
              }
              else{ // 하단에 노드가 존재하는 경우 ***************************
                relativePositionID[0] = +children[j-2].data.id; // j-1
                // relativePositionID[1] = +children[j+1].data.id; // j+1
                relativePositionID[1] = +children[j].data.id; // j+1
                relativePositionID[2] = +children[nodeCount-1].data.id; // j + reverseIdDiff-2
                relativePositionID[3] = -1;
              }
            }
            else{ // 아래에 노드가 존재하는 경우
              relativePositionID[0] = +children[j-2].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + reverseIdDiff-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = -1;
            }

            forwardIDDiff = 3;
            reverseIdDiff = columnCount*2 - forwardIDDiff;
            verticalLineCount=2;
          }
          else{ // 아직 초과하지 않은 경우
            if(horizonLineCount == rowCount){ // 마지막 행인 경우
              if(verticalLineCount <= columnCount-lastRowRemain+1){
                relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j -reverseIdDiff
                relativePositionID[1] = +children[j-2].data.id; // j-1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;
              }
              else if(verticalLineCount == 1){ // 1열인 경우 (= Cluster의 마지막 노드인 경우)
                relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                relativePositionID[1] = +children[j-2].data.id; // j-1
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;
              }
              else if(verticalLineCount == columnCount-1){ // 마지막 열인 경우
                relativePositionID[0] = +children[j-2].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = -1;
                relativePositionID[3] = -1; // j+1

                forwardIDDiff -= 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount--;
              }
              else{ // 1열 || 마지막 열이 아닌 경우
                // console.log(`verticalLineCount(${verticalLineCount}), lastRowRemain(${lastRowRemain}), j{${j}}`)
                if(verticalLineCount == lastRowRemain-1){ // 마지막에서 두 번째 열인 경우
                  relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                  relativePositionID[1] = +children[j-2].data.id; // j-1
                  relativePositionID[2] = -1;
                  relativePositionID[3] = +children[nodeCount-1].data.id; // j+1
                }
                else{
                  // console.log({columnCount,j,verticalLineCount,horizonLineCount,forwardIDDiff,reverseIdDiff,lastRowRemain});
                  relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                  relativePositionID[1] = +children[j-2].data.id; // j-1
                  relativePositionID[2] = -1;
                  relativePositionID[3] = +children[j].data.id; // j+1
                }

                forwardIDDiff -= 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount--;
              }
            }
            else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행인 경우
              if(verticalLineCount == 1){ // 1열인 경우 (하단에 노드 존재함)
                relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                relativePositionID[1] = +children[j-2].data.id; // j-1
                relativePositionID[2] = +children[j].data.id; // j+1
                relativePositionID[3] = -1;
              }
              else if(verticalLineCount == columnCount){ // 마지막 열인 경우
                if(lastRowRemain < verticalLineCount){ // 하단에 노드가 존재하지 않는 경우
                  relativePositionID[0] = +children[j-2].data.id; // j-1
                  relativePositionID[1] = -1;
                  relativePositionID[2] = -1;
                  relativePositionID[3] = +children[j].data.id; // j+1

                  forwardIDDiff -= 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount--;
                }
                else{ // 하단에 노드가 존재하는 경우
                  relativePositionID[0] = +children[j-1].data.id; // j-1
                  relativePositionID[1] = -1;
                  relativePositionID[2] = +children[j + forwardIDDiff-2].data.id; // j + forwardIDDiff-2
                  relativePositionID[3] = +children[j].data.id; // j+1

                  forwardIDDiff -= 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount--;
                }
              }
              else{ // 1열 || 마지막 열이 아닌 경우
                // if(j + forwardIDDiff-1 >= (i+1)*nodeCount){ // 하단에 노드가 존재하지 않는 경우
                if(lastRowRemain < verticalLineCount){ // 하단에 노드가 존재하지 않는 경우

                  relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                  relativePositionID[1] = +children[j-2].data.id; // j-1
                  relativePositionID[2] = -1;
                  relativePositionID[3] = +children[j].data.id; // j+1

                  forwardIDDiff -= 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount--;
                }
                else{ // 하단에 노드가 존재하는 경우
                  relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                  relativePositionID[1] = +children[j-2].data.id; // j-1
                  relativePositionID[2] = +children[j + forwardIDDiff-1].data.id; // j + forwardIDDiff-2
                  relativePositionID[3] = +children[j].data.id; // j+1

                  forwardIDDiff -= 2;
                  reverseIdDiff = columnCount*2 - forwardIDDiff;

                  verticalLineCount--;
                }
              }
            }
            else{ // 마지막 행이 아닌 경우 *******************************************************
              if(verticalLineCount == 1){ // 1열인 경우
                relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                relativePositionID[1] = +children[j-2].data.id; // j-1
                relativePositionID[2] = +children[j].data.id; // j+1
                relativePositionID[3] = -1;
              }
              else if(verticalLineCount == columnCount){ // 마지막 열인 경우

              // relativePositionID[0] = +children[j-1].data.id; // j-1
                relativePositionID[0] = +children[j-reverseIdDiff-1].data.id; // j-1
                relativePositionID[1] = -1;
                relativePositionID[2] = +children[j + forwardIDDiff-2].data.id; // j + forwardIDDiff-2
                relativePositionID[3] = +children[j].data.id; // j+1

                forwardIDDiff -= 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount--;
              }
              else{ // 1열 || 마지막 열이 아닌 경우

                relativePositionID[0] = +children[j - reverseIdDiff-1].data.id; // j - reverseIdDiff
                relativePositionID[1] = +children[j-2].data.id; // j-1
                relativePositionID[2] = +children[j + forwardIDDiff-1].data.id; // j + forwardIDDiff-2
                relativePositionID[3] = +children[j].data.id; // j+1

                forwardIDDiff -= 2;
                reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount--;
              }
            }
          }
        }

        this.setRelativePosition(children[j-1].data.id, relativePositionID);
        clustersWithNodes[i].children[j-1].x0 = x - nodeSize / 2;
        clustersWithNodes[i].children[j-1].x1 = x + nodeSize / 2;

        clustersWithNodes[i].children[j-1].y0 = y - nodeSize / 2;
        clustersWithNodes[i].children[j-1].y1 = y + nodeSize / 2;

      }
    }
    this.clustersWithNodes = clustersWithNodes;
    this.setNodeXY();
  }

  public setSeqNodePosition(){ // Sequence layout 작성 알고리즘
    const clusterCount = this.getClusterCount();
    const nodeSize = this.nodeSize;
    let clustersWithNodes = this.getClustersWithNodes();

    for (let i = 0; i < clusterCount; i++){ // 9회 수행
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1;  // Cluster box 끝 x좌표
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0;  // Cluster box 시작 x좌표
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0;  // Cluster box 시작 y좌표

      const nodeCount = clustersWithNodes[i].children.length;
      const widthInterval = this.clusterInterval[i][0]; // 각 클러스터 별 children node들 간의 너비 간격
      const heightInterval = this.clusterInterval[i][1]; // 각 클러스터 별 children node들 간의 높이 간격

      const children = clustersWithNodes[i].children;
      // console.log('children', children);


      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;


      let horizonLineCount = 1;
      let verticalLineCount = 1;
      let columnCount = 1; // 열 개수
      let rowCount = 1; // 행 개수
      let lastRowRemain = 0; // 마지막 행에 남아 있는 Node 개수
      let forwardIDDiff = 1;
      let reverseIdDiff;

      let checkColumnCount = 0;
      if(checkColumnCount == 0){ // Cluster 별 처음 한 번만 수행
        for(let k = 0; k < nodeCount; k++){
          x += dx;
          if(x + nodeSize > clusterX1)
            break;
          columnCount++;
        }
        if(columnCount>1)columnCount--;
        checkColumnCount++;
        rowCount = Math.ceil(nodeCount / columnCount);
        lastRowRemain = nodeCount % columnCount;
        x = clusterX0;
      }
      if(lastRowRemain == 0) lastRowRemain = columnCount;
      reverseIdDiff = columnCount*2 - forwardIDDiff;
      // for (let j = i*nodeCount+1; j <= (i+1)*nodeCount; j++){ // 118회 수행
      for (let j = 1; j <= nodeCount; j++){ // 118회 수행
        /* 각 노드 별 [North, East, South, West] 상대위치 결정 알고리즘 추가 */
        // console.log(`(${horizonLineCount}, ${verticalLineCount})`);
        let relativePositionID = [0, 0, 0, 0];
        x += dx;
        console.log({children});
        if(columnCount==1){
          x = clusterX1 - widthInterval;
          y += heightInterval;
          if(horizonLineCount==rowCount){
            relativePositionID[0] = +children[j-2].data.id; // j-1
            relativePositionID[1] = -1;
            relativePositionID[2] = -1;
            relativePositionID[3] = -1; // j+1
          }
          else{
            if(horizonLineCount==1){
              relativePositionID[0] = -1; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
            else{  
              relativePositionID[0] = +children[j-2].data.id; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
          }
          horizonLineCount++;
        }
        else if(x + nodeSize > clusterX1){
          x=clusterX0+widthInterval;
          y+=heightInterval;

          horizonLineCount++;
          // console.log('horizoinLinecount',horizonLineCount);
          verticalLineCount=1;

          if(horizonLineCount == rowCount){ // 아래에 노드가 존재하지 않는 경우
            if(j==nodeCount){
              relativePositionID[0] = +children[j - columnCount - 1].data.id; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = -1
              relativePositionID[3] = -1;
            }
            else {
              relativePositionID[0] = +children[j - columnCount - 1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1
              relativePositionID[3] = -1;
            }
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행일 때
            if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우\
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1
            }
            else{ // 하단에 노드가 존재하는 경우 ***********************************
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff
              // relativePositionID[3] = +children[j+1].data.id; // j+1
              relativePositionID[3] = -1
        
            }
          }
          else{ // 아래에 노드가 존재하는 경우
            
            relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
            relativePositionID[1] = +children[j].data.id; // j+1
            relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff-2
            relativePositionID[3] = -1
          }
          verticalLineCount++;
        }
        else{ // 아직 초과하지 않은 경우
          if(horizonLineCount == 1){ // 1행인 경우**********************************************
            if(verticalLineCount == 1){ // 1열인 경우 (= Cluster의 첫 번째 노드인 경우)
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              // console.log({j});
              relativePositionID[0] = -1;
              relativePositionID[1] = -1;
              (columnCount<=lastRowRemain)?relativePositionID[2] = +children[j + columnCount-1].data.id:relativePositionID[2] =-1;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount){ // 마지막 행인 경우
            if(verticalLineCount == lastRowRemain){
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1
              verticalLineCount++;
            }
            else if(verticalLineCount == 1){ // 1열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else{ // 1열 || 마지막 노드가 아닌 경우
            //   console.log('verticalLineCount',verticalLineCount);
            //   // console.log('columncount',columnCount);
            //   console.log('lastRowRemain',lastRowRemain);
            //   console.log("horizonLineCount",horizonLineCount);
            //   console.log('rowCount',rowCount);
            //   console.log("j",j);
            //   console.log('j' , j);
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행인 경우
            if(verticalLineCount==1){ // 1열인 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우 - 무조건 하단에 노드 존재
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                // console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id; // j-1

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id; // j-1
              }
              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
              // verticalLineCount=1;
            }
            else{ // 1열 || 마지막 열이 아닌 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                // console.log(`j+columnCount-1(${j + columnCount - 1}), nodeCount(${nodeCount})`)
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }

          }
          else{ // 1행 || 마지막 행이 아닌 경우 **************************************
            if(verticalLineCount == 1){ // 1열인 경우

              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j+columnCount-1].data.id; // j+1
              relativePositionID[3] = +children[j-2].data.id; // j-1
              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log(j);
              // console.log(`a(${j - columnCount*2-1}), nodeCount(${nodeCount})`);
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
        }


        this.setRelativePosition(children[j-1].data.id, relativePositionID);
        clustersWithNodes[i].children[j-1].x0 = x - nodeSize / 2;
        clustersWithNodes[i].children[j-1].x1 = x + nodeSize / 2;

        clustersWithNodes[i].children[j-1].y0 = y - nodeSize / 2;
        clustersWithNodes[i].children[j-1].y1 = y + nodeSize / 2;

      }
    }
    this.clustersWithNodes = clustersWithNodes;
    this.setNodeXY();
  }


  public setLocalNodePosition(){ // local_random  layout 작성 알고리즘
    const clusterCount = this.getClusterCount();
    const nodeSize = this.nodeSize;
    let clustersWithNodes = this.getClustersWithNodes();

    for (let i = 0; i < clusterCount; i++){ // 9회 수행
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1;  // Cluster box 끝 x좌표
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0;  // Cluster box 시작 x좌표
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0;  // Cluster box 시작 y좌표

      const nodeCount = clustersWithNodes[i].children.length;
      const widthInterval = this.clusterInterval[i][0]; // 각 클러스터 별 children node들 간의 너비 간격
      const heightInterval = this.clusterInterval[i][1]; // 각 클러스터 별 children node들 간의 높이 간격

      const children = clustersWithNodes[i].children;
      shuffle(children);
    //   console.log('children', children);
      console.log('children', children);



      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;


      let horizonLineCount = 1;
      let verticalLineCount = 1;
      let columnCount = 1; // 열 개수
      let rowCount = 1; // 행 개수
      let lastRowRemain = 0; // 마지막 행에 남아 있는 Node 개수
      let forwardIDDiff = 1;
      let reverseIdDiff;

      let checkColumnCount = 0;
      if(checkColumnCount == 0){ // Cluster 별 처음 한 번만 수행
        for(let k = 0; k < nodeCount; k++){
          x += dx;
          if(x + nodeSize > clusterX1)
            break;
          columnCount++;
        }
        if(columnCount>1)columnCount--;
        checkColumnCount++;
        rowCount = Math.ceil(nodeCount / columnCount);
        lastRowRemain = nodeCount % columnCount;
        x = clusterX0;
      }
      if(lastRowRemain == 0) lastRowRemain = columnCount;
      reverseIdDiff = columnCount*2 - forwardIDDiff;
      // for (let j = i*nodeCount+1; j <= (i+1)*nodeCount; j++){ // 118회 수행
      for (let j = 1; j <= nodeCount; j++){ // 118회 수행
        /* 각 노드 별 [North, East, South, West] 상대위치 결정 알고리즘 추가 */
        // console.log(`(${horizonLineCount}, ${verticalLineCount})`);
        let relativePositionID = [0, 0, 0, 0];
        x += dx;
        if(columnCount==1){
          x = clusterX1 - widthInterval;
          y += heightInterval;
          if(horizonLineCount==rowCount){
            relativePositionID[0] = +children[j-2].data.id; // j-1
            relativePositionID[1] = -1;
            relativePositionID[2] = -1;
            relativePositionID[3] = -1; // j+1
          }
          else{
            if(horizonLineCount==1){
              relativePositionID[0] = -1; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
            else{  
              relativePositionID[0] = +children[j-2].data.id; // j-1
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j].data.id;
              relativePositionID[3] = -1; // j+1
            }
          }
          horizonLineCount++;
        }
        else if(x + nodeSize > clusterX1){
          x=clusterX0+widthInterval;
          y+=heightInterval;

          horizonLineCount++;
          // console.log('horizoinLinecount',horizonLineCount);
          verticalLineCount=1;

          if(horizonLineCount == rowCount){ // 아래에 노드가 존재하지 않는 경우
            if(j==nodeCount){
              relativePositionID[0] = +children[j - columnCount - 1].data.id; // j-1
              relativePositionID[1] = -1
              relativePositionID[2] = -1
              relativePositionID[3] = -1;
            }
            else {
              relativePositionID[0] = +children[j - columnCount - 1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1
              relativePositionID[3] = -1;
            }
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행일 때
            if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우\
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1
            }
            else{ // 하단에 노드가 존재하는 경우 ***********************************
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff
              // relativePositionID[3] = +children[j+1].data.id; // j+1
              relativePositionID[3] = -1
        
            }
          }
          else{ // 아래에 노드가 존재하는 경우
            
            relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
            relativePositionID[1] = +children[j].data.id; // j+1
            relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff-2
            relativePositionID[3] = -1
          }
          verticalLineCount++;
        }
        else{ // 아직 초과하지 않은 경우
          if(horizonLineCount == 1){ // 1행인 경우**********************************************
            if(verticalLineCount == 1){ // 1열인 경우 (= Cluster의 첫 번째 노드인 경우)
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              relativePositionID[0] = -1;
              relativePositionID[1] = -1;
              // relativePositionID[2] = +children[j+1].data.id; // j+1
              (verticalLineCount<=lastRowRemain)?relativePositionID[2] = +children[j + columnCount-1].data.id:relativePositionID[2]=-1;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount){ // 마지막 행인 경우
            if(verticalLineCount == lastRowRemain){
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1
              verticalLineCount++;
            }
            else if(verticalLineCount == 1){ // 1열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else{ // 1열 || 마지막 노드가 아닌 경우
            //   console.log('verticalLineCount',verticalLineCount);
            //   // console.log('columncount',columnCount);
            //   console.log('lastRowRemain',lastRowRemain);
            //   console.log("horizonLineCount",horizonLineCount);
            //   console.log('rowCount',rowCount);
            //   console.log("j",j);
            //   console.log('j' , j);
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행인 경우
            if(verticalLineCount==1){ // 1열인 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우 - 무조건 하단에 노드 존재
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                //   console.log('verticalLineCount', verticalLineCount);
                //   console.log('lastRowRemain', lastRowRemain);
                //   console.log("horizonLineCount", horizonLineCount);
                //   console.log('rowCount', rowCount);
                //   console.log("j", j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id; // j-1

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id; // j-1
              }
              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
              // verticalLineCount=1;
            }
            else{ // 1열 || 마지막 열이 아닌 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                // console.log(`j+columnCount-1(${j + columnCount - 1}), nodeCount(${nodeCount})`)
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }

          }
          else{ // 1행 || 마지막 행이 아닌 경우 **************************************
            if(verticalLineCount == 1){ // 1열인 경우

              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j+columnCount-1].data.id; // j+1
              relativePositionID[3] = +children[j-2].data.id; // j-1
              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log(j);
              // console.log(`a(${j - columnCount*2-1}), nodeCount(${nodeCount})`);
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
        }

        this.setRelativePosition(children[j-1].data.id, relativePositionID);
        clustersWithNodes[i].children[j-1].x0 = x - nodeSize / 2;
        clustersWithNodes[i].children[j-1].x1 = x + nodeSize / 2;

        clustersWithNodes[i].children[j-1].y0 = y - nodeSize / 2;
        clustersWithNodes[i].children[j-1].y1 = y + nodeSize / 2;

      }
    }
    this.clustersWithNodes = clustersWithNodes;
    this.setNodeXY();
  }

  public setGlobalNodePosition(){ // global_random layout 작성 알고리즘
    const clusterCount = this.getClusterCount();
    const nodeSize = this.nodeSize;
    let clustersWithNodes = this.getClustersWithNodes();

    for (let i = 0; i < clusterCount; i++){ // 9회 수행
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1;  // Cluster box 끝 x좌표
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0;  // Cluster box 시작 x좌표
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0;  // Cluster box 시작 y좌표

      const nodeCount = clustersWithNodes[i].children.length;
      const widthInterval = this.clusterInterval[i][0]; // 각 클러스터 별 children node들 간의 너비 간격
      const heightInterval = this.clusterInterval[i][1]; // 각 클러스터 별 children node들 간의 높이 간격

      const children = clustersWithNodes[i].children;
      shuffle(children);
      // console.log('children', children);


      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;


      let horizonLineCount = 1;
      let verticalLineCount = 1;
      let columnCount = 1; // 열 개수
      let rowCount = 1; // 행 개수
      let lastRowRemain = 0; // 마지막 행에 남아 있는 Node 개수
      let forwardIDDiff = 1;
      let reverseIdDiff;

      let checkColumnCount = 0;
      if(checkColumnCount == 0){ // Cluster 별 처음 한 번만 수행
        for(let k = 0; k < nodeCount; k++){
          x += dx;
          if(x + nodeSize > clusterX1)
            break;
          columnCount++;
        }
        columnCount--;
        checkColumnCount++;
        rowCount = Math.ceil(nodeCount / columnCount);
        lastRowRemain = nodeCount % columnCount;
        x = clusterX0;
      }
      if(lastRowRemain == 0) lastRowRemain = columnCount;
      reverseIdDiff = columnCount*2 - forwardIDDiff;
      // for (let j = i*nodeCount+1; j <= (i+1)*nodeCount; j++){ // 118회 수행
      for (let j = 1; j <= nodeCount; j++){ // 118회 수행
        /* 각 노드 별 [North, East, South, West] 상대위치 결정 알고리즘 추가 */
        // console.log(`(${horizonLineCount}, ${verticalLineCount})`);
        let relativePositionID = [0, 0, 0, 0];
        x += dx;
        if(x + nodeSize > clusterX1){
          x=clusterX0+widthInterval;
          y+=heightInterval;

          horizonLineCount++;
          // console.log('horizoinLinecount',horizonLineCount);
          verticalLineCount=1;

          if(horizonLineCount == rowCount){ // 아래에 노드가 존재하지 않는 경우
            relativePositionID[0] = +children[j - columnCount - 1].data.id; // j-1
            relativePositionID[1] = +children[j].data.id; // j+1
            relativePositionID[2] = -1
            relativePositionID[3] = -1;
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행일 때
            if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우\
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1
            }
            else{ // 하단에 노드가 존재하는 경우 ***********************************
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff
              // relativePositionID[3] = +children[j+1].data.id; // j+1
              relativePositionID[3] = -1
        
            }
          }
          else{ // 아래에 노드가 존재하는 경우
            
            relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
            relativePositionID[1] = +children[j].data.id; // j+1
            relativePositionID[2] = +children[j + columnCount-1].data.id; // j + forwardIDDiff-2
            relativePositionID[3] = -1
          }
          verticalLineCount++;
        }
        else{ // 아직 초과하지 않은 경우
          if(horizonLineCount == 1){ // 1행인 경우**********************************************
            if(verticalLineCount == 1){ // 1열인 경우 (= Cluster의 첫 번째 노드인 경우)
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              // console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
              relativePositionID[0] = -1;
              relativePositionID[1] = -1;
              // relativePositionID[2] = +children[j+1].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
              relativePositionID[0] = -1;
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount){ // 마지막 행인 경우
            if(verticalLineCount == lastRowRemain){
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1
              verticalLineCount++;
            }
            else if(verticalLineCount == 1){ // 1열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else{ // 1열 || 마지막 노드가 아닌 경우
            //   console.log('verticalLineCount',verticalLineCount);
            //   // console.log('columncount',columnCount);
            //   console.log('lastRowRemain',lastRowRemain);
            //   console.log("horizonLineCount",horizonLineCount);
            //   console.log('rowCount',rowCount);
            //   console.log("j",j);
            //   console.log('j' , j);
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = -1;
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
          else if(horizonLineCount == rowCount-1){ // 밑에서 두 번째 행인 경우
            if(verticalLineCount==1){ // 1열인 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = -1;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우 - 무조건 하단에 노드 존재
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
                //   console.log('verticalLineCount', verticalLineCount);
                //   console.log('lastRowRemain', lastRowRemain);
                //   console.log("horizonLineCount", horizonLineCount);
                //   console.log('rowCount', rowCount);
                //   console.log("j", j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id; // j-1

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = -1
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id; // j-1
              }
              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
              // verticalLineCount=1;
            }
            else{ // 1열 || 마지막 열이 아닌 경우
              if(verticalLineCount > lastRowRemain){ // 하단에 노드가 존재하지 않는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = -1;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
              else{ // 하단에 노드가 존재하는 경우
              //   console.log('verticalLineCount',verticalLineCount);
              // console.log('lastRowRemain',lastRowRemain);
              // console.log("horizonLineCount",horizonLineCount);
              // console.log('rowCount',rowCount);
              // console.log("j",j);
                // console.log(`j+columnCount-1(${j + columnCount - 1}), nodeCount(${nodeCount})`)
                relativePositionID[0] = +children[j-columnCount-1].data.id;
                relativePositionID[1] = +children[j].data.id;
                relativePositionID[2] = +children[j+columnCount-1].data.id;
                relativePositionID[3] = +children[j-2].data.id;

                // forwardIDDiff += 2;
                // reverseIdDiff = columnCount*2 - forwardIDDiff;

                verticalLineCount++;
              }
            }

          }
          else{ // 1행 || 마지막 행이 아닌 경우 **************************************
            if(verticalLineCount == 1){ // 1열인 경우

              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-1
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = -1;

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
            else if(verticalLineCount == columnCount){ // 마지막 열인 경우
              relativePositionID[0] = +children[j-columnCount-1].data.id; // j-forwardIDDiff
              relativePositionID[1] = -1;
              relativePositionID[2] = +children[j+columnCount-1].data.id; // j+1
              relativePositionID[3] = +children[j-2].data.id; // j-1
              // verticalLineCount=1;
            }
            else{ // 양 끝 열이 아닌 경우
              // console.log(j);
              // console.log(`a(${j - columnCount*2-1}), nodeCount(${nodeCount})`);
              relativePositionID[0] = +children[j - columnCount-1].data.id; // j - forwardIDDiff
              // relativePositionID[1] = +children[j+1].data.id; // j+1
              relativePositionID[1] = +children[j].data.id; // j+1
              relativePositionID[2] = +children[j + columnCount-1].data.id; // j + reverseIdDiff-2
              relativePositionID[3] = +children[j-2].data.id; // j-1

              // forwardIDDiff += 2;
              // reverseIdDiff = columnCount*2 - forwardIDDiff;

              verticalLineCount++;
            }
          }
        }

        this.setRelativePosition(children[j-1].data.id, relativePositionID);
        clustersWithNodes[i].children[j-1].x0 = x - nodeSize / 2;
        clustersWithNodes[i].children[j-1].x1 = x + nodeSize / 2;

        clustersWithNodes[i].children[j-1].y0 = y - nodeSize / 2;
        clustersWithNodes[i].children[j-1].y1 = y + nodeSize / 2;

      }
    }
    this.clustersWithNodes = clustersWithNodes;
    this.setNodeXY();
  }
}
