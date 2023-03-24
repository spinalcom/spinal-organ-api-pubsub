"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_NAMES = exports.SESSION_EVENT = exports.ERROR_EVENT = exports.PUBLISH_EVENT = exports.UNSUBSCRIBED = exports.SUBSCRIBED = exports.UNSUBSCRIBE_EVENT = exports.SUBSCRIBE_EVENT = exports.NOK_STATUS = exports.OK_STATUS = void 0;
exports.OK_STATUS = "success";
exports.NOK_STATUS = "error";
exports.SUBSCRIBE_EVENT = "subscribe";
exports.UNSUBSCRIBE_EVENT = "unsubscribe";
exports.SUBSCRIBED = "subscribed";
exports.UNSUBSCRIBED = "unsubscribed";
exports.PUBLISH_EVENT = "publish";
exports.ERROR_EVENT = "exception";
exports.SESSION_EVENT = "session_created";
var EVENT_NAMES;
(function (EVENT_NAMES) {
    EVENT_NAMES["updated"] = "updated";
    EVENT_NAMES["addChild"] = "addChild";
    EVENT_NAMES["childRemoved"] = "childRemoved";
    EVENT_NAMES["childrenRemoved"] = "childrenRemoved";
    EVENT_NAMES["addChildInContext"] = "addChildInContext";
})(EVENT_NAMES = exports.EVENT_NAMES || (exports.EVENT_NAMES = {}));
//# sourceMappingURL=constants.js.map