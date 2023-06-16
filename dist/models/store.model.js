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
exports.PubSubStore = void 0;
const spinal_core_connectorjs_1 = require("spinal-core-connectorjs");
const uuid_1 = require("uuid");
class PubSubStore extends spinal_core_connectorjs_1.Model {
    constructor() {
        super();
        this.add_attr({
            id: (0, uuid_1.v4)(),
            data: {},
        });
    }
    addToStore(userSecretId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const storeLst = yield this.getUserStoreLst(userSecretId, true);
            if (!Array.isArray(data))
                data = [data];
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
        });
    }
    deleteToStore(userSecretId, id) {
        return __awaiter(this, void 0, void 0, function* () {
            const storeLst = yield this.getUserStoreLst(userSecretId);
            if (!storeLst)
                return;
            const index = this.findIndex(storeLst, id);
            if (index === -1)
                return false;
            const item = storeLst[index];
            storeLst.remove(item);
            // const user_ids = this.getIds(userSecretId);
            // user_ids.splice(index);
            return true;
        });
    }
    getUserStoreLst(userSecretId, createIfNotExist = false) {
        return __awaiter(this, void 0, void 0, function* () {
            let storeLst = yield this._loadUserData(userSecretId);
            if (!storeLst && createIfNotExist) {
                storeLst = new spinal_core_connectorjs_1.Lst();
                this.data.add_attr(userSecretId, new spinal_core_connectorjs_1.Ptr(storeLst));
            }
            return storeLst;
        });
    }
    reset() {
        for (let key in this.data) {
            this._deleteModelAttributes(this.data[key]);
            this.data.rem_attr(key);
        }
    }
    findIndex(userData, id) {
        var _a, _b;
        for (let i = 0; i < userData.length; i++) {
            const element = userData[i];
            if (((_a = element.contextId) === null || _a === void 0 ? void 0 : _a.get()) === id.contextId &&
                ((_b = element.nodeId) === null || _b === void 0 ? void 0 : _b.get()) === id.nodeId) {
                if (!id.options)
                    return i;
                else if (element.options &&
                    this._compareOptions(element.options.get(), id.options))
                    return i;
            }
        }
        return -1;
    }
    _compareOptions(firstOption, secondOption) {
        if (!firstOption || !secondOption)
            return false;
        if (firstOption.subscribeChildren === secondOption.subscribeChildren &&
            firstOption.subscribeChildScope === secondOption.subscribeChildScope)
            return true;
        return false;
    }
    _deleteModelAttributes(model) {
        if (model instanceof spinal_core_connectorjs_1.Lst) {
            for (let index = 0; index < model.length; index++) {
                const element = model[index];
                this._deleteModelAttributes(element);
                model.remove(element);
            }
        }
        else if (model instanceof spinal_core_connectorjs_1.Model) {
            for (const attribute in model) {
                const element = model[attribute];
                if (!(element instanceof spinal_core_connectorjs_1.Model) ||
                    element._attribute_names.length === 0) {
                    model.rem_attr(attribute);
                }
                else
                    this._deleteModelAttributes(element);
            }
        }
    }
    _loadUserData(userSecretId) {
        let storePtr = this.data[userSecretId];
        if (!storePtr)
            return;
        return new Promise((resolve, reject) => {
            if (storePtr instanceof spinal_core_connectorjs_1.Lst)
                return resolve(storePtr);
            if (storePtr instanceof spinal_core_connectorjs_1.Ptr)
                return storePtr.load((data) => resolve(data));
            resolve(undefined);
        });
    }
}
exports.PubSubStore = PubSubStore;
spinal_core_connectorjs_1.spinalCore.register_models(PubSubStore);
//# sourceMappingURL=store.model.js.map