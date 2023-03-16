import { Injectable } from '@angular/core';
import { IStatisticData } from 'src/shared/interfaces/istatistic.data';
import { jStat } from 'jstat';
import { EdgeMeasurement } from '../calculate edge crossing/edge-measurement';
import { Layout, TreemapNode } from '../node-placement/treemap-node.service';

@Injectable({
  providedIn: 'root'
})
export class RandomStatisticsService {
  measurement: number[];
  statisticdata: IStatisticData; //Random_statistics
  layout: Layout;
  edgeMeasurement: EdgeMeasurement;
  l_stat = [];//total length stat
  c_stat = [];//edge crossing stat
  b_stat = [];//total bending stat
  Map = new Map([
    ['Total_Length', 0],
    ['Edge_Crossing', 1],
    ['Total_Bending', 2]
  ])
  constructor() {
    this.Map.get('Edge_Crossing')
    this.measurement=[0,0,0];
    this.statisticdata={
      mean:[0,0,0],
      median:[0,0,0],
      min:[0,0,0],
      max:[0,0,0],
      std:[0,0,0]
    }
  }

  statistic_measurement(){    
    if(this.layout=='Local_Random'||this.layout=='Global_Random'){      
      this.statisticdata.mean[0] = jStat(this.l_stat).mean();
      this.statisticdata.mean[1] = jStat(this.c_stat).mean();
      this.statisticdata.mean[2] = jStat(this.b_stat).mean();
      this.statisticdata.median[0] = jStat(this.l_stat).median();
      this.statisticdata.median[1] = jStat(this.c_stat).median();
      this.statisticdata.median[2] = jStat(this.b_stat).median();
      this.statisticdata.min[0] = jStat(this.l_stat).min();
      this.statisticdata.min[1] = jStat(this.c_stat).min();
      this.statisticdata.min[2] = jStat(this.b_stat).min();
      this.statisticdata.max[0] = jStat(this.l_stat).max();
      this.statisticdata.max[1] = jStat(this.c_stat).max();
      this.statisticdata.max[2] = jStat(this.b_stat).max();
      this.statisticdata.std[0] = jStat(this.l_stat).stdev();
      this.statisticdata.std[1] = jStat(this.c_stat).stdev();
      this.statisticdata.std[2] = jStat(this.b_stat).stdev();
    }
    

  }

  fill_zero() {
    this.l_stat=[];
    this.c_stat=[];
    this.b_stat=[];
    Object.keys(this.statisticdata).forEach(stat => this.statisticdata[stat].fill(0))
  }
}
