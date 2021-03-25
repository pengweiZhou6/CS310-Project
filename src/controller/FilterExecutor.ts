import {RealDataset} from "./InsightFacade";
import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import QueryEngine from "./QueryEngine";


export default class FilterExecutor {
    private workingDataset: RealDataset;
    private queryEngine: QueryEngine;

    constructor(ds: RealDataset, qe: QueryEngine) {
        this.workingDataset = ds;
        this.queryEngine = qe;
    }

    // takes the WHERE object from query object, executes
    public executeQueryBody(body: any): Promise<RealDataset> {
        const filters = Object.keys(body);
        if (filters[0] !== null && filters[0] !== undefined) {
            return this.filterResults(filters[0], body[filters[0]]);
        } else { // case for when filter is empty - return full dataset
            return Promise.resolve(this.workingDataset);
        }
    }

    // executes recursively the Filter and its subsidiary Filters, as per spec
    // Promise rejects with InsightError describing problem
    private filterResults(key: string, filters: any): Promise<RealDataset> {
        let result: any;
        try {
            switch (key) {
                case "AND":
                case "OR":
                    result = this.filterLOGIC(filters, key);
                    break;
                case "LT":
                case "GT":
                case "EQ":
                    result = this.filterMCOMPARISON(filters, key);
                    break;
                case "IS":
                    result = this.filterIS(filters);
                    break;
                case "NOT":
                    result = this.filterNOT(filters);
                    break;
                default:
                    return Promise.reject(new InsightError("invalid/undefined filter!"));
            }
        } catch (error) {
            return Promise.reject(error);
        }
        return result;
    }

    // Promise resolves with RealDataset containing all courses which satisfy the Filter
    // otherwise Promise rejects with InsightError describing the problem

    private filterLOGIC(filters: any, logicKey: string): Promise<RealDataset> {
        const promises: Array<Promise<RealDataset>> = [];
        if (!(filters instanceof Array)) {
            filters = filters[logicKey];
        }
        for (let filter of filters) {
            const key: string = Object.keys(filter)[0];
            if (key === undefined) {
                return Promise.reject(new InsightError("undefined filter in LOGIC"));
            }
            promises.push(this.filterResults(key, filter[key]));
        }
        return (Promise.all(promises)).then((response) => {
            let first: any[] = response[0].data;
            const responseLength: number = response.length;
            if (responseLength > 1) {
                switch (logicKey) {
                    case "OR":
                        first = FilterExecutor.filterOR(first, response);
                        break;
                    case "AND":
                        first = FilterExecutor.filterAND(first, response);
                        break;
                    default:
                        return Promise.reject(new InsightError("LOGIC machine broke!"));
                }
                let output: RealDataset = {
                    insightDataset: {id: "", kind: undefined, numRows: 0},
                    data: []
                };
                output.insightDataset.id = this.workingDataset.insightDataset.id;
                output.insightDataset.kind = InsightDatasetKind.Courses;
                output.data = first;
                output.insightDataset.numRows = first.length;
                return Promise.resolve(output);
            } else {
                return Promise.resolve(response[0]);
            }
        });
    }

    private static filterOR(result: any[], filterResults: any[]): any[] {
        const numFilterResults = filterResults.length;
        for (let i = 1; i < numFilterResults; i++) {
            for (const elem of filterResults[i].data) {
                if (!(result.includes(elem))) {
                    result.push(elem);
                }
            }
        }
        return result;
    }

    private static filterAND(result: any[], filterResults: any[]): any[] {
        const numFilterResults = filterResults.length;
        for (let i = 1; i < numFilterResults; i++) {
            result = result.filter(function (val) {
                return filterResults[i].data.includes(val);
            });
        }
        return result;
    }

