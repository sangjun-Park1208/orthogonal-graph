import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { MultiGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';

type clusteringAlgo = "louvain" | "girvan-newman" | "DBSCAN";
type clustering = (_bus, _branch) => any;

@Injectable({
  providedIn: 'root'
})
export class LoadDataService {
  private clusteringMap: Map<string | clusteringAlgo, clustering>;
  constructor() { 
    this.clusteringMap = new Map([
      ["louvain", this.louvain],
      ["girvan-newman", this.girvan_newman],
      ["DBSCAN", this.DBSCAN],
    ])
  }

  async load_data(bus_num: number, clustering: clusteringAlgo) {
    let ret;
    await d3.csv(`./assets/data/bus-${bus_num}.csv`)
      .then(async (bus: any) => {
        await d3.csv(`./assets/data/branch-${bus_num}.csv`)
          .then((branch: any) => {
            // console.log(bus, branch);
            const _bus = bus;
            const _branch = branch;
            ret = this.clusteringMap.get(clustering)(_bus, _branch);
            ret.bus=_bus;
            ret.branch=_branch;
          })
      });
    return ret;
  }

  private louvain(_bus, _branch) {
    const graph = new MultiGraph(); // duplicated edges -> Multi Graph
    for (let i = 0; i < _bus.length; i++) {
      graph.addNode(_bus[i].id);
    }
    for (let i = 0; i < _branch.length; i++) {
      graph.addEdge(_branch[i].from, _branch[i].to); // 중복 있어서 multi graph로 만듦
    }
    const details = louvain.detailed(graph, { randomWalk: false, resolution: 0.1 }); // assign Louvain Algorithm
    return details;
  }

  private girvan_newman(_bus, _branch) {

  }

  private DBSCAN(_bus, _branch) {

  }
}
