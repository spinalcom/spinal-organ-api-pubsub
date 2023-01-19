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

import { Lst, Model, spinalCore } from "spinal-core-connectorjs";
import { INodeId, ISubscribeOptions } from "../lib";
import { v4 as uuidv4 } from "uuid";
import { count } from "console";
export class PubSubStore extends Model {
    constructor() {
        super();
        this.add_attr({
            id: uuidv4(),
            data: {}
        });
    }

    public addToStore(userSecretId: string, data: INodeId | INodeId[]): Lst {
        let storeLst = this.data[userSecretId];
        if (!storeLst) {
            storeLst = new Lst();
            this.data.add_attr(userSecretId, storeLst)
        }

        if (!Array.isArray(data)) data = [data];

        data.map((id) => {
            const index = this.findIndex(userSecretId, id);
            if (index === -1) {
                storeLst.push({ nodeId: id.nodeId, contextId: id.contextId, options: id.options })
            }

            return;
        })

        return storeLst;
    }

    public deleteToStore(userSecretId: string, id: INodeId): boolean {
        const index = this.findIndex(userSecretId, id);
        if (index === -1) return false;

        const user_ids = this.getIds(userSecretId);
        user_ids.splice(index);
        return true;
    }

    public getIds(userSecretId: string): Lst {
        return this.data[userSecretId];
    }

    public reset() {
        for (let key in this.data) {
            this._deleteModelAttributes(this.data[key]);
            this.data.rem_attr(key);
        }
    }


    public findIndex(userSecretId, id: INodeId): number {
        const data = this.getIds(userSecretId);

        if (data) {
            for (let i = 0; i < data.length; i++) {
                const element = data[i];

                if (element.contextId.get() === id.contextId && element.contextId.get() === id.nodeId) {
                    if (!id.options) return i;
                    else if (element.options && this._compareOptions(element.options.get(), id.options)) return i;
                };
            }
        }

        return -1;
    }

    private _compareOptions(firstOption: ISubscribeOptions, secondOption: ISubscribeOptions): boolean {
        if (!firstOption || !secondOption) return false;
        if (firstOption.subscribeChildren === secondOption.subscribeChildren && firstOption.subscribeChildScope === secondOption.subscribeChildScope) return true;
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
                if (!(element instanceof Model) || element._attribute_names.length === 0) {
                    model.rem_attr(attribute);
                }
                else this._deleteModelAttributes(element)
            }
        }
    }

}

spinalCore.register_models(PubSubStore);
