import { Component } from '@angular/core';
import { SharedService } from './shared.service';
import { TigerGraphApiClientService } from './tiger-graph-api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'dervis';

  constructor(private _dbApi: TigerGraphApiClientService, private _s: SharedService) {
  }

  loadSampleData() {
    this.clearData();
    this._s.isLoading.next(true);
    this._dbApi.sampleData((x: any) => { this._s.loadGraph(x); this._s.isLoading.next(false); this._s.add2GraphHistory('Load sample data'); });
  }

  clearData() {
    this._s.cy.remove(this._s.cy.$());
  }

}
