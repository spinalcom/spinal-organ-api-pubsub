/*
 * Copyright 2022 SpinalCom - www.spinalcom.com
 *
 * This file is part of SpinalCore.
 *
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 *
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 *
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import {Lst, Model, Ptr, spinalCore} from 'spinal-core-connectorjs';
import {INodeId, ISubscribeOptions} from '../interfaces';
import {v4 as uuidv4} from 'uuid';
import {resolve} from 'path';

export class PubSubStore extends Model {
  constructor() {
    super();
    this.add_attr({
      id: uuidv4(),
      data: {},
    });
  }

  public async addToStore(
    userSecretId: string,
    data: INodeId | INodeId[]
  ): Promise<Lst> {
    const storeLst: any = await this.getUserStoreLst(userSecretId, true);

    if (!Array.isArray(data)) data = [data];

    for (let id of data) {
      const index = this.findIndex(storeLst, id);
      if (index === -1) {
        storeLst.push({
          nodeId: id.nodeId,
          contextId: id.contextId,
          options: id.options,
        });
      }

      return;
    }

    return storeLst;
  }

  public async deleteToStore(
    userSecretId: string,
    id: INodeId
  ): Promise<boolean> {
    const storeLst = await this.getUserStoreLst(userSecretId);
    if (!storeLst) return;

    const index = this.findIndex(storeLst, id);
    if (index === -1) return false;

    const item = storeLst[index];
    storeLst.remove(item);
    // const user_ids = this.getIds(userSecretId);
    // user_ids.splice(index);
    return true;
  }

  public async getUserStoreLst(
    userSecretId: string,
    createIfNotExist: boolean = false
  ): Promise<void | Lst> {
    let storeLst = await this._loadUserData(userSecretId);

    if (!storeLst && createIfNotExist) {
      storeLst = new Lst();
      this.data.add_attr(userSecretId, new Ptr(storeLst));
    }

    return storeLst;
  }

  public reset() {
    for (let key in this.data) {
      this._deleteModelAttributes(this.data[key]);
      this.data.rem_attr(key);
    }
  }

  public findIndex(userData: Lst, id: INodeId): number {
    for (let i = 0; i < userData.length; i++) {
      const element = userData[i];

      if (
        element.contextId?.get() === id.contextId &&
        element.nodeId?.get() === id.nodeId
      ) {
        if (!id.options) return i;
        else if (
          element.options &&
          this._compareOptions(element.options.get(), id.options)
        )
          return i;
      }
    }

    return -1;
  }

  private _compareOptions(
    firstOption: ISubscribeOptions,
    secondOption: ISubscribeOptions
  ): boolean {
    if (!firstOption || !secondOption) return false;
    if (
      firstOption.subscribeChildren === secondOption.subscribeChildren &&
      firstOption.subscribeChildScope === secondOption.subscribeChildScope
    )
      return true;
    return false;
  }

  private _deleteModelAttributes(model: spinal.Model) {
    if (model instanceof Lst) {
      for (let index = 0; index < model.length; index++) {
        const element = model[index];
        this._deleteModelAttributes(element);
        model.remove(element);
      }
    } else if (model instanceof Model) {
      for (const attribute in model) {
        const element = model[attribute];
        if (
          !(element instanceof Model) ||
          element._attribute_names.length === 0
        ) {
          model.rem_attr(attribute);
        } else this._deleteModelAttributes(element);
      }
    }
  }

  private _loadUserData(userSecretId: string): Promise<void | spinal.Lst> {
    let storePtr = this.data[userSecretId];
    if (!storePtr) return;
    return new Promise((resolve, reject) => {
      if (storePtr instanceof Lst) return resolve(storePtr);
      if (storePtr instanceof Ptr)
        return storePtr.load((data) => resolve(data));

      resolve(undefined);
    });
  }
}

spinalCore.register_models(PubSubStore);
