import * as d3 from "d3"

export interface IClusterData {
    data: d3.HierarchyRectangularNode<any>
    children: d3.HierarchyRectangularNode<any>[]
}
