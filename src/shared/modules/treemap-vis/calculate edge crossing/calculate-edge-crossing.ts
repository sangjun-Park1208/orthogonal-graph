import { IBranchData } from "src/shared/interfaces/ibranch-data";
import { TreemapData } from "../datas/treemap-data";

class EdgeInfo {
  private eCase: number;
  public eType: number[] = [1, 2, 1];//h,w,h
  public xy: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

  constructor(eCase: number) {
    this.eCase = eCase;
  }

  public init(x1: number, x2: number, y1: number, y2: number) {
    if (this.eCase == 1) {
      this.xy[0][0] = x1;
      this.xy[0][1] = y1;
      this.xy[0][2] = x1;
      this.xy[0][3] = (y1 + y2) / 2;
      this.xy[1][0] = x1;
      this.xy[1][1] = (y1 + y2) / 2;
      this.xy[1][2] = x2;
      this.xy[1][3] = (y1 + y2) / 2;
      this.xy[2][0] = x2;
      this.xy[2][1] = (y1 + y2) / 2;
      this.xy[2][2] = x2;
      this.xy[2][3] = y2;
    }
    else if (this.eCase == 2) {
      this.eType[0] = 2, this.eType[1] = 1, this.eType[2] = 2;
      this.xy[0][0] = x1;
      this.xy[0][1] = y1;
      this.xy[0][2] = (x1 + x2) / 2;
      this.xy[0][3] = y1;
      this.xy[1][0] = (x1 + x2) / 2;
      this.xy[1][1] = y1;
      this.xy[1][2] = (x1 + x2) / 2;
      this.xy[1][3] = y2;
      this.xy[2][0] = (x1 + x2) / 2;
      this.xy[2][1] = y2;
      this.xy[2][2] = x2;
      this.xy[2][3] = y2;
    }
  }
  public e_sort() {
    for (let i = 0; i < 3; i++) {//좌표 크기대로 정렬
      if (this.xy[i][0] > this.xy[i][2] || this.xy[i][1] > this.xy[i][3]) {
        let temp = this.xy[i][0];
        this.xy[i][0] = this.xy[i][2];
        this.xy[i][2] = temp;
        temp = this.xy[i][1];
        this.xy[i][1] = this.xy[i][3];
        this.xy[i][3] = temp;
      }
    }
  }
}

export class EdgeCrossingCountCalculator { 
  private treemapData: TreemapData;
  private branch: IBranchData[];
  private edgeList: EdgeInfo[];
  private totalLength;
  private sameCount: number[];
  private edgeCrossingCount: number;

  constructor(treemapData: TreemapData, branch: IBranchData[]){
    this.treemapData = treemapData;
    this.branch = branch;
    this.edgeList = new Array<EdgeInfo>();
    this.totalLength = 0;
    this.sameCount = [];
    this.edgeCrossingCount = 0;
  }
  
  calculateEdgeCrossingCount (): number[] {
    const branch = this.branch;
    branch.forEach(d => this.initializeEdgeList(d));

    let edgeList = this.edgeList;    
  
    // let test=0;
    for (let i = 0; i < branch.length; i++) {
      let temp = 0;
      for (let k = 0; k < i; k++) {
        temp += k;
      }
      for (let j = 0; j < i; j++) {
        this.sameCount.push(0);
        if ((edgeList[i].xy[0][0] == edgeList[j].xy[0][0] && edgeList[i].xy[0][1] == edgeList[j].xy[0][1])
          || (edgeList[i].xy[0][0] == edgeList[j].xy[2][2] && edgeList[i].xy[0][1] == edgeList[j].xy[2][3])
          || (edgeList[i].xy[2][2] == edgeList[j].xy[0][0] && edgeList[i].xy[2][3] == edgeList[j].xy[0][1])
          || (edgeList[i].xy[2][2] == edgeList[j].xy[2][2] && edgeList[i].xy[2][3] == edgeList[j].xy[2][3])){
          this.sameCount[temp + j]--;
        }
      }
    }
  
    for (let i = 0; i < branch.length; i++) {//branch.length  까지
      edgeList[i].e_sort();
      for (let j = 0; j < i; j++) {
        if (i == j) continue;
        this.Edge_cross(i, j);
      }
    }
    
    console.log("total length : " + this.totalLength);
    console.log("edge_crossing : " + this.edgeCrossingCount);
    return [this.totalLength, this.edgeCrossingCount];
  }
  
