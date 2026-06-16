import { SpinalNode } from "spinal-model-graph";
import { serviceDocumentation } from "spinal-env-viewer-plugin-documentation-service";
import { TIKET_TYPE, TICKET_ATTRIBUTE_CATEGORY_NAME } from "spinal-service-ticket";

export async function _getAttributes(node: SpinalNode): Promise<{ [key: string]: string | number | boolean }> {
	const attributes = await serviceDocumentation.getAllAttributes(node);

	return attributes.reduce((acc, attr) => {
		acc[attr.label.get()] = attr.value.get();
		return acc;
	}, {} as Record<string, any>);
}

export function getAndFormatTicketAttributes(attributes: { [key: string]: any }) {
	const keys = ["priority", "description", "declarer_id", "processId", "stepId", "contextId", "creationDate"];

	const obj: Record<string, any> = {};

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

export function isTicketNode(type: string): boolean {
	return type === TIKET_TYPE;
}
