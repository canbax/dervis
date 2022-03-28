import { Component, OnInit } from '@angular/core';
import { COMPOUND_CLASS } from './constants';
import { SchemaOutput } from './data-types';
import { SharedService } from './shared.service';
import { TigerGraphApiClientService } from './tiger-graph-api.service';
import { TreeSelectData } from './tree-select/tree-select.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  selectedRightTabIdx = 0;
  isLoading = true;
  constructor(private _dbApi: TigerGraphApiClientService, private _s: SharedService) {

  }

  ngOnInit(): void {
    this._s.init();
    this._s.elemSelectChanged.subscribe((x) => {
      if (!x) {
        return;
      }
      this.selectedRightTabIdx = 1;
    });
    this._s.isLoading.subscribe(x => { this.isLoading = x; });
  }

  loadSampleData() {
    this.clearData();
    this._s.isLoading.next(true);
    const fn = (x) => {
      this._s.loadGraph(x);
      this._s.isLoading.next(false);
      this._s.add2GraphHistory('Load sample data');
    };
    this._dbApi.sampleData(fn);
  }

  clearData() {
    this._s.cy.remove(this._s.cy.$());
  }

  summarizeNeig() {
    this._s.groupCrowdedNei();
  }

  clearContainers() {
    this._s.removeCrowdedGroups();
  }

}
