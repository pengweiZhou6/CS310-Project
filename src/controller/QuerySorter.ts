import {InsightError} from "./IInsightFacade";


export default class QuerySorter {

    constructor() {
        // do nothing
    }

    public orderResults(options: any, results: any): Promise<any[]> {
        if (options.hasOwnProperty("ORDER")) {
            let columnsIncludesOrders = true;
            for (let key of options.ORDER.keys) {
                columnsIncludesOrders = columnsIncludesOrders && options.COLUMNS.includes(key);
            }
            if (!columnsIncludesOrders) {
                return Promise.reject(new InsightError("specified ORDERs must be in COLUMNS"));
            }
            return this.sortResults(options.ORDER, results);
        } else {
            return Promise.resolve(results);
        }
    }

    // returns sorted results as specified in query.OPTIONS.ORDER
    public sortResults(order: any, results: any[]): Promise<any[]> {
        // TODO check if order has dir, etc.

        return (QuerySorter.determineSortDirection(order.dir)).then((sortParam: number) => {
            results.sort(function (curr, next) {
                return (sortParam * QuerySorter.determineGreater(order.keys, curr, next, 0));
            });
            return Promise.resolve(results);
        }).catch((err: Error) => {
            return Promise.reject(err);
        });
    }

    private static determineSortDirection(direction: any): Promise<number> {
        if (direction === "UP") {
            return Promise.resolve(1);
        } else if (direction === "DOWN") {
            return Promise.resolve(-1);
        } else {
            return Promise.reject(new InsightError("specified sort direction is invalid"));
        }
    }

    private static determineGreater(keys: string[], curr: any, next: any, select: number): number {
        const attribute = keys[select];
        if (curr[attribute] > next[attribute]) {
            return 1;
        } else if (curr[attribute] < next[attribute]) {
            return -1;
        } else if (select < (keys.length)) {
            return QuerySorter.determineGreater(keys, curr, next, (select + 1));
        } else {
            return 0;
        }
    }
}
