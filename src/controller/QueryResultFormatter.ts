import {InsightError} from "./IInsightFacade";
import {RealDataset} from "./InsightFacade";
import {Decimal} from "decimal.js";
import QueryEngine from "./QueryEngine";
import Log from "../Util";

export default class QueryResultFormatter {
    private numericKeys: string[];
    private nonNumericKeys: string[];
    private queryEngine: QueryEngine;

    constructor(qe: QueryEngine) {
        this.numericKeys = ["lat", "long", "seats", "avg", "pass", "fail", "audit", "year"];
        this.nonNumericKeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "name",
            "number", "address", "type", "furniture", "href"];
        this.queryEngine = qe;
    }

    // checks that transformations contains only and exactly GROUP and APPLY
    // checks that transformations has at least one GROUP key
    // rejects with InsightError accordingly, else resolves
    public static isValidTransform(transformations: any): Promise<any> {
        const transformKeys: string[] = Object.keys(transformations);
        if (transformKeys.length !== 2) {
            return Promise.reject(new InsightError("query.TRANSFORMATIONS has incorrect fields"));
        } else if (!transformKeys.includes("GROUP")) {
            return Promise.reject(new InsightError("query.TRANSFORMATIONS lacks GROUP"));
        } else if (!transformKeys.includes("APPLY")) {
            return Promise.reject(new InsightError("query.TRANSFORMATIONS lacks APPLY"));
        } else if (transformations.GROUP.length === 0) {
            return Promise.reject(new InsightError("query.TRANSFORMATIONS.GROUP lacks any keys"));
        } else if (!(transformations.GROUP instanceof Array)) {
            return Promise.reject(new InsightError("GROUP must be Array"));
        } else if (!(transformations.APPLY instanceof Array)) {
            return Promise.reject(new InsightError("APPLY must be Array"));
        } else {
            return Promise.resolve();
        }
    }

    public applyTransform(transformations: any, input: RealDataset): Promise<any[]> {
        return (this.groupResults(transformations.GROUP, input.data, 0)).then((groupedResults) => {
            return (this.applyResults(transformations.APPLY, groupedResults, -transformations.GROUP.length));
        }).catch((err) => {
            return Promise.reject(err);
        });
    }

    // gathers input of courses/rooms into groups specified by TRANSFORMATIONS, returns array of arrays
    // i.e. array<group<course/room>> ... rejects with InsightError
    private groupResults(groups: any, input: any[], currGroupIndex: number): Promise<any> {
        // this if block terminates recursion
        if (currGroupIndex === groups.length) {
            return Promise.resolve(input);
        }

        const inputSize = input.length; // TODO - computationally expensive (well, somewhat)
        let output: Array<Promise<any>> = [];
        let coveredValues: any[] = [];
        const currGroup = groups[currGroupIndex];
        // split into keys, if group is applykey, reject
        const tempKeys = currGroup.split("_");
        if (tempKeys.length !== 2) {
            // TODO promise reject AND validate key
        }
        const field = tempKeys[1];

        // recursive call to groupResults
        for (let i = 0; i < inputSize; i++) {
            const currField = input[i][field];
            if (!coveredValues.includes(currField)) {
                coveredValues.push(currField);
                let newGroup: any[] = [];
                newGroup.push(input[i]);
                for (let j = i + 1; j < inputSize; j++) {
                    // do nothing for now
                    const currItem = input[j];
                    if (currItem[field] === currField) {
                        newGroup.push(currItem);
                    }
                }
                output.push(this.groupResults(groups, newGroup, (currGroupIndex + 1)));
            }
        }
        return Promise.all(output);
    }

    // validate applytoken
    // validate key
    // validate applykey (no underscore and no duplicates)
    private applyResults(applyRules: any[], input: any[], currIndex: number): Promise<any[]> {
        let output: Array<Promise<any>> = [];
        if (input[0] instanceof Array) { // if input contains more arrays, 'dig deeper' on all child groups
            // Log.trace("path1" + "_" + currIndex);
            for (let group of input) {
                output.push(this.applyResults(applyRules, group, currIndex + 1));
            }
            return Promise.all(output).then((result) => {
                return Promise.resolve(QueryResultFormatter.unpackArrays(result)).then((unpacked) => {
                    if (currIndex > 0) {
                        return this.applyResults(applyRules, unpacked, currIndex);
                    }
                    return Promise.resolve(unpacked);
                });
            });
        } else { // otherwise, execute the APPLYRULES on the classes/rooms
            // Log.trace("path2" + "_" + currIndex);
            return this.executeApply(applyRules, input, currIndex);
        }
    }

    private static unpackArrays(input: any[]) {
        let output: any[] = [];
        if (!(input instanceof Array)) {
            return input;
        } else {
            for (let child of input) {
                output = output.concat(this.unpackArrays(child));
            }
        }
        return output;
    }

    // recursively performs APPLY calculations on input
    // when executeApply terminates, it should return only a single object
    // this object should include all applykeys from the APPLYRULES
    private executeApply(applyRules: any[], input: any[], currIndex: number): Promise<any> {
        const tempKeys = Object.keys(applyRules[currIndex]);
        if (tempKeys.length !== 1) {
            return Promise.reject(new InsightError("APPLYRULE should have exactly 1 key"));
        } else if (tempKeys[0].includes("_")) {
            return Promise.reject(new InsightError("applykey in query APPLYRULE contains underscore"));
        }
        const applyKey = tempKeys[0];
        const applyToken = applyRules[currIndex][applyKey];
        if (applyToken instanceof Array ) {
            return Promise.reject(new InsightError("APPLYRULE should reference object not array"));
        }
        let output = input[0];
        let applyTokenType = Object.keys(applyToken)[0];
        return (this.isKeyValid(applyToken[applyTokenType])).then((isValid) => {
            return (this.switchApplyCase(input, applyToken[applyTokenType], applyTokenType))
                .then((result) => {
                    output[applyKey] = result;
                    return Promise.resolve(output);
                });
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    private switchApplyCase(input: any[], key: string, applyTokenType: string): Promise<any> {
        let returnValue: number;
        try {
            switch (applyTokenType) {
                case "MAX":
                    returnValue = (this.applyMAX(input, key));
                    break;
                case "MIN":
                    returnValue = this.applyMIN(input, key);
                    break;
                case "AVG":
                    returnValue = this.applyAVG(input, key);
                    break;
                case "SUM":
                    returnValue = this.applySUM(input, key);
                    break;
                case "COUNT":
                    returnValue = this.applyCOUNT(input, key);
                    break;
                default:
                    return Promise.reject(new InsightError("invalid APPLYRULE transformation"));
            }
            return Promise.resolve(returnValue);
        } catch (err) {
            return Promise.reject(err);
        }
    }

    // applies APPLYTOKEN as per spec, throws InsightError detailing problems

    private applyMAX(input: any[], key: string): number {
            if (this.isNumericKey(key)) {
                const keyName = key.split("_")[1]; // TODO should validate key
                let maxVal: number = input[0][keyName];
                for (let i = 0; i < input.length; i++) {
                    let iterMax = input[i][keyName];
                    for (let j = i + 1; j < input.length; j++) {
                        iterMax = (input[j][keyName] > iterMax) ? input[j][keyName] : iterMax;
                    }
                    maxVal = (iterMax > maxVal) ? iterMax : maxVal;
                }
                return maxVal;
            } else {
                throw new InsightError("invalid key in APPLYRULE");
            }
    }

    private applyMIN(input: any[], key: string): number {
        if (this.isNumericKey(key)) {
            const keyName = key.split("_")[1]; // TODO should validate key
            let minVal: number = input[0][keyName];
            for (let i = 0; i < input.length; i++) {
                let iterMin = input[i][keyName];
                for (let j = i + 1; j < input.length; j++) {
                    iterMin = (input[j][keyName] < iterMin) ? input[j][keyName] : iterMin;
                }
                minVal = (iterMin < minVal) ? iterMin : minVal;
            }
            return minVal;
        } else {
            throw new InsightError("invalid key in APPLYRULE");
        }
    }

    private applyAVG(input: any[], key: string): number {
        if (this.isNumericKey(key)) {
            let total = new Decimal(0);
            const keyName = key.split("_")[1]; // TODO should validate key
            for (let item of input) {
                total = Decimal.add(total, new Decimal(item[keyName]));
            }
            let avg = total.toNumber() / input.length;
            return Number(avg.toFixed(2));
        } else {
            throw new InsightError("invalid key in APPLYRULE");
        }
    }

    private applySUM(input: any[], key: string): number {
        if (this.isNumericKey(key)) {
            let total = new Decimal(0);
            const keyName = key.split("_")[1]; // TODO should validate key
            for (let item of input) {
                total = Decimal.add(total, new Decimal(item[keyName]));
            }
            return Number(total.toFixed(2));
        } else {
            throw new InsightError("invalid key in APPLYRULE");
        }
    }

    private applyCOUNT(input: any[], key: string): number {
        let setOfUniques = new Set([]);
        const keyName = key.split("_")[1]; // TODO should validate key
        for (let item of input) {
            setOfUniques.add(item[keyName]);
        }
        return setOfUniques.size;
    }

    private isKeyValid(key: string): Promise<boolean> {
        return this.queryEngine.validateKey(key);
        // return true;
    }

    private isNumericKey(key: string): boolean {
        const keyName = key.split("_")[1];
        return (this.numericKeys.includes(keyName));
    }

}