    private filterMCOMPARISON(filter: any, filterKey: string): Promise<RealDataset> {
        const key: string = Object.keys(filter)[0];
        const frags: string[] = key.split("_");
        const courseField: string = frags[1];
        if (this.queryEngine.nonNumericKeys.includes(courseField)) {
            return Promise.reject(new InsightError("MCOMPARISON key must be numeric"));
        }
        const comparisonVal: any = filter[key];
        if (comparisonVal === null || comparisonVal === undefined || isNaN(comparisonVal)) {
            return Promise.reject(new InsightError("bad value in MCOMPARISON"));
        }
        let realDS: RealDataset = {
            insightDataset: {id: "", kind: undefined, numRows: 0},
            data: []
        };
        // return (this.queryEngine.determineDataset(key)).then(() => {
        realDS.insightDataset = this.workingDataset.insightDataset;
        const workingData: any[] = this.workingDataset.data;
        switch (filterKey) {
            case "LT":
                for (const course of workingData) {
                    if (course[courseField] < comparisonVal) {
                        realDS.data.push(course);
                    }
                }
                break;
            case "GT":
                for (const course of workingData) {
                    if (course[courseField] > comparisonVal) {
                        realDS.data.push(course);
                    }
                }
                break;
            case "EQ":
                for (const course of workingData) {
                    if (course[courseField] === comparisonVal) {
                        realDS.data.push(course);
                    }
                }
                break;
            default:
                return Promise.reject(new InsightError("MCOMPARISON machine broke!"));
        }
        return Promise.resolve(realDS);
        // }).catch((error) => {
        //     return Promise.reject(error);
        // });
    }

    private filterIS(filter: any): Promise<RealDataset> {
        const key: string = Object.keys(filter)[0];
        const frags: string[] = key.split("_");
        const courseField: string = frags[1];
        if (this.queryEngine.numericKeys.includes(courseField)) {
            return Promise.reject(new InsightError("bad skey in SCOMPARISON"));
        }
        let isVal: any = filter[key];
        if (!(typeof isVal === "string")) {
            return Promise.reject(new InsightError("Invalid value type in IS, should be string"));
        }
        // const isValMatch: any = isVal.match(/\*/g);
        const isValMatch: any = isVal.match(/(\*)+[a-zA-Z_+?^{}()[\]\\]*(\*)+[a-zA-Z_+?^{}()[\]\*\\]+/);
        if (!(isValMatch === null) || isValMatch > 0) {
            return Promise.reject(new InsightError("bad asterisk placement in SCOMPARISON"));
        }
        let realDS: RealDataset = {
            insightDataset: {id: "", kind: undefined, numRows: 0},
            data: []
        };
        return (this.queryEngine.validateKey(key)).then(() => {
            realDS.insightDataset = this.workingDataset.insightDataset;
            const workingData: any[] = this.workingDataset.data;
            const realIsVal: string = isVal;
            if (!(isVal.match(/\*/g))) {
                for (const course of workingData) {
                    if (course[courseField] === isVal) {
                        realDS.data.push(course);
                    }
                }
            } else {
                isVal = isVal.replace(/\*/g, "");
                isVal = isVal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                let asteriskRegex = new RegExp((((realIsVal.startsWith("\*")) ? ".*" : "\\b") +
                    "(" + isVal + ")" +
                    ((realIsVal.endsWith("\*")) ? ".*" : "\\b")));
                for (const course of workingData) {
                    if (course[courseField].match(asteriskRegex)) {
                        realDS.data.push(course);
                    }
                }
            }
            return Promise.resolve(realDS);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    private filterNOT(filter: any): Promise<RealDataset> {
        let realDS: RealDataset = {
            insightDataset: {id: "", kind: undefined, numRows: 0},
            data: []
        };
        const key: string = Object.keys(filter)[0];
        return (this.filterResults(key, filter[key])).then((result) => {
            realDS.insightDataset = this.workingDataset.insightDataset;
            for (let course of this.workingDataset.data) {
                if (!(result.data.includes(course))) {
                    realDS.data.push(course);
                }
            }
            return Promise.resolve(realDS);
        }).catch((error) => {
            return Promise.reject(error);
        });
    }
}
