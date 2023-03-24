/*
 * Copyright 2021 SpinalCom - www.spinalcom.com
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

export const OK_STATUS: string = "success";
export const NOK_STATUS: string = "error";
export const SUBSCRIBE_EVENT: string = "subscribe";
export const UNSUBSCRIBE_EVENT: string = "unsubscribe";
export const SUBSCRIBED: string = "subscribed";
export const UNSUBSCRIBED: string = "unsubscribed";
export const PUBLISH_EVENT: string = "publish";
export const ERROR_EVENT: string = "exception";
export const SESSION_EVENT: string = "session_created";

export enum EVENT_NAMES {
    updated = "updated",
    addChild = "addChild",
    childRemoved = "childRemoved",
    childrenRemoved = "childrenRemoved",
    addChildInContext = "addChildInContext"
}
