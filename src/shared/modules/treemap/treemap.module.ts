import * as d3 from "d3";
import { ISize } from "src/shared/interfaces/isize";
import { ITabularData } from "src/shared/interfaces/itabular-data";

export function setClusterCount(communities: {[node: string]: number}) : number {
  return d3.max(Object.keys(communities).map(d => communities[d])) as number + 1;
}

// 다중간선 그래프 데이터를 {id: 정점 번호, parentId: 부모 정점 번호} 데이터 구조의 트리로 만드는 메소드
/* 트리 구조
    root

  cluster1  cluster2 ...

leaf1 leaf2 leaf3 ...
*/
export function setTabularData(communities: {[node: string]: number}, clusterCount: number): ITabularData[] {
  let tabularData: ITabularData[] = [];
  
  tabularData = Object.keys(communities).map(d => { // 잎 추가 (노드 id는 클러스터 노드)
    return {id: +d + clusterCount, parentId: communities[d] + 1};
  });

  tabularData.push({id: 0, parentId: undefined})  // 루트 추가
  
  for (let i = 0; i < clusterCount; i++){ // 클러스터 정점 추가
    tabularData.push({id: i + 1, parentId: 0});
  }

  return tabularData;
}

export function setRoot(tabularData: ITabularData[]): d3.HierarchyNode<any> {
  const root = d3.stratify()  
    (tabularData);
  root.count();

  return root;
}

export function setTreemapLayout(size: ISize): d3.TreemapLayout<unknown>{
  return d3.treemap()
    .tile(d3.treemapSquarify)
    .size([size.viewBox.width - size.margin.right, size.viewBox.height - size.margin.bottom])
    .paddingInner(size.padding.left)
    .paddingOuter(size.padding.left)
    .paddingLeft(size.padding.left)
    .paddingBottom(size.padding.bottom)
    .paddingRight(size.padding.right)
    .paddingTop(size.padding.top)
    .round(false);
}