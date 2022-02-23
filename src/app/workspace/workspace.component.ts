import { Component, OnInit } from '@angular/core';
import { BaseGraphService } from '../base-graph.service';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.css']
})
export class WorkspaceComponent implements OnInit {

  constructor(private bgs: BaseGraphService) {
    bgs.loadData();
  }

  ngOnInit(): void {
  }

}
