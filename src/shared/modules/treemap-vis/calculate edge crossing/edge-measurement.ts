import { IBranchData } from "src/shared/interfaces/ibranch-data";
import { IBusObjectData } from "src/shared/interfaces/ibus-object-data";
import { seqeunce_TreemapData } from "../datas/seqeunce-treemap-data";
import { TreemapData } from "../datas/treemap-data";
import { local_Random_TreemapData } from '../datas/local-random-treemap-data';
import { global_Random_TreemapData } from '../datas/global-random-treemap-data';


class EdgeInfo {
    public eType: number[] = [-1, -1, -1, -1]; //h=1,w=2. -1은 없음(NA)
    public xy: number[][] = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];

    constructor(x1: number, y1: number, x2: number, y2: number) {
        this.xy[0][0] = x1;
        this.xy[0][1] = y1;
        this.xy[3][2] = x2;
        this.xy[3][3] = y2;
    }

    public e_sort() {
        for (let i = 0; i < 4; i++) {
            if (this.eType[i] != -1 && this.xy[i][0] > this.xy[i][2] || this.xy[i][1] > this.xy[i][3]) {
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

export class EdgeMeasurement {
    private treemapData: TreemapData|seqeunce_TreemapData|local_Random_TreemapData|global_Random_TreemapData;
    private branch: IBranchData[];
    private edgeList: EdgeInfo[];
    private totalLength;
    private sameCount: number[];
    private edgeCrossingCount: number;
    private totalBending;

    constructor(treemapData: TreemapData|seqeunce_TreemapData|local_Random_TreemapData|global_Random_TreemapData, branch: IBranchData[]) {
        this.treemapData = treemapData;
        this.branch = branch;
        this.edgeList = new Array<EdgeInfo>();
        this.totalLength = 0;
        this.sameCount = [];
        this.edgeCrossingCount = 0;
        this.totalBending = 0;
    }

    calculateEdgeCrossingCount(): number[] {
        const branch = this.branch;
        branch.forEach(d => this.initializeEdgeList(d));

        let edgeList = this.edgeList;

        for (let i = 0; i < branch.length; i++) {
            let temp = 0;
            for (let k = 0; k < i; k++) {
                temp += k;
            }
            for (let j = 0; j < i; j++) {
                this.sameCount.push(0);
                if ((edgeList[i].xy[0][0] == edgeList[j].xy[0][0] && edgeList[i].xy[0][1] == edgeList[j].xy[0][1])
                    || (edgeList[i].xy[0][0] == edgeList[j].xy[3][2] && edgeList[i].xy[0][1] == edgeList[j].xy[3][3])
                    || (edgeList[i].xy[3][2] == edgeList[j].xy[0][0] && edgeList[i].xy[3][3] == edgeList[j].xy[0][1])
                    || (edgeList[i].xy[3][2] == edgeList[j].xy[3][2] && edgeList[i].xy[3][3] == edgeList[j].xy[3][3])) {
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
        console.log("total_bending : " + this.totalBending)
        return [this.totalLength, this.edgeCrossingCount, this.totalBending];
    }

    initializeEdgeList(d: any) {
        const xScale = this.treemapData.xScale;
        const yScale = this.treemapData.yScale;
        const nodeXY = this.treemapData.getNodeXY();
        let edgeList = this.edgeList;
        let edgeInfo : EdgeInfo;

        const fromNode = nodeXY.find(function (m) {
            return d.from == m.id;
        }) as IBusObjectData;
        const toNode = nodeXY.find(function (m) {
            return d.to == m.id;
        }) as IBusObjectData;

        let xdif = toNode.x - fromNode.x; // x diff
        let ydif = toNode.y - fromNode.y; // y diff
        let absXdif = Math.abs(xdif); // |x diff|
        let absYdif = Math.abs(ydif); // |y diff|
        const h = 1;
        const w = 2;

        const nodesize = this.treemapData.nodeSize;

        if (fromNode.relativePosition.includes(toNode.id)) {
            edgeInfo = new EdgeInfo(fromNode.x, fromNode.y, toNode.x, toNode.y);
            edgeInfo.xy[0][2] = toNode.x;
            edgeInfo.xy[0][3] = toNode.y;
            if (fromNode.x == toNode.x)//세로 일자
                edgeInfo.eType[0] = h;
            else //가로 일자
                edgeInfo.eType[0] = w;
        }
        else {
            if (xdif > 0 && ydif > 0) {
                if (absXdif < absYdif) {
                    if (fromNode.relativePosition[1] == -1) { // 우측에 Node가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p5[0], fromNode.p5[1], toNode.p11[0], toNode.p11[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p5[1];
                        edgeInfo.xy[1][0] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p5[1];
                        edgeInfo.xy[1][2] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p11[1]);
                        edgeInfo.xy[3][0] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p11[1]);
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[1] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p5[0] + toNode.p11[0]) / 2 < blockNode.p9[0]) { // Node Overlap 없는 상황
                            edgeInfo = new EdgeInfo(fromNode.p5[0], fromNode.p5[1], toNode.p11[0], toNode.p11[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p5[1];
                            edgeInfo.xy[1][0] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p5[1];
                            edgeInfo.xy[1][2] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                            edgeInfo.xy[1][3] = yScale(toNode.p11[1]);
                            edgeInfo.xy[3][0] = (fromNode.p5[0] + toNode.p11[0]) / 2;
                            edgeInfo.xy[3][1] = yScale(toNode.p11[1]);
                        }
                        else { // Node overlap 발생 -> 우회 : edge bending 횟수 증가
                            edgeInfo = new EdgeInfo(fromNode.p5[0], fromNode.p5[1], toNode.p0[0], toNode.p0[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[2] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = (fromNode.p5[0] + blockNode.p9[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p5[1];
                            edgeInfo.xy[1][0] = (fromNode.p5[0] + blockNode.p9[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p5[1];
                            edgeInfo.xy[1][2] = (fromNode.p5[0] + blockNode.p9[0]) / 2;
                            edgeInfo.xy[1][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][0] = (fromNode.p5[0] + blockNode.p9[0]) / 2;
                            edgeInfo.xy[2][1] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][2] = toNode.p0[0];
                            edgeInfo.xy[2][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[3][0] = toNode.p0[0];
                            edgeInfo.xy[3][1] = toNode.y - (nodesize / 3) * 2;

                            this.totalBending += 1;
                        }
                    }
                }
                else {
                    if (fromNode.relativePosition[2] == -1) { // 하단에 노드가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p6[0], fromNode.p6[1], toNode.p0[0], toNode.p0[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p6[0];
                        edgeInfo.xy[0][3] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p6[0];
                        edgeInfo.xy[1][1] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p0[0];
                        edgeInfo.xy[1][3] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p0[0];
                        edgeInfo.xy[3][1] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[2] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p6[1] + toNode.p0[1]) / 2 < blockNode.p2[1]) { // Node overlap 없는 상황
                            edgeInfo = new EdgeInfo(fromNode.p6[0], fromNode.p6[1], toNode.p0[0], toNode.p0[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = fromNode.p6[0];
                            edgeInfo.xy[0][3] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p6[0];
                            edgeInfo.xy[1][1] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.p0[0];
                            edgeInfo.xy[1][3] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                            edgeInfo.xy[3][0] = toNode.p0[0];
                            edgeInfo.xy[3][1] = (fromNode.p6[1] + toNode.p0[1]) / 2;
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p6[0], fromNode.p6[1], toNode.p11[0], toNode.p11[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[2] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = fromNode.p6[0];
                            edgeInfo.xy[0][3] = (fromNode.p6[1] + blockNode.p2[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p6[0];
                            edgeInfo.xy[1][1] = (fromNode.p6[1] + blockNode.p2[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[1][3] = (fromNode.p6[1] + blockNode.p2[1]) / 2;
                            edgeInfo.xy[2][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][1] = (fromNode.p6[1] + blockNode.p2[1]) / 2;
                            edgeInfo.xy[2][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][3] = toNode.p11[1];
                            edgeInfo.xy[3][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[3][1] = toNode.p11[1];

                            this.totalBending += 1;
                        }
                    }
                }
            }
            else if (xdif > 0 && ydif < 0) {

                if (absXdif < absYdif) {
                    if (fromNode.relativePosition[1] == -1) { // 우측에 노드가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p3[0], fromNode.p3[1], toNode.p9[0], toNode.p9[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p3[1];
                        edgeInfo.xy[1][0] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p3[1];
                        edgeInfo.xy[1][2] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p9[1]);
                        edgeInfo.xy[3][0] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p9[1]);
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[1] == m.id;
                        }) as IBusObjectData;


                        if ((fromNode.p3[0] + toNode.p9[0]) / 2 < blockNode.p11[0]) { // Node overlap 없는 상황
                            edgeInfo = new EdgeInfo(fromNode.p3[0], fromNode.p3[1], toNode.p9[0], toNode.p9[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p3[1];
                            edgeInfo.xy[1][0] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p3[1];
                            edgeInfo.xy[1][2] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                            edgeInfo.xy[1][3] = yScale(toNode.p9[1]);
                            edgeInfo.xy[3][0] = (fromNode.p3[0] + toNode.p9[0]) / 2;
                            edgeInfo.xy[3][1] = yScale(toNode.p9[1]);
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p3[0], fromNode.p3[1], toNode.p8[0], toNode.p8[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[2] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = (fromNode.p3[0] + blockNode.p11[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p3[1];
                            edgeInfo.xy[1][0] = (fromNode.p3[0] + blockNode.p11[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p3[1];
                            edgeInfo.xy[1][2] = (fromNode.p3[0] + blockNode.p11[0]) / 2;
                            edgeInfo.xy[1][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][0] = (fromNode.p3[0] + blockNode.p11[0]) / 2;
                            edgeInfo.xy[2][1] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][2] = toNode.p8[0];
                            edgeInfo.xy[2][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[3][0] = toNode.p8[0];
                            edgeInfo.xy[3][1] = toNode.y - (nodesize / 3) * 2;
                            this.totalBending += 1;
                        }
                    }
                }
                else {
                    if (fromNode.relativePosition[0] == -1) { // 상단에 노드가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p2[0], fromNode.p2[1], toNode.p8[0], toNode.p8[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p2[0];
                        edgeInfo.xy[0][3] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p2[0];
                        edgeInfo.xy[1][1] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p8[0];
                        edgeInfo.xy[1][3] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p8[0];
                        edgeInfo.xy[3][1] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[0] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p2[1] + toNode.p8[1]) / 2 > blockNode.p6[1]) { // Node overlap 없는 경우
                            edgeInfo = new EdgeInfo(fromNode.p2[0], fromNode.p2[1], toNode.p8[0], toNode.p8[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = fromNode.p2[0];
                            edgeInfo.xy[0][3] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p2[0];
                            edgeInfo.xy[1][1] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.p8[0];
                            edgeInfo.xy[1][3] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                            edgeInfo.xy[3][0] = toNode.p8[0];
                            edgeInfo.xy[3][1] = (fromNode.p2[1] + toNode.p8[1]) / 2;
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p2[0], fromNode.p2[1], toNode.p9[0], toNode.p9[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[2] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = fromNode.p2[0];
                            edgeInfo.xy[0][3] = (fromNode.p2[1] + blockNode.p6[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p2[0];
                            edgeInfo.xy[1][1] = (fromNode.p2[1] + blockNode.p6[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[1][3] = (fromNode.p2[1] + blockNode.p6[1]) / 2;
                            edgeInfo.xy[2][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][1] = (fromNode.p2[1] + blockNode.p6[1]) / 2;
                            edgeInfo.xy[2][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][3] = toNode.p9[1];
                            edgeInfo.xy[3][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[3][1] = toNode.p9[1];

                            this.totalBending += 1;
                        }
                    }
                }
            }
            else if (xdif < 0 && ydif > 0) {
                if (absXdif < absYdif) {
                    if (fromNode.relativePosition[3] == -1) { // 좌측에 노드가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p9[0], fromNode.p9[1], toNode.p3[0], toNode.p3[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p9[1];
                        edgeInfo.xy[1][0] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p9[1];
                        edgeInfo.xy[1][2] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p3[1]);
                        edgeInfo.xy[3][0] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p3[1]);

                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[3] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p9[0] + toNode.p3[0]) / 2 > blockNode.p5[0]) { // Node overlap 없는 경우
                            edgeInfo = new EdgeInfo(fromNode.p9[0], fromNode.p9[1], toNode.p3[0], toNode.p3[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p9[1];
                            edgeInfo.xy[1][0] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p9[1];
                            edgeInfo.xy[1][2] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                            edgeInfo.xy[1][3] = yScale(toNode.p3[1]);
                            edgeInfo.xy[3][0] = (fromNode.p9[0] + toNode.p3[0]) / 2;
                            edgeInfo.xy[3][1] = yScale(toNode.p3[1]);
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p9[0], fromNode.p9[1], toNode.p2[0], toNode.p2[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[2] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = (fromNode.p9[0] + blockNode.p5[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p9[1];
                            edgeInfo.xy[1][0] = (fromNode.p9[0] + blockNode.p5[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p9[1];
                            edgeInfo.xy[1][2] = (fromNode.p9[0] + blockNode.p5[0]) / 2;
                            edgeInfo.xy[1][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][0] = (fromNode.p9[0] + blockNode.p5[0]) / 2;
                            edgeInfo.xy[2][1] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][2] = toNode.p2[0];
                            edgeInfo.xy[2][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[3][0] = toNode.p2[0];
                            edgeInfo.xy[3][1] = toNode.y - (nodesize / 3) * 2;
                            this.totalBending += 1;
                        }
                    }
                }
                else {
                    if (fromNode.relativePosition[2] == -1) { // 하단에 노드가 없는 경우
                        edgeInfo = new EdgeInfo(fromNode.p8[0], fromNode.p8[1], toNode.p2[0], toNode.p2[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p8[0];
                        edgeInfo.xy[0][3] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p8[0];
                        edgeInfo.xy[1][1] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p2[0];
                        edgeInfo.xy[1][3] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p2[0];
                        edgeInfo.xy[3][1] = (fromNode.p8[1] + toNode.p2[1]) / 2;

                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[2] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p8[1] + toNode.p2[1]) / 2 < blockNode.p0[1]) { // Node overlap 없는 경우
                            edgeInfo = new EdgeInfo(fromNode.p8[0], fromNode.p8[1], toNode.p2[0], toNode.p2[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = fromNode.p8[0];
                            edgeInfo.xy[0][3] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p8[0];
                            edgeInfo.xy[1][1] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.p2[0];
                            edgeInfo.xy[1][3] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                            edgeInfo.xy[3][0] = toNode.p2[0];
                            edgeInfo.xy[3][1] = (fromNode.p8[1] + toNode.p2[1]) / 2;
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p8[0], fromNode.p8[1], toNode.p3[0], toNode.p3[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[2] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = fromNode.p8[0];
                            edgeInfo.xy[0][3] = (fromNode.p8[1] + blockNode.p0[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p8[0];
                            edgeInfo.xy[1][1] = (fromNode.p8[1] + blockNode.p0[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[1][3] = (fromNode.p8[1] + blockNode.p0[1]) / 2;
                            edgeInfo.xy[2][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][1] = (fromNode.p8[1] + blockNode.p0[1]) / 2;
                            edgeInfo.xy[2][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][3] = toNode.p3[1];
                            edgeInfo.xy[3][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[3][1] = toNode.p3[1];
                            this.totalBending += 1;
                        }
                    }
                }
            }
            else if (xdif < 0 && ydif < 0) {
                if (absXdif < absYdif) {
                    if (fromNode.relativePosition[3] == -1) {
                        edgeInfo = new EdgeInfo(fromNode.p11[0], fromNode.p11[1], toNode.p5[0], toNode.p5[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p11[1];
                        edgeInfo.xy[1][0] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p11[1];
                        edgeInfo.xy[1][2] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p5[1]);
                        edgeInfo.xy[3][0] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p5[1]);
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[3] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p11[1] + toNode.p5[1]) / 2 > blockNode.p3[0]) { // Node overlap 없는 경우
                            edgeInfo = new EdgeInfo(fromNode.p11[0], fromNode.p11[1], toNode.p5[0], toNode.p5[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p11[1];
                            edgeInfo.xy[1][0] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p11[1];
                            edgeInfo.xy[1][2] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                            edgeInfo.xy[1][3] = yScale(toNode.p5[1]);
                            edgeInfo.xy[3][0] = (fromNode.p11[0] + toNode.p5[0]) / 2;
                            edgeInfo.xy[3][1] = yScale(toNode.p5[1]);
                        }
                        else { // Node overlap 발생 -> 우회
                            edgeInfo = new EdgeInfo(fromNode.p11[0], fromNode.p11[1], toNode.p6[0], toNode.p6[1]);
                            edgeInfo.eType[0] = w;
                            edgeInfo.eType[1] = h;
                            edgeInfo.eType[2] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = (fromNode.p11[0] + blockNode.p3[0]) / 2;
                            edgeInfo.xy[0][3] = fromNode.p11[1];
                            edgeInfo.xy[1][0] = (fromNode.p11[0] + blockNode.p3[0]) / 2;
                            edgeInfo.xy[1][1] = fromNode.p11[1];
                            edgeInfo.xy[1][2] = (fromNode.p11[0] + blockNode.p3[0]) / 2;
                            edgeInfo.xy[1][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][0] = (fromNode.p11[0] + blockNode.p3[0]) / 2;
                            edgeInfo.xy[2][1] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[2][2] = toNode.p6[0];
                            edgeInfo.xy[2][3] = toNode.y - (nodesize / 3) * 2;
                            edgeInfo.xy[3][0] = toNode.p6[0];
                            edgeInfo.xy[3][1] = toNode.y - (nodesize / 3) * 2;
                            this.totalBending += 1;
                        }
                    }
                }
                else {
                    if (fromNode.relativePosition[0] == -1) {
                        edgeInfo = new EdgeInfo(fromNode.p0[0], fromNode.p0[1], toNode.p6[0], toNode.p6[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p0[0];
                        edgeInfo.xy[0][3] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p0[0];
                        edgeInfo.xy[1][1] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p6[0];
                        edgeInfo.xy[1][3] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p6[0];
                        edgeInfo.xy[3][1] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[0] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p0[1] + toNode.p6[1]) / 2 > blockNode.p8[1]) {
                            edgeInfo = new EdgeInfo(fromNode.p0[0], fromNode.p0[1], toNode.p6[0], toNode.p6[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[3] = h;
                            edgeInfo.xy[0][2] = fromNode.p0[0];
                            edgeInfo.xy[0][3] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p0[0];
                            edgeInfo.xy[1][1] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.p6[0];
                            edgeInfo.xy[1][3] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                            edgeInfo.xy[3][0] = toNode.p6[0];
                            edgeInfo.xy[3][1] = (fromNode.p0[1] + toNode.p6[1]) / 2;
                        }
                        else {
                            edgeInfo = new EdgeInfo(fromNode.p0[0], fromNode.p0[1], toNode.p5[0], toNode.p5[1]);
                            edgeInfo.eType[0] = h;
                            edgeInfo.eType[1] = w;
                            edgeInfo.eType[2] = h;
                            edgeInfo.eType[3] = w;
                            edgeInfo.xy[0][2] = fromNode.p0[0];
                            edgeInfo.xy[0][3] = (fromNode.p0[1] + blockNode.p8[1]) / 2;
                            edgeInfo.xy[1][0] = fromNode.p0[0];
                            edgeInfo.xy[1][1] = (fromNode.p0[1] + blockNode.p8[1]) / 2;
                            edgeInfo.xy[1][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[1][3] = (fromNode.p0[1] + blockNode.p8[1]) / 2;
                            edgeInfo.xy[2][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][1] = (fromNode.p0[1] + blockNode.p8[1]) / 2;
                            edgeInfo.xy[2][2] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[2][3] = toNode.p5[1];
                            edgeInfo.xy[3][0] = toNode.x - (nodesize / 3) * 2;
                            edgeInfo.xy[3][1] = toNode.p5[1];

                            this.totalBending += 1;
                        }
                    }
                }
            }
            else if (xdif == 0) {
                // let rd = Math.floor(Math.random()*2);
                let rd = d.from%2;
                if (ydif > 0) {
                    if (rd == 0) {
                        edgeInfo = new EdgeInfo(fromNode.p9[0], fromNode.p9[1], toNode.p11[0], toNode.p11[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p9[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p9[1];
                        edgeInfo.xy[1][0] = (fromNode.p9[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p9[1];
                        edgeInfo.xy[1][2] = (fromNode.p9[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p11[1]);
                        edgeInfo.xy[3][0] = (fromNode.p9[0] + toNode.p11[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p11[1]);
                    }
                    else {
                        edgeInfo = new EdgeInfo(fromNode.p5[0], fromNode.p5[1], toNode.p3[0], toNode.p3[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p5[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p5[1];
                        edgeInfo.xy[1][0] = (fromNode.p5[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p5[1];
                        edgeInfo.xy[1][2] = (fromNode.p5[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p3[1]);
                        edgeInfo.xy[3][0] = (fromNode.p5[0] + toNode.p3[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p3[1]);
                    }
                }
                else {
                    if (rd == 0) {
                        edgeInfo = new EdgeInfo(fromNode.p11[0], fromNode.p11[1], toNode.p9[0], toNode.p9[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p11[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p11[1];
                        edgeInfo.xy[1][0] = (fromNode.p11[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p11[1];
                        edgeInfo.xy[1][2] = (fromNode.p11[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p9[1]);
                        edgeInfo.xy[3][0] = (fromNode.p11[0] + toNode.p9[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p9[1]);
                    }
                    else {
                        edgeInfo = new EdgeInfo(fromNode.p3[0], fromNode.p3[1], toNode.p5[0], toNode.p5[1]);
                        edgeInfo.eType[0] = w;
                        edgeInfo.eType[1] = h;
                        edgeInfo.eType[3] = w;
                        edgeInfo.xy[0][2] = (fromNode.p3[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[0][3] = fromNode.p3[1];
                        edgeInfo.xy[1][0] = (fromNode.p3[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[1][1] = fromNode.p3[1];
                        edgeInfo.xy[1][2] = (fromNode.p3[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[1][3] = yScale(toNode.p5[1]);
                        edgeInfo.xy[3][0] = (fromNode.p3[0] + toNode.p5[0]) / 2;
                        edgeInfo.xy[3][1] = yScale(toNode.p5[1]);
                    }
                }
            }
            else if (ydif == 0) {
                // let rd = Math.floor(Math.random()*2);
                let rd = d.from%2;
                if (xdif > 0) {
                    if (rd == 0) {
                        edgeInfo = new EdgeInfo(fromNode.p2[0], fromNode.p2[1], toNode.p0[0], toNode.p0[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p2[0];
                        edgeInfo.xy[0][3] = (fromNode.p2[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p2[0];
                        edgeInfo.xy[1][1] = (fromNode.p2[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p0[0];
                        edgeInfo.xy[1][3] = (fromNode.p2[1] + toNode.p0[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p0[0];
                        edgeInfo.xy[3][1] = (fromNode.p2[1] + toNode.p0[1]) / 2;

                    }
                    else {
                        edgeInfo = new EdgeInfo(fromNode.p6[0], fromNode.p6[1], toNode.p8[0], toNode.p8[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p6[0];
                        edgeInfo.xy[0][3] = (fromNode.p6[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p6[0];
                        edgeInfo.xy[1][1] = (fromNode.p6[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p8[0];
                        edgeInfo.xy[1][3] = (fromNode.p6[1] + toNode.p8[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p8[0];
                        edgeInfo.xy[3][1] = (fromNode.p6[1] + toNode.p8[1]) / 2;
                    }
                }
                else {
                    if (rd == 0) {
                        edgeInfo = new EdgeInfo(fromNode.p0[0], fromNode.p0[1], toNode.p2[0], toNode.p2[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p0[0];
                        edgeInfo.xy[0][3] = (fromNode.p0[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p0[0];
                        edgeInfo.xy[1][1] = (fromNode.p0[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p2[0];
                        edgeInfo.xy[1][3] = (fromNode.p0[1] + toNode.p2[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p2[0];
                        edgeInfo.xy[3][1] = (fromNode.p0[1] + toNode.p2[1]) / 2;
                    }
                    else {
                        edgeInfo = new EdgeInfo(fromNode.p8[0], fromNode.p8[1], toNode.p6[0], toNode.p6[1]);
                        edgeInfo.eType[0] = h;
                        edgeInfo.eType[1] = w;
                        edgeInfo.eType[3] = h;
                        edgeInfo.xy[0][2] = fromNode.p8[0];
                        edgeInfo.xy[0][3] = (fromNode.p8[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[1][0] = fromNode.p8[0];
                        edgeInfo.xy[1][1] = (fromNode.p8[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[1][2] = toNode.p6[0];
                        edgeInfo.xy[1][3] = (fromNode.p8[1] + toNode.p6[1]) / 2;
                        edgeInfo.xy[3][0] = toNode.p6[0];
                        edgeInfo.xy[3][1] = (fromNode.p8[1] + toNode.p6[1]) / 2;
                    }
                }
            }
            this.totalBending += 2;
        }
        edgeList.push(edgeInfo!);
        this.totalLength += absXdif + absYdif;
    }

    Edge_cross(i: number, j: number) {
        let edgeList = this.edgeList;
        let sameCount = this.sameCount;
        const h = 1;
        const w = 2;
        const NA = -1;

        let temp = 0;
        for (let k = 0; k < i; k++) {
            temp += k;
        }

        for (let m = 0; m < 4; m++) {
            if (edgeList[i].eType[m] == NA)
                continue;
            for (let n = 0; n < 4; n++) {
                if (edgeList[j].eType[n] == NA)
                    continue;
                if (edgeList[i].eType[m] == h && edgeList[j].eType[n] == w) {
                    if (edgeList[j].xy[n][0] <= edgeList[i].xy[m][0] && edgeList[i].xy[m][0] <= edgeList[j].xy[n][2]
                        && edgeList[i].xy[m][1] <= edgeList[j].xy[n][1] && edgeList[j].xy[n][1] <= edgeList[i].xy[m][3]) {
                        sameCount[temp + j]++;
                        if (sameCount[temp + j] == 1) break;
                    }
                }
                else if (edgeList[i].eType[m] == w && edgeList[j].eType[n] == h) {
                    if (edgeList[j].xy[n][1] <= edgeList[i].xy[m][1] && edgeList[i].xy[m][1] <= edgeList[j].xy[n][3]
                        && edgeList[i].xy[m][0] <= edgeList[j].xy[n][0] && edgeList[j].xy[n][0] <= edgeList[i].xy[m][2]) {
                        sameCount[temp + j]++;
                        if (sameCount[temp + j] == 1) break;
                    }
                }
                else if (edgeList[i].eType[m] == h && edgeList[j].eType[n] == h) {
                    if (edgeList[i].xy[m][0] == edgeList[j].xy[n][0] && !(edgeList[i].xy[m][3] < edgeList[j].xy[n][1]
                        || edgeList[j].xy[n][3] < edgeList[i].xy[m][1])) {
                        sameCount[temp + j]++;
                        if (sameCount[temp + j] == 1) break;
                    }
                }
                else if (edgeList[i].eType[m] == w && edgeList[j].eType[n] == w) {
                    if (edgeList[i].xy[m][1] == edgeList[j].xy[n][1] && !(edgeList[i].xy[m][2] < edgeList[j].xy[n][0]
                        || edgeList[j].xy[n][2] < edgeList[i].xy[m][0])) {
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

    getTotalBending() {
        return this.totalBending;
    }

    getSameCount() {
        return this.sameCount;
    }

    getEdgeCrossCount() {
        return this.edgeCrossingCount;
    }
}
