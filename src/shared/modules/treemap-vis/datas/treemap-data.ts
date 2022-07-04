import * as d3 from "d3";
import { ISize } from "src/shared/interfaces/isize";
import { ITabularData } from "src/shared/interfaces/itabular-data";
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IConstant } from 'src/shared/interfaces/iconstant';
import { IBusObjectData } from 'src/shared/interfaces/ibus-object-data';
import { IClusterData } from 'src/shared/interfaces/icluster-data';
import { DetailedLouvainOutput } from "graphology-communities-louvain";

export class TreemapData { 
  private _bus: IBusData[];
  private _branch: IBranchData[];
  private _details: DetailedLouvainOutput;

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

  constructor(_bus: IBusData[], _branch: IBranchData[], _details: DetailedLouvainOutput, _size: ISize, _nodeSize: number, _strokeWidth: IConstant, _opacity: IConstant){
    this._bus = _bus;
    this._branch = _branch;
    this._details = _details;
    
    this._size = _size;
    this._nodeSize = _nodeSize;
    this._strokeWidth = _strokeWidth;
    this._opacity = _opacity;
    
    this.clusterCount = _details.count; // Community 개수
    this._colorZ = d3.interpolateSinebow;

    let tabularData: ITabularData[] = [];
    let clusterCount = this.clusterCount;
    
    const communities = _details.communities;
    tabularData = Object.keys(communities).map(d => { // 잎 추가 (노드 id는 클러스터 노드)
      return {id: +d + clusterCount, parentId: communities[d] + 1};
    });

    // let areaSet = new Set();
    // _bus.forEach(d => {
    //   areaSet.add(+d.area);
    // });
    // this.areaCount = areaSet.size;
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
      console.log("chan", m); 
    });
    console.log("chan", x); 
    const xMin = d3.min(x, d => d[0]);
    console.log("chan", xMin); 
    const xMax = d3.max(x, d => d[1]);
    console.log("chan", xMax); 


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

      // console.log('clusterX0, Y0, X1, Y1', clusterX0, clusterY0, clusterX1, clusterY1)
      /*
      if (clusterX1 - clusterX0 < this.nodeSize + this.size.padding.left + this.size.padding.right){
        this.clustersWithNodes[i].data.x0 = (clusterX0 + clusterX1) / 2 - this.nodeSize / 2 - this.size.padding.left;  // nodeSize = 17
        this.clustersWithNodes[i].data.x1 = (clusterX0 + clusterX1) / 2 + this.nodeSize / 2 + this.size.padding.right; // padding left&right =
      }

      if (clusterY1 - clusterY0 < this.nodeSize + this.size.padding.top + this.size.padding.bottom){
        this.clustersWithNodes[i].data.y0 = (clusterY0 + clusterY1) / 2 - this.nodeSize / 2 - this.size.padding.top;
        this.clustersWithNodes[i].data.y1 = (clusterY0 + clusterY1) / 2 + this.nodeSize / 2 + this.size.padding.bottom;
      }
*/ // 왜 있는지 모르겠음

      const nodeCount = clustersWithNodes[i].children.length; // i번 cluster에 속한 노드 개수 : 118
      const clusterWidth = clusterX1 - clusterX0;
      const clusterHeight = clusterY1 - clusterY0;

      let heightNodeCount = Math.ceil(Math.sqrt((clusterHeight / clusterWidth) * nodeCount));
      let widthNodeCount = Math.ceil(nodeCount / heightNodeCount);

      heightNodeCount += 1;
      widthNodeCount += 1;
      console.log('heightNodeCount', heightNodeCount)
      console.log('widthNodeCount', widthNodeCount)
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
        p11: [d.x0, d.y1 - (d.y1-d.y0)*(3/4)]
      } as IBusObjectData));

    console.log(this.clusterInterval);
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

  public set details(details: DetailedLouvainOutput){
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
        p11: [d.x0, d.y1 - (d.y1-d.y0)*(3/4)]
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

  public setZNodePosition(){ // 'ㄹ'  layout 작성 알고리즘
    const clusterCount = this.getClusterCount();
    const nodeSize = this.nodeSize;
    let clustersWithNodes = this.getClustersWithNodes();
    for (let i = 0; i < clusterCount; i++){ // 9회 수행
      const clusterX1 = clustersWithNodes[i].clusterinfo.x1;
      const clusterX0 = clustersWithNodes[i].clusterinfo.x0;
      const clusterY0 = clustersWithNodes[i].clusterinfo.y0;

      const nodeCount = clustersWithNodes[i].children.length;
      const widthInterval = this.clusterInterval[i][0]; // 각 클러스터 별 children node들 간의 너비 간격
      const heightInterval = this.clusterInterval[i][1]; // 각 클러스터 별 children node들 간의 높이 간격

      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;
      for (let j = 0; j < nodeCount; j++){ // 118회 수행 
        x += dx;
        if ((dx > 0) ? (x + nodeSize > clusterX1) : (x - nodeSize < clusterX0)){
          dx *= -1;
          x = (dx > 0) ? clusterX0 + widthInterval : clusterX1 - widthInterval;
          y += heightInterval;
        }        
        clustersWithNodes[i].children[j].x0 = x - nodeSize / 2;
        clustersWithNodes[i].children[j].x1 = x + nodeSize / 2;
        
        clustersWithNodes[i].children[j].y0 = y - nodeSize / 2;
        clustersWithNodes[i].children[j].y1 = y + nodeSize / 2;
      } // for loop 한 바퀴 끝나면, x위치 재조정
    }
    this.clustersWithNodes = clustersWithNodes;
    this.setNodeXY();
    console.log('nodeXY', this.nodeXY)
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
}
