import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import * as d3 from 'd3'
import { BASE_PATH } from './data.config';

@Injectable({
  providedIn: 'root'
})
export class BaseGraphService {

  constructor(private http: HttpClient) { }

  loadData(): void {
    // d3.json("../assets/data/bus-1062 random position.json")
    // .then(bus => {
    //     d3.csv("../assets/data/branch-1062.csv")
    //         .then(branch => {
    //             render(bus, branch);
    //         })
    // })

    d3.json('./assets/data/bus-1062 random position.json')
      .then(data => {
        console.log(data);
      });

  }
}
