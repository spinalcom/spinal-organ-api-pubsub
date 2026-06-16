"use strict";
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
exports.isTicketNode = exports.getAndFormatTicketAttributes = exports._getAttributes = void 0;
const spinal_env_viewer_plugin_documentation_service_1 = require("spinal-env-viewer-plugin-documentation-service");
const spinal_service_ticket_1 = require("spinal-service-ticket");
function _getAttributes(node) {
    return __awaiter(this, void 0, void 0, function* () {
        const attributes = yield spinal_env_viewer_plugin_documentation_service_1.serviceDocumentation.getAllAttributes(node);
        return attributes.reduce((acc, attr) => {
            acc[attr.label.get()] = attr.value.get();
            return acc;
        }, {});
    });
}
exports._getAttributes = _getAttributes;
function getAndFormatTicketAttributes(attributes) {
    const keys = ["priority", "description", "declarer_id", "processId", "stepId", "contextId", "creationDate"];
    const obj = {};
    for (const key of keys) {
        obj[key] = attributes[key];
    }
    return obj;
    // const foundCategory = attributes.find((attr) => attr.category === TICKET_ATTRIBUTE_CATEGORY_NAME);
    // if (!foundCategory) return {};
    // return foundCategory.attributes.reduce((acc, { label, value }) => {
    // 	acc[label] = value;
    // 	return acc;
    // }, {} as Record<string, any>);
}
exports.getAndFormatTicketAttributes = getAndFormatTicketAttributes;
function isTicketNode(type) {
    return type === spinal_service_ticket_1.TIKET_TYPE;
}
exports.isTicketNode = isTicketNode;
//# sourceMappingURL=functions.js.map