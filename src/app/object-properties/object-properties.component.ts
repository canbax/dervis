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

  keys: string[];
  values: any[];
  subscription: Subscription;

  constructor(private _s: SharedService, private _snackBar: MatSnackBar) {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isLink(txt: string) {
    return txt.toLowerCase().startsWith('http:/');
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
    this.keys = Object.keys(d);
    this.values = Object.values(d);
  }

  copy(txt: string) {
    this._snackBar.open(`'${txt}' copied!`, 'OK', {
      duration: 5000
    });
  }
}
