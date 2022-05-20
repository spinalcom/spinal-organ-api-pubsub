export declare enum IScope {
    all = "all",
    in_context = "in_Context",
    not_in_context = "not_in_context",
    tree_in_context = "tree_in_context"
}
export interface ISubscribeOptions {
    subscribeChildren?: boolean;
    subscribeChildScope?: IScope;
}
