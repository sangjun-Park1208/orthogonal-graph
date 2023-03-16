import { DetailedLouvainOutput } from "graphology-communities-louvain"
import { IBranchData } from "./ibranch-data"
import { IBusData } from "./ibus-data"


export interface INodeData extends DetailedLouvainOutput {
    bus: IBusData[],
    branch: IBranchData[]
}