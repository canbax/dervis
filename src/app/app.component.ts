import { Component } from '@angular/core';
import { SchemaOutput } from './data-types';
import { SharedService } from './shared.service';
import { TigerGraphApiClientService } from './tiger-graph-api.service';
import { TreeSelectData } from './tree-select/tree-select.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'dervis';

  constructor(private _dbApi: TigerGraphApiClientService, private _s: SharedService, private _treeData: TreeSelectData) {
    this._dbApi.getGraphSchema((x: SchemaOutput) => {
      console.log(x);
      let tree = { 'Vertex': {}, 'Edge': {} };

      for (let i = 0; i < x.results.EdgeTypes.length; i++) {
        const attr = {};
        const currType = x.results.EdgeTypes[i].Name;
        attr[currType] = {};
        for (let j of x.results.EdgeTypes[i].Attributes) {
          attr[currType][j.AttributeName] = null;
        }
        tree.Edge[currType] = attr;
      }
      for (let i = 0; i < x.results.VertexTypes.length; i++) {
        const attr = {};
        const currType = x.results.VertexTypes[i].Name;
        attr[currType] = {};
        for (let j of x.results.VertexTypes[i].Attributes) {
          attr[currType][j.AttributeName] = null;
        }
        tree.Vertex[currType] = attr;
      }
      _treeData.dataChange.next(_treeData.buildFileTree(tree, 0));
    });
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
