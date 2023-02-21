import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { IBranchData } from 'src/shared/interfaces/ibranch-data';
import { IBusData } from 'src/shared/interfaces/ibus-data';
import { IStatisticData } from 'src/shared/interfaces/istatistic.data';
import { EdgeMeasurement } from '../calculate edge crossing/edge-measurement';
import { TreemapEventListeners } from '../event-listeners/treemap-event-listeners';
import { TreemapSelections } from '../selections/treemap-selections';
import { TreemapSelectionsDevided } from '../selections/treemap-selections-devided';
import { global_Random_TreemapData } from './global-random-treemap-data';
import { local_Random_TreemapData } from './local-random-treemap-data';
import { seqeunce_TreemapData } from './seqeunce-treemap-data';
import { TreemapData } from './treemap-data';

declare var require: any //jStat 쓰기 위해 추가

@Injectable({
  providedIn: 'root'
})
export class RandomStatisticsService {
  togglenum = new Subject<number>();
  togglenum$=new Subject<number>();
  toggle = new Subject<string>();
  iter = new Subject<string>();
  iter$=new Subject<string>();
  statisticdata:IStatisticData;
  bus:IBusData[]|undefined;
  branch:IBranchData[]|undefined;
  details:any;
  size:any;
  nodeSize:any;
  strokeWidth:any;
  opacity:any;
  // treemapSelections$=new Subject<TreemapSelectionsDevided>;
  // treemapEventListeners$=new Subject<TreemapEventListeners>;
  // edgeMeasurement$=new Subject<EdgeMeasurement>;
  // measurement$=new Subject<number[]>;
  treemapData:TreemapData | seqeunce_TreemapData | local_Random_TreemapData | global_Random_TreemapData|undefined;
  treemapSelections:any;
  treemapEventListeners:any;
  edgeMeasurement:any;
  measurement:number[];
  root:any;
  measurement$=new Subject<number[]>();
  statisticdata$=new Subject<IStatisticData>();

  constructor() {
    this.measurement=[];
    let edgeMeasurement: EdgeMeasurement;
    // let treemapSelections: TreemapSelections;
    let treemapSelections: TreemapSelections | TreemapSelectionsDevided; //chan adding
    let treemapEventListeners: TreemapEventListeners;
    let random_count=1;
    console.log('random_count: ', random_count);
    var { jStat } = require('jstat');
    let l_stat = new Array();//total length stat
    let e_stat = new Array();//edge crossing stat
    let b_stat = new Array();//total bending stat
    this.statisticdata={
      mean:[0,0,0],
      median:[0,0,0],
      min:[0,0,0],
      max:[0,0,0],
      std:[0,0,0]
    };
    this.iter.subscribe((d) => {
      if (d == '') d = '1';
      random_count = Number(d);
      this.iter$.next(d);
    })
    this.togglenum.subscribe((d) => {
      const nodeSize = 371.13274 * Math.pow(d, -0.42682);
      this.togglenum$.next(d);
    });
    this.toggle.subscribe((d) => {
      if (d == "Z_Layout")
        this.treemapData = new TreemapData(this.bus!, this.branch!, this.details, this.size, this.nodeSize, this.strokeWidth, this.opacity);
      else if (d == "Sequence")
        this.treemapData = new seqeunce_TreemapData(this.bus!, this.branch!, this.details, this.size, this.nodeSize, this.strokeWidth, this.opacity);
      else if (d == "Local_Random") {
        for (let i = 0; i < random_count; i++) {
          this.treemapData = new local_Random_TreemapData(this.bus!, this.branch!, this.details, this.size, this.nodeSize, this.strokeWidth, this.opacity);
          this.treemapData.setZNodePosition();
          edgeMeasurement = new EdgeMeasurement(this.treemapData, this.branch!);
          l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
          e_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
          b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
        }
      }
      else if (d == "Global_Random") {
        for (let i = 0; i < random_count; i++) {
          this.treemapData = new global_Random_TreemapData(this.bus!, this.branch!, this.details, this.size, this.nodeSize, this.strokeWidth, this.opacity);
          this.treemapData.setZNodePosition();
          edgeMeasurement = new EdgeMeasurement(this.treemapData, this.branch!);
          l_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[0]);
          e_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[1]);
          b_stat.push(edgeMeasurement.calculateEdgeCrossingCount()[2]);
        }
      }
      this.treemapData!.setZNodePosition();
      if (d == "Local_Random" || d == "Global_Random") {
        this.statisticdata.mean[0] = jStat(l_stat).mean();
        this.statisticdata.mean[1] = jStat(e_stat).mean();
        this.statisticdata.mean[2] = jStat(b_stat).mean();
        this.statisticdata.median[0] = jStat(l_stat).median();
        this.statisticdata.median[1] = jStat(e_stat).median();
        this.statisticdata.median[2] = jStat(b_stat).median();
        this.statisticdata.min[0] = jStat(l_stat).min();
        this.statisticdata.min[1] = jStat(e_stat).min();
        this.statisticdata.min[2] = jStat(b_stat).min();
        this.statisticdata.max[0] = jStat(l_stat).max();
        this.statisticdata.max[1] = jStat(e_stat).max();
        this.statisticdata.max[2] = jStat(b_stat).max();
        this.statisticdata.std[0] = jStat(l_stat).stdev();
        this.statisticdata.std[1] = jStat(e_stat).stdev();
        this.statisticdata.std[2] = jStat(b_stat).stdev();
      }
      else {
        this.statisticdata.mean.fill(0);
        this.statisticdata.median.fill(0);
        this.statisticdata.min.fill(0);
        this.statisticdata.max.fill(0);
        this.statisticdata.std.fill(0);
      }
      
    // treemapSelections = new TreemapSelections(treemapData, root);
    treemapSelections = new TreemapSelectionsDevided(this.treemapData!, this.root); //chan adding
    // treemapEventListeners = new TreemapEventListeners(treemapData, treemapSelections);
    treemapEventListeners = new TreemapEventListeners(this.treemapData!, treemapSelections); //chan adding
    edgeMeasurement = new EdgeMeasurement(this.treemapData!, this.branch!);
    this.measurement = edgeMeasurement.calculateEdgeCrossingCount();
    this.measurement$.next(this.measurement);
    this.statisticdata$.next(this.statisticdata);
    });
  }
}
