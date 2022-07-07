import { IBranchData } from "src/shared/interfaces/ibranch-data";
import { IBusObjectData } from "src/shared/interfaces/ibus-object-data";
import { TreemapData } from "../datas/treemap-data";

class EdgeInfo {
}

export class EdgeMeasurement {
    private treemapData: TreemapData;
    private branch: IBranchData[];
    private edgeList: EdgeInfo[];
    private totalLength;
    private sameCount: number[];
    private edgeCrossingCount: number;
    private totalBending;

    constructor(treemapData: TreemapData, branch: IBranchData[]) {
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

        //

        console.log("total length : " + this.totalLength);
        console.log("edge_crossing : " + this.edgeCrossingCount);
        console.log("total_bending : " + this.totalBending)
        return [this.totalLength, this.edgeCrossingCount];
    }

    initializeEdgeList(d: any) {
        const xScale = this.treemapData.xScale;
        const yScale = this.treemapData.yScale;
        const nodeXY = this.treemapData.getNodeXY();

        const fromNode = nodeXY.find(function (m) {
            return d.from == m.id;
        }) as IBusObjectData;
        const toNode = nodeXY.find(function (m) {
            return d.to == m.id;
        }) as IBusObjectData;

        let k = ''; // 'path' starting point
        let xdif = toNode.x - fromNode.x; // x diff
        let ydif = toNode.y - fromNode.y; // y diff
        let absXdif = Math.abs(xdif); // |x diff|
        let absYdif = Math.abs(ydif); // |y diff|

        const nodesize = this.treemapData.nodeSize;

        if (fromNode.relativePosition.includes(toNode.id)) {
            k += `M${xScale(fromNode.x)}, ${yScale(fromNode.y)}`;
            k += `L${xScale(toNode.x)}, ${yScale(toNode.y)}`;
        }
        else {
            if (xdif > 0 && ydif > 0) {
                if (absXdif < absYdif) {

                    k += `M${xScale(fromNode.p5[0])}, ${yScale(fromNode.p5[1])}`; // 출발 지점

                    if (fromNode.relativePosition[1] == -1) { // 우측에 Node가 없는 경우
                        k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
                        k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(toNode.p11[1])}`;
                        k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[1] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p5[0] + toNode.p11[0]) / 2 < blockNode.p9[0]) { // Node Overlap 없는 상황
                            k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
                            k += `L${xScale((fromNode.p5[0] + toNode.p11[0]) / 2)}, ${yScale(toNode.p11[1])}`;
                            k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회 : edge bending 횟수 증가
                            k += `L${xScale((fromNode.p5[0] + blockNode.p9[0]) / 2)}, ${yScale(fromNode.p5[1])}`;
                            k += `L${xScale((fromNode.p5[0] + blockNode.p9[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
                else {

                    k += `M${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1])}`; // 출발 지점

                    if (fromNode.relativePosition[2] == -1) { // 하단에 노드가 없는 경우
                        k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
                        k += `L${xScale(toNode.p0[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
                        k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[2] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p6[1] + toNode.p0[1]) / 2 < blockNode.p2[1]) { // Node overlap 없는 상황
                            k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
                            k += `L${xScale(toNode.p0[0])}, ${yScale((fromNode.p6[1] + toNode.p0[1]) / 2)}`;
                            k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale(fromNode.p6[0])}, ${yScale((fromNode.p6[1] + blockNode.p2[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale((fromNode.p6[1] + blockNode.p2[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale(toNode.p11[1])}`;
                            k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
            }
            else if (xdif > 0 && ydif < 0) {

                if (absXdif < absYdif) {
                    k += `M${xScale(fromNode.p3[0])}, ${yScale(fromNode.p3[1])}`; // 출발 지점

                    if (fromNode.relativePosition[1] == -1) { // 우측에 노드가 없는 경우
                        k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
                        k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(toNode.p9[1])}`;
                        k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[1] == m.id;
                        }) as IBusObjectData;


                        if ((fromNode.p3[0] + toNode.p9[0]) / 2 < blockNode.p11[0]) { // Node overlap 없는 상황
                            k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
                            k += `L${xScale((fromNode.p3[0] + toNode.p9[0]) / 2)}, ${yScale(toNode.p9[1])}`;
                            k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale((fromNode.p3[0] + blockNode.p11[0]) / 2)}, ${yScale(fromNode.p3[1])}`;
                            k += `L${xScale((fromNode.p3[0] + blockNode.p11[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
                else {
                    k += `M${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1])}`; // 출발 지점

                    if (fromNode.relativePosition[0] == -1) { // 상단에 노드가 없는 경우
                        k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
                        k += `L${xScale(toNode.p8[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
                        k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[0] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p2[1] + toNode.p8[1]) / 2 > blockNode.p6[1]) { // Node overlap 없는 경우
                            k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
                            k += `L${xScale(toNode.p8[0])}, ${yScale((fromNode.p2[1] + toNode.p8[1]) / 2)}`;
                            k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale(fromNode.p2[0])}, ${yScale((fromNode.p2[1] + blockNode.p6[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale((fromNode.p2[1] + blockNode.p6[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale(toNode.p9[1])}`;
                            k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
            }
            else if (xdif < 0 && ydif > 0) {
                if (absXdif < absYdif) {
                    k += `M${xScale(fromNode.p9[0])}, ${yScale(fromNode.p9[1])}`; // 출발 지점
                    if (fromNode.relativePosition[3] == -1) { // 좌측에 노드가 없는 경우
                        k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
                        k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(toNode.p3[1])}`;
                        k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[3] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p9[0] + toNode.p3[0]) / 2 > blockNode.p5[0]) { // Node overlap 없는 경우
                            k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
                            k += `L${xScale((fromNode.p9[0] + toNode.p3[0]) / 2)}, ${yScale(toNode.p3[1])}`;
                            k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale((fromNode.p9[0] + blockNode.p5[0]) / 2)}, ${yScale(fromNode.p9[1])}`;
                            k += `L${xScale((fromNode.p9[0] + blockNode.p5[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
                else {
                    k += `M${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1])}`; // 출발 지점

                    if (fromNode.relativePosition[2] == -1) { // 하단에 노드가 없는 경우
                        k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
                        k += `L${xScale(toNode.p2[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
                        k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[2] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p8[1] + toNode.p2[1]) / 2 < blockNode.p0[1]) { // Node overlap 없는 경우
                            k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
                            k += `L${xScale(toNode.p2[0])}, ${yScale((fromNode.p8[1] + toNode.p2[1]) / 2)}`;
                            k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale(fromNode.p8[0])}, ${yScale((fromNode.p8[1] + blockNode.p0[1]) / 2)}`;
                            k += `L${xScale(toNode.p3[0] + (nodesize / 3) * 2)}, ${yScale((fromNode.p8[1] + blockNode.p0[1]) / 2)}`;
                            k += `L${xScale(toNode.p3[0] + (nodesize / 3) * 2)}, ${yScale(toNode.p3[1])}`;
                            k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
            }
            else if (xdif < 0 && ydif < 0) {
                if (absXdif < absYdif) {
                    k += `M${xScale(fromNode.p11[0])}, ${yScale(fromNode.p11[1])}`; // 출발 지점

                    if (fromNode.relativePosition[3] == -1) {
                        k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
                        k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(toNode.p5[1])}`;
                        k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[3] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p11[1] + toNode.p5[1]) / 2 > blockNode.p3[0]) { // Node overlap 없는 경우
                            k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
                            k += `L${xScale((fromNode.p11[0] + toNode.p5[0]) / 2)}, ${yScale(toNode.p5[1])}`;
                            k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
                        }
                        else { // Node overlap 발생 -> 우회

                            k += `L${xScale((fromNode.p11[0] + blockNode.p3[0]) / 2)}, ${yScale(fromNode.p11[1])}`;
                            k += `L${xScale((fromNode.p11[0] + blockNode.p3[0]) / 2)}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.y - (nodesize / 3) * 2)}`;
                            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
                            this.totalBending+=1;
                        }
                    }
                }
                else {
                    k += `M${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1])}`; // 출발 지점

                    if (fromNode.relativePosition[0] == -1) {
                        k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
                        k += `L${xScale(toNode.p6[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
                        k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
                    }
                    else {
                        let blockNode = nodeXY.find(function (m) {
                            return fromNode.relativePosition[0] == m.id;
                        }) as IBusObjectData;

                        if ((fromNode.p0[1] + toNode.p6[1]) / 2 > blockNode.p8[1]) {
                            k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
                            k += `L${xScale(toNode.p6[0])}, ${yScale((fromNode.p0[1] + toNode.p6[1]) / 2)}`;
                            k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
                        }
                        else {

                            k += `L${xScale(fromNode.p0[0])}, ${yScale((fromNode.p0[1] + blockNode.p8[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale((fromNode.p0[1] + blockNode.p8[1]) / 2)}`;
                            k += `L${xScale(toNode.x - (nodesize / 3) * 2)}, ${yScale(toNode.p5[1])}`;
                            k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`;
                            this.totalBending+=1;
                        }
                    }

                }
            }
            else if (xdif == 0) {
                let rd = Math.floor(Math.random() * 2);
                if (ydif > 0) {
                    if (rd == 0) {
                        k += `M${xScale(fromNode.p9[0])}, ${yScale(fromNode.p9[1])}`;
                        k += `L${xScale(fromNode.p9[0] - (nodesize / 3) * 2)}, ${yScale(fromNode.p9[1])}`;
                        k += `L${xScale(fromNode.p9[0] - (nodesize / 3) * 2)}, ${yScale(toNode.p11[1])}`;
                        k += `L${xScale(toNode.p11[0])}, ${yScale(toNode.p11[1])}`
                    }
                    else {
                        k += `M${xScale(fromNode.p5[0])}, ${yScale(fromNode.p5[1])}`;
                        k += `L${xScale(fromNode.p5[0] + (nodesize / 3) * 2)}, ${yScale(fromNode.p5[1])}`;
                        k += `L${xScale(fromNode.p5[0] + (nodesize / 3) * 2)}, ${yScale(toNode.p3[1])}`;
                        k += `L${xScale(toNode.p3[0])}, ${yScale(toNode.p3[1])}`
                    }
                }
                else {
                    if (rd == 0) {
                        k += `M${xScale(fromNode.p11[0])}, ${yScale(fromNode.p11[1])}`;
                        k += `L${xScale(fromNode.p11[0] - (nodesize / 3) * 2)}, ${yScale(fromNode.p11[1])}`;
                        k += `L${xScale(fromNode.p11[0] - (nodesize / 3) * 2)}, ${yScale(toNode.p9[1])}`;
                        k += `L${xScale(toNode.p9[0])}, ${yScale(toNode.p9[1])}`
                    }
                    else {
                        k += `M${xScale(fromNode.p3[0])}, ${yScale(fromNode.p3[1])}`;
                        k += `L${xScale(fromNode.p3[0] + (nodesize / 3) * 2)}, ${yScale(fromNode.p3[1])}`;
                        k += `L${xScale(fromNode.p3[0] + (nodesize / 3) * 2)}, ${yScale(toNode.p5[1])}`;
                        k += `L${xScale(toNode.p5[0])}, ${yScale(toNode.p5[1])}`
                    }
                }
                this.totalBending+=1;
            }
            else if (ydif == 0) {
                let rd = Math.floor(Math.random() * 2);
                if (xdif > 0) {
                    if (rd == 0) {
                        k += `M${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1])}`;
                        k += `L${xScale(fromNode.p2[0])}, ${yScale(fromNode.p2[1] - (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1] - (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p0[0])}, ${yScale(toNode.p0[1])}`;
                    }
                    else {
                        k += `M${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1])}`;
                        k += `L${xScale(fromNode.p6[0])}, ${yScale(fromNode.p6[1] + (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1] + (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p8[0])}, ${yScale(toNode.p8[1])}`;
                    }
                }
                else {
                    if (rd == 0) {
                        k += `M${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1])}`;
                        k += `L${xScale(fromNode.p0[0])}, ${yScale(fromNode.p0[1] - (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1] - (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p2[0])}, ${yScale(toNode.p2[1])}`;
                    }
                    else {
                        k += `M${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1])}`;
                        k += `L${xScale(fromNode.p8[0])}, ${yScale(fromNode.p8[1] + (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1] + (nodesize / 3) * 2)}`;
                        k += `L${xScale(toNode.p6[0])}, ${yScale(toNode.p6[1])}`;
                    }
                }
                this.totalBending+=1;
            }
            this.totalBending+=3;
        }
        this.totalLength+=absXdif+absYdif;
    }

    Edge_cross(i: number, j: number) {
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