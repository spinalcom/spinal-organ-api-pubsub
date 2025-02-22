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

import { Lst, spinalCore } from 'spinal-core-connectorjs';
import * as path from 'path';
import { PubSubStore } from '../models';
import { INodeId } from '../interfaces';
import * as cron from 'node-cron';

const storeName = 'pubsubStore.db';

export class SessionStore {
  private static instance: SessionStore;
  private store: PubSubStore;

  private constructor() { }

  public static getInstance(): SessionStore {
    if (!this.instance) this.instance = new SessionStore();

    return this.instance;
  }

  public init(connect: spinal.FileSystem): Promise<PubSubStore> {
    return this._loadOrMakeConfigFile(connect).then((store) => {
      this.store = store;
      // this.test()
      this._scheduleReInit();
      return store;
    });
  }

  public async getSubscribedData(userId: string): Promise<INodeId[]> {
    const data = await this.store.getUserStoreLst(userId);
    return (data && data.get()) || [];
  }

  public saveSubscriptionData(userId: string, data: INodeId | INodeId[]): Promise<Lst> {
    // return this.store.addToStore(userId, data); // uncomment this line to save data
    return;
  }

  public deleteSubscriptionData(userId: string, data: INodeId | INodeId[]) {
    if (!Array.isArray(data)) data = [data];

    // return data.map((id) => this.store.deleteToStore(userId, id)); // uncomment this line to delete data
  }

  private _loadOrMakeConfigFile(
    connect: spinal.FileSystem
  ): Promise<PubSubStore> {
    return new Promise((resolve, reject) => {
      spinalCore.load(
        connect,
        path.resolve(`/etc/${storeName}`),
        (store: PubSubStore) => resolve(store),
        () =>
          connect.load_or_make_dir('/etc', (directory: spinal.Directory) => {
            resolve(this._createFile(directory, storeName));
          })
      );
    });
  }

  private _createFile(
    directory: spinal.Directory,
    fileName: string
  ): PubSubStore {
    const store = new PubSubStore();
    directory.force_add_file(fileName, store, { model_type: 'store' });
    return store;
  }

  private _scheduleReInit() {
    cron.schedule('0 0 23 * * *', () => {
      this._reInitializeStore();
    });
  }

  private _reInitializeStore() {
    console.log('reset websocket session storage');
    this.store.reset();
  }

  test() {
    setInterval(() => {
      this.saveSubscriptionData(Date.now().toString(), {
        nodeId: 'zjdfkhjkh',
        contextId: 'sfkjklj',
      });
    }, 1000);
  }
}
