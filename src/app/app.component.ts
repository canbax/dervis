import { Component, HostListener, OnInit } from '@angular/core';
import { SharedService } from './shared.service';
import { TigerGraphApiClientService } from './tiger-graph-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  selectedRightTabIdx = 0;
  isLoading = true;
  isResizing = false;
  isAutoSizeSideNav: boolean = false;
  widthRatioCSS = '30vw';
  constructor(private _dbApi: TigerGraphApiClientService, private _s: SharedService) {

  }

  ngOnInit(): void {
    this._s.init();
    const fn = (x) => {
      if (!x) {
        return;
      }
      this.selectedRightTabIdx = 2;
    };
    this._s.elemSelectChanged.subscribe(fn);
    this._s.showTableChanged.subscribe(fn);
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

  goBackInGraphHistory() {
    this._s.goBackInGraphHistory();
  }

  goForwardInGraphHistory() {
    this._s.goForwardInGraphHistory();
  }

  private refreshSideNav() {
    this.isAutoSizeSideNav = true;
    setTimeout(() => this.isAutoSizeSideNav = false, 1);
  }

  @HostListener('document:keydown.delete', ['$event'])
  deleteSelected() {
    this._s.deleteSelected();
    this._s.add2GraphHistory('selected deleted');
  }

  @HostListener('document:mousedown', ['$event'])
  click2resizer() {
    this.isResizing = true;
  }

  @HostListener('document:mousemove', ['$event'])
  resizing($event) {
    if (!this.isResizing) {
      return;
    }
    const x = $event.clientX;
    const wid = window.innerWidth;
    this.widthRatioCSS = Math.floor((wid - x) / (wid) * 100) + 'vw';
    this.refreshSideNav();
  }

  @HostListener('document:mouseup', ['$event'])
  mouseUp() {
    this.isResizing = false;
  }

}
