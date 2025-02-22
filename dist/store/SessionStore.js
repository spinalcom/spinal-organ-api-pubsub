"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionStore = void 0;
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const path = require("path");
const models_1 = require("../models");
const cron = require("node-cron");
const storeName = 'pubsubStore.db';
class SessionStore {
    constructor() { }
    static getInstance() {
        if (!this.instance)
            this.instance = new SessionStore();
        return this.instance;
    }
    init(connect) {
        return this._loadOrMakeConfigFile(connect).then((store) => {
            this.store = store;
            // this.test()
            this._scheduleReInit();
            return store;
        });
    }
    getSubscribedData(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.store.getUserStoreLst(userId);
            return (data && data.get()) || [];
        });
    }
    saveSubscriptionData(userId, data) {
        // return this.store.addToStore(userId, data); // uncomment this line to save data
        return;
    }
    deleteSubscriptionData(userId, data) {
        if (!Array.isArray(data))
            data = [data];
        // return data.map((id) => this.store.deleteToStore(userId, id)); // uncomment this line to delete data
    }
    _loadOrMakeConfigFile(connect) {
        return new Promise((resolve, reject) => {
            spinal_core_connectorjs_1.spinalCore.load(connect, path.resolve(`/etc/${storeName}`), (store) => resolve(store), () => connect.load_or_make_dir('/etc', (directory) => {
                resolve(this._createFile(directory, storeName));
            }));
        });
    }
    _createFile(directory, fileName) {
        const store = new models_1.PubSubStore();
        directory.force_add_file(fileName, store, { model_type: 'store' });
        return store;
    }
    _scheduleReInit() {
        cron.schedule('0 0 23 * * *', () => {
            this._reInitializeStore();
        });
    }
    _reInitializeStore() {
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
exports.SessionStore = SessionStore;
//# sourceMappingURL=SessionStore.js.map