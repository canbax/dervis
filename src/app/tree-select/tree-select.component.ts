import { Component, OnInit, Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener } from '@angular/material/tree';
import { BehaviorSubject, filter } from 'rxjs';
import { debounce, deepCopy } from '../constants';
import { TigerGraphApiClientService } from '../tiger-graph-api.service';
import { SchemaOutput, TigerGraphEdgeType, TigerGraphVertexType } from '../data-types';
import { SharedService } from '../shared.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SettingsService } from '../settings.service';

/**
 * Node for to-do item
 */
export class TodoItemNode {
  children: TodoItemNode[];
  item: string;
}

/** Flat to-do item node with expandable and level information */
export class TodoItemFlatNode {
  item: string;
  level: number;
  expandable: boolean;
}

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable({
  providedIn: 'root'
})
export class TreeSelectData {
  originalTreeData: any;
  edgeTypesKey: string;
  dataChange = new BehaviorSubject<TodoItemNode[]>([]);

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  constructor() { }


  /** Should only be called once!
   * @param  {any} treeData
   */
  initialize(treeData: any, maxLevel: number, edgeTypesKey: string) {
    this.originalTreeData = treeData;
    this.edgeTypesKey = edgeTypesKey;
    // Edge types do NOT have id. So it cannot be searched if maxLevel is 1
    const d = deepCopy(treeData);
    if (maxLevel == 1) {
      delete d[edgeTypesKey];
    }
    const data = this.buildFileTree(d, 0, '', maxLevel);

    // Notify the change.
    this.dataChange.next(data);
  }

  /**
   * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
   * The return value is the list of `TodoItemNode`.
   */
  buildFileTree(obj: { [key: string]: any }, level: number, filterTxt: string, maxLevel: number): TodoItemNode[] {
    if (!obj) {
      return [];
    }

    return Object.keys(obj).reduce<TodoItemNode[]>((accumulator, key) => {
      const value = obj[key];
      const node = new TodoItemNode();
      node.item = key;

      if (value != null) {
        let strRepresentation = value;
        if (typeof value === 'object') {
          strRepresentation = key;
        }
        const hasTxt = strRepresentation.toLowerCase().includes(filterTxt);
        if (level == maxLevel && filterTxt.length > 0 && !hasTxt) {
          return accumulator;
        }
        if (typeof value === 'object') {
          if (level < maxLevel) {
            node.children = this.buildFileTree(value, level + 1, filterTxt, maxLevel);
            if (node.children.length < 1) {
              return accumulator;
            }
          }
        } else {
          node.item = value;
        }
      } else {
        return accumulator;
      }

      return accumulator.concat(node);
    }, []);
  }

  filterByTxt(txt: string, maxLevel: number) {
    txt = txt.toLocaleLowerCase();

    const d = deepCopy(this.originalTreeData);
    if (maxLevel == 1) {
      delete d[this.edgeTypesKey];
    }
    this.dataChange.next(this.buildFileTree(d, 0, txt, maxLevel));
  }
}

@Component({
  selector: 'app-tree-select',
  templateUrl: './tree-select.component.html',
  styleUrls: ['./tree-select.component.css'],
  providers: [],
})
export class TreeSelectComponent {

  filterSchemaTxt: string = '';
  searchTxt: string = '';
  maxLevel: number = 1;
  filterSchemaDebounced: Function;
  isDetailedSearchOpen = false;

  /** Map from flat node to nested node. This helps us finding the nested node to be modified */
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();

  /** Map from nested node to flattened node. This helps us to keep the same object for selection */
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();

