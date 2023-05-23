import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { MultiGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';
import { HttpClient } from '@angular/common/http';
import { INodeData } from 'src/shared/interfaces/inode-data';

type clusteringAlgo = "louvain" | "girvan_newman" | "leidon";
type clustering = (_bus, _branch) => any;

@Injectable({
  providedIn: 'root'
})
export class LoadDataService {
  private clusteringMap: Map<string | clusteringAlgo, (_bus: any, _branch: any) => Promise<INodeData>>;
  constructor(private http: HttpClient) { 
    this.clusteringMap = new Map([
      ["louvain", this.louvain()],
      ["girvan_newman", this.load_clustering_result('http://203.253.21.193:8000/girvan-newman/?iter=8')],
      ["leidon", this.load_clustering_result('http://203.253.21.193:8000/leidon/')],
    ])
  }

  async load_data(bus_num: number, clustering: clusteringAlgo) {
    let ret;
    await d3.csv(`./assets/data/bus-${bus_num}.csv`)
      .then(async (bus: any) => {
        await d3.csv(`./assets/data/branch-${bus_num}.csv`)
          .then((branch: any) => {
            const _bus = bus;
            const _branch = branch;
            ret = this.clusteringMap.get(clustering).bind(this)(_bus, _branch);
            ret.bus=_bus;
            ret.branch=_branch;
          })
      });
    return ret;
  }

  private louvain() {
    return async (_bus, _branch) => {
      const graph = new MultiGraph(); // duplicated edges -> Multi Graph
      for (let i = 0; i < _bus.length; i++) {
        graph.addNode(_bus[i].id);
      }
      for (let i = 0; i < _branch.length; i++) {
        graph.addEdge(_branch[i].from, _branch[i].to); // 중복 있어서 multi graph로 만듦
      }
      const details = louvain.detailed(graph, { randomWalk: false, resolution: 1.5 }); // assign Louvain Algorithm
      const res: INodeData = {
        bus: _bus,
        branch: _branch,
        communities: details.communities,
        count: details.count
      }
      return res;
    }
  }

  private load_clustering_result(url: string){

    return async (_bus, _branch) => {
      // Request data from the server
      let response:any = await this.http.get(url, {responseType: 'text'}).toPromise();
      response = response.replaceAll("\'", '\"');
      
      let data = JSON.parse(response);
      let bus = data['bus'];
      
      const count = new Set();
      // Return the mapped data
      const communities = bus.reduce((acc, val) => {
        acc[val.id] = val.cluster;
        count.add(val.cluster);
        return acc;
      }, {})
      const res:INodeData={
      bus:_bus,
      branch:_branch,
      communities: communities,
      count: count.size
      }
      return res;
    }
  }
}