  initializeEdgeList(d: any) {
    const treemapData = this.treemapData;
    const xScale = treemapData.xScale;
    const yScale = treemapData.yScale;
    const nodeXY = treemapData.getNodeXY();
    let edgeList = this.edgeList;
    
    let xdif = nodeXY[d.to-1].x - nodeXY[d.from-1].x; // x diff
    let ydif = nodeXY[d.to-1].y - nodeXY[d.from-1].y; // y diff
    let abs_xdif = Math.abs(xdif); // |x diff|
    let abs_ydif = Math.abs(ydif); // |y diff|
  
    let xhalf = xScale((nodeXY[d.to-1].x + nodeXY[d.from-1].x) /2); // x's half point between source & target.
    let yhalf = yScale((nodeXY[d.to-1].y + nodeXY[d.from-1].y) /2); // y's half point between source & target.
  
    if(abs_xdif > abs_ydif) { // if |x diff| > |y diff|
      edgeList.push(new EdgeInfo(1))//eCase,to_cluster,from_cluster
      edgeList[edgeList.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
    }
    else { // if |x diff| <= |y diff|
      edgeList.push(new EdgeInfo(2))//eCase,to_cluster,from_cluster
      edgeList[edgeList.length - 1].init(nodeXY[d.from - 1].x, nodeXY[d.to - 1].x, nodeXY[d.from - 1].y, nodeXY[d.to - 1].y)
    }
    this.totalLength += abs_xdif + abs_ydif;
  }
  
  Edge_cross(i: number, j: number) {
    let edgeList = this.edgeList;
    let sameCount = this.sameCount;

    let temp = 0;
    for (let k = 0; k < i; k++) {
      temp += k;
    }
    for (let m = 0; m < 3; m++) {
      for (let n = 0; n < 3; n++) {
        if (edgeList[i].eType[m] != edgeList[j].eType[n]) {
          if (edgeList[i].eType[m] == 1) {
            //wh
            if (edgeList[j].xy[n][0] <= edgeList[i].xy[m][0] && edgeList[i].xy[m][0] <= edgeList[j].xy[n][2]
              && edgeList[i].xy[m][1] <= edgeList[j].xy[n][1] && edgeList[j].xy[n][1] <= edgeList[i].xy[m][3]) {
              sameCount[temp + j]++;
              if (sameCount[temp + j] == 1) break;
            }
          }
          //hw
          else if (edgeList[j].xy[n][1] <= edgeList[i].xy[m][1] && edgeList[i].xy[m][1] <= edgeList[j].xy[n][3]
            && edgeList[i].xy[m][0] <= edgeList[j].xy[n][0] && edgeList[j].xy[n][0] <= edgeList[i].xy[m][2]) {
            sameCount[temp + j]++;
            if (sameCount[temp + j] == 1) break;
          }
        }
        else if (edgeList[i].eType[m] == 2) {//ww
          if (edgeList[i].xy[m][1] == edgeList[j].xy[n][1] && !(edgeList[i].xy[m][2] < edgeList[j].xy[n][0]
            || edgeList[j].xy[n][2] < edgeList[i].xy[m][0])) {
            sameCount[temp + j]++;
            if (sameCount[temp + j] == 1) break;
          }
        }
        else if (edgeList[i].eType[m] == 1) {//hh
          if (edgeList[i].xy[m][0] == edgeList[j].xy[n][0] && !(edgeList[i].xy[m][3] < edgeList[j].xy[n][1]
            || edgeList[j].xy[n][3] < edgeList[i].xy[m][1])) {
            sameCount[temp + j]++;
            if (sameCount[temp + j] == 1) break;
          }
        }
      }
      if (sameCount[temp + j] == 1) {
        this.edgeCrossingCount++;
        break;
      }
    }
    this.sameCount = sameCount;
  }

  getEdgeList() {
    return this.edgeList;
  }

  getTotalLength() {
    return this.totalLength;
  }

  getSameCount() {
    return this.sameCount;
  }

  getEdgeCrossCount(){
    return this.edgeCrossingCount;
  }
}

