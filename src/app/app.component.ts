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
      const cntEdgeType = x.results.EdgeTypes.length;
      const cntVertexType = x.results.VertexTypes.length;
      for (let i = 0; i < cntEdgeType; i++) {
        const attr = [];
        const currType = x.results.EdgeTypes[i].Name;
        const edgeTypeAttr = x.results.EdgeTypes[i].Attributes;
        for (let j of edgeTypeAttr) {
          attr.push(j.AttributeName);
        }
        if (edgeTypeAttr.length > 0) {
          tree.Edge[`${currType} (${edgeTypeAttr.length})`] = attr;
        } else {
          tree.Edge[currType] = attr;
        }

      }
      for (let i = 0; i < cntVertexType; i++) {
        const attr = [];
        const currType = x.results.VertexTypes[i].Name;
        const nodeTypeAttr = x.results.VertexTypes[i].Attributes;
        for (let j of nodeTypeAttr) {
          attr.push(j.AttributeName);
        }
        if (nodeTypeAttr.length > 0) {
          tree.Vertex[`${currType} (${nodeTypeAttr.length})`] = attr;
        } else {
          tree.Vertex[currType] = attr;
        }
      }
      // rename vertex and edge
      tree[`Vertex (${cntVertexType})`] = tree['Vertex'];
      delete tree['Vertex'];
      tree[`Edge (${cntEdgeType})`] = tree['Edge'];
      delete tree['Edge'];
      this._treeData.initialize(tree);

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