  treeControl: FlatTreeControl<TodoItemFlatNode>;

  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;

  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);

  constructor(private _database: TreeSelectData, private _dbApi: TigerGraphApiClientService, private _s: SharedService, private _snackBar: MatSnackBar, private _settings: SettingsService) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    this._database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
    this.filterSchemaDebounced = debounce(this.onSearch, 250, false);

    this._dbApi.getGraphSchema((x: SchemaOutput) => {
      console.log(x);
      let tree = { 'Vertex': {}, 'Edge': {} };
      const cntEdgeType = x.results.EdgeTypes.length;
      const cntVertexType = x.results.VertexTypes.length;
      this.parseSchemaData(tree, x.results.EdgeTypes, false);
      this.parseSchemaData(tree, x.results.VertexTypes, true);
      // rename vertex and edge
      tree[`Vertex (${cntVertexType})`] = tree['Vertex'];
      delete tree['Vertex'];
      const edgeTypesKey = `Edge (${cntEdgeType})`;
      tree[edgeTypesKey] = tree['Edge'];
      delete tree['Edge'];
      this._database.initialize(tree, this.maxLevel, edgeTypesKey);
    });
  }

  private parseSchemaData(tree: any, typeArr: TigerGraphVertexType[] | TigerGraphEdgeType[], isVertex: boolean) {
    for (let i = 0; i < typeArr.length; i++) {
      const attr = [];
      const currType = typeArr[i].Name;
      const typeAttr = typeArr[i].Attributes;
      for (let j of typeAttr) {
        attr.push(j.AttributeName);
      }
      if (typeAttr.length > 0) {
        if (isVertex) {
          tree.Vertex[`${currType} (${typeAttr.length})`] = attr;
        } else {
          tree.Edge[`${currType} (${typeAttr.length})`] = attr;
        }

      } else {
        if (isVertex) {
          tree.Vertex[currType] = attr;
        } else {
          tree.Edge[currType] = attr;
        }
      }
    }
  }

  changeTreeDepth() {
    this.onSearch();
  }

  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  /**
   * Transformer to convert nested node to flat node. Record the nodes in maps for later use.
   */
  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  /** Whether all the descendants of the node are selected. */
  descendantsAllSelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.checklistSelection.isSelected(child);
      });
    return descAllSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: TodoItemFlatNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants)
      : this.checklistSelection.deselect(...descendants);

    // Force update for the parent
    descendants.forEach(child => this.checklistSelection.isSelected(child));
    this.checkAllParentsSelection(node);
  }

  /** Toggle a leaf to-do item selection. Check all the parents to see if they changed */
  todoLeafItemSelectionToggle(node: TodoItemFlatNode): void {
    this.checklistSelection.toggle(node);
    this.checkAllParentsSelection(node);
  }

  /* Checks all the parents when a leaf node is selected/unselected */
  checkAllParentsSelection(node: TodoItemFlatNode): void {
    let parent: TodoItemFlatNode | null = this.getParentNode(node);
    while (parent) {
      this.checkRootNodeSelection(parent);
      parent = this.getParentNode(parent);
    }
  }

  /** Check root node checked state and change it accordingly */
  checkRootNodeSelection(node: TodoItemFlatNode): void {
    const nodeSelected = this.checklistSelection.isSelected(node);
    const descendants = this.treeControl.getDescendants(node);
    const descAllSelected =
      descendants.length > 0 &&
      descendants.every(child => {
        return this.checklistSelection.isSelected(child);
      });
    if (nodeSelected && !descAllSelected) {
      this.checklistSelection.deselect(node);
    } else if (!nodeSelected && descAllSelected) {
      this.checklistSelection.select(node);
    }
  }

  /* Get the parent node of a node */
  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  onSearch() {
    this._database.filterByTxt(this.filterSchemaTxt, this.maxLevel);
    this.treeControl.expandAll();
    this.checklistSelection.clear();
  }

  searchOnDB() {
    const selected: TodoItemFlatNode[] = this.checklistSelection.selected;
    const graph = this._settings.appConf.tigerGraphDbConfig.graphName.getValue();
    // search only for IDs in all types
    if (!selected || selected.length < 1) {
      const gsql =
        `INTERPRET QUERY () FOR GRAPH ${graph} {
        start = {ANY};   
        results = SELECT x FROM start:x where lower(x.Id) LIKE "%${this.searchTxt}%";
        PRINT results;
    }`
      this._dbApi.runQuery(gsql, (x) => {
        if (!x || !(x.results)) {
          this._snackBar.open('Empty response from query: ' + JSON.stringify(x), 'close');
          return;
        }
        this._s.loadGraph({ nodes: x.results[0].results, edges: [] });
        this._s.add2GraphHistory('run interpretted query');
      });
    } else {

    }
    console.log(selected);
  }

  collapseTree() {
    this.treeControl.collapseAll();
  }

  expandTree() {
    this.treeControl.expandAll();
  }
}
