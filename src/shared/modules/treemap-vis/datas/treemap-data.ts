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
    
    this.clusterCount = _details.count;
    this._colorZ = d3.interpolateSinebow;

    let tabularData: ITabularData[] = [];
    let clusterCount = this.clusterCount;
    
    const communities = _details.communities;
    tabularData = Object.keys(communities).map(d => { // 잎 추가 (노드 id는 클러스터 노드)
      return {id: +d + clusterCount, parentId: communities[d] + 1};
    });
    
    let areaSet = new Set();
    _bus.forEach(d => {
      areaSet.add(+d.area);
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
    // console.log("root", root);

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
        data: this.children.find(d => d.data.id == i + 1) as d3.HierarchyRectangularNode<any>,
        children: this.leaves.filter(d => (i + 1 == d.data.parentId) ) as d3.HierarchyRectangularNode<any>[]
      };
      
      clustersWithNodes.push(clusterData);
    }
    // console.log("before node coordinate data", clustersWithNodes)
    this.clustersWithNodes = clustersWithNodes;
    this.clusterInterval = [];
    for (let i = 0; i < clusterCount; i++){
      const clusterX1 = clustersWithNodes[i].data.x1;
      const clusterX0 = clustersWithNodes[i].data.x0;
      const clusterY1 = clustersWithNodes[i].data.y1;
      const clusterY0 = clustersWithNodes[i].data.y0;

      const nodeCount = clustersWithNodes[i].children.length;
      const clusterWidth = clusterX1 - clusterX0;
      const clusterHeight = clusterY1 - clusterY0;

      let heightNodeCount = Math.ceil(Math.sqrt(clusterHeight / clusterWidth * nodeCount));
      let widthNodeCount = Math.ceil(nodeCount / heightNodeCount);

      heightNodeCount += 1;
      widthNodeCount += 1;

      const availableWidthLength = clusterX1 - clusterX0;
      const availableHeightLength = clusterY1 - clusterY0;
      const widthInterval = availableWidthLength / widthNodeCount;
      const heightInterval = availableHeightLength / heightNodeCount;
      this.clusterInterval.push([widthInterval, heightInterval]);

      let x = clusterX0;
      let y = clusterY0 + heightInterval;
      let dx = widthInterval;
      for (let j = 0; j < nodeCount; j++){
        x += dx;
        if ((dx > 0) ? (x >= clusterX1) : (x <= clusterX0)){
          dx *= -1;
          x = (dx > 0) ? clusterX0 + widthInterval : clusterX1 - widthInterval;
          y += heightInterval;
        }
        
        clustersWithNodes[i].children[j].x0 = x - _nodeSize / 2;
        clustersWithNodes[i].children[j].x1 = x + _nodeSize / 2;
        
        clustersWithNodes[i].children[j].y0 = y - _nodeSize / 2;
        clustersWithNodes[i].children[j].y1 = y + _nodeSize / 2;
      }
    }
    this.clustersWithNodes = clustersWithNodes;
    this.root = root;
    //

    this.nodeXY = this.leaves.map((d:any) => (
      {id: +d.id - clusterCount, 
        x: d.x0 + _nodeSize / 2, 
        y: d.y0 + _nodeSize / 2} as IBusObjectData));

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
        y: d.y0 + nodeSize / 2} as IBusObjectData));
  }

  public setClustersWithNodes() {
    let clustersWithNodes: IClusterData[] = [];  // 각 cluster에 해당하는 nodes 데이터가 있도록 구조 변경
    for (let i = 0; i < this.clusterCount; i++){
      const clusterData = {
        data: this.children.find(d => d.data.id == i + 1) as d3.HierarchyRectangularNode<any>,
        children: this.leaves.filter(d => (i + 1 == d.data.parentId) ) as d3.HierarchyRectangularNode<any>[]
      };
      clustersWithNodes.push(clusterData);
    }
    this.clustersWithNodes = clustersWithNodes;
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
