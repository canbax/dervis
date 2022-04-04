import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedService } from '../shared.service';
import { debounce, OBJ_INFO_UPDATE_DELAY } from '../constants';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-object-properties',
  templateUrl: './object-properties.component.html',
  styleUrls: ['./object-properties.component.css']
})
export class ObjectPropertiesComponent implements OnInit, OnDestroy {

  tableHeader = '';
  objType = '';
  isShowTable = false;
  keys: string[];
  values: any[];
  subscription: Subscription;

  constructor(private _s: SharedService, private _snackBar: MatSnackBar) {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isLink(txt: string) {
    if (typeof txt == 'string') {
      return txt.toLowerCase().startsWith('http:/');
    }
    return false;
  }

  ngOnInit(): void {
    const fn = debounce(this.showObjProps, OBJ_INFO_UPDATE_DELAY).bind(this)
    this.subscription = this._s.elemSelectChanged.subscribe(fn);
    this.showObjProps();
  }

  showObjProps() {
    const d = this._s.cy.$(':selected').data();
    if (!d) {
      return;
    }
    this.isShowTable = false;
    this.prepareTableIfNeeded();
    this.objType = this._s.cy.$(':selected').classes()[0];
    this.keys = Object.keys(d);
    this.values = Object.values(d);
  }

  // if multiple objects from the same type is selected, show a table
  prepareTableIfNeeded() {
    this.isShowTable = true;
    const elems = this._s.cy.$(':selected');
    const classes = {};
    for (let i = 0; i < elems.length; i++) {
      classes[elems[i].classes()[0]] = true;
    }
    const data = [];
    const cNames = Object.keys(classes);
    if (elems.length < 2 || cNames.length > 1) {
      this.tableHeader = '';
      this.isShowTable = false;
      return;
    }
    this.tableHeader = cNames.join();
    const colsDict = {};
    for (let i = 0; i < elems.length; i++) {
      const d = elems[i].data();
      data.push(d);
      const keys = Object.keys(d);
      for (let j = 0; j < keys.length; j++) {
        colsDict[keys[j]] = true;
      }
    }
    const cols = Object.keys(colsDict);

    setTimeout(() => {
      this._s.tableData.next({ columns: cols, data: data });
    }, 0);
  }

  copy(txt: string) {
    this._snackBar.open(`'${txt}' copied!`, 'OK', {
      duration: 5000
    });
  }
}
