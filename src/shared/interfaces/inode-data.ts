import { IBranchData } from "./ibranch-data"
import { IBusData } from "./ibus-data"


export interface INodeData {
    bus: IBusData[],
    branch: IBranchData[],
    communities: {
        [index:string] : number
    },
    count:number
}