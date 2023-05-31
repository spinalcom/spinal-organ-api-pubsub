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
        let storeLst = this.data[userSecretId];
        if (!storeLst) {
            storeLst = new spinal_core_connectorjs_1.Lst();
            this.data.add_attr(userSecretId, storeLst);
        }
        if (!Array.isArray(data))
            data = [data];
        const ids = this.getIds(userSecretId);
        for (let id of data) {
            const index = this.findIndex(userSecretId, id);
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
    deleteToStore(userSecretId, id) {
        const index = this.findIndex(userSecretId, id);
        if (index === -1)
            return false;
        const user_ids = this.getIds(userSecretId);
        user_ids.splice(index);
        return true;
    }
    getIds(userSecretId) {
        return this.data[userSecretId];
    }
    reset() {
        for (let key in this.data) {
            this._deleteModelAttributes(this.data[key]);
            this.data.rem_attr(key);
        }
    }
    findIndex(userSecretId, id) {
        var _a, _b;
        const data = this.getIds(userSecretId);
        if (data) {
            for (let i = 0; i < data.length; i++) {
                const element = data[i];
                if (((_a = element.contextId) === null || _a === void 0 ? void 0 : _a.get()) === id.contextId &&
                    ((_b = element.nodeId) === null || _b === void 0 ? void 0 : _b.get()) === id.nodeId) {
                    if (!id.options)
                        return i;
                    else if (element.options &&
                        this._compareOptions(element.options.get(), id.options))
                        return i;
                }
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
}
exports.PubSubStore = PubSubStore;
spinal_core_connectorjs_1.spinalCore.register_models(PubSubStore);
//# sourceMappingURL=store.model.js.map