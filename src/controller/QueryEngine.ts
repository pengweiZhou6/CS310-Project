import {InsightDatasetKind, InsightError} from "./IInsightFacade";
import InsightFacade, {RealDataset} from "./InsightFacade";
import FilterExecutor from "./FilterExecutor";
import QuerySorter from "./QuerySorter";
import QueryResultFormatter from "./QueryResultFormatter";
import * as fs from "fs";
import Log from "../Util";

export default class QueryEngine {
    private workingDataset: string;
    private workingDatasetKind: InsightDatasetKind;
    private datasets: RealDataset[];
    private insightFacade: InsightFacade;
    public numericKeys: string[];
    public nonNumericKeys: string[];
    private coursesKeys: string[];
    private roomsKeys: string[];
    public allKeys: string[];

    constructor(facade: InsightFacade, facadeDatasets: RealDataset[]) {
        this.insightFacade = facade;
        this.datasets = facadeDatasets;
        this.numericKeys = ["lat", "lon", "seats", "avg", "pass", "fail", "audit", "year"];
        this.nonNumericKeys = ["dept", "id", "instructor", "title", "uuid", "fullname", "shortname", "name",
            "number", "address", "type", "furniture", "href"];
        this.allKeys = this.numericKeys.concat(this.nonNumericKeys);
        this.coursesKeys = ["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"];
        this.roomsKeys = ["lat", "lon", "seats", "fullname", "shortname", "name",
            "number", "address", "type", "furniture", "href"];
    }

    // entry point for execution of queries. accepts query object, returns RealDataset with unformatted results
    public performQuery(query: any): Promise<RealDataset> {
        const keys: string[] = Object.keys(query);
        if (keys.length === 3 && !query.hasOwnProperty(("TRANSFORMATIONS"))) {
            return Promise.reject(new InsightError("query has invalid field"));
        }
        if (keys === null || (keys.length > 3) || (keys.length < 1)) {
            return Promise.reject(new InsightError("too many fields in query"));
        } else if (!query.hasOwnProperty("OPTIONS")) {
            return Promise.reject(new InsightError("query missing OPTIONS"));
        } else if (!query.hasOwnProperty("WHERE")) {
            return Promise.reject(new InsightError("query missing WHERE"));
        } else {
            if (query.OPTIONS.hasOwnProperty("ORDER") && typeof (query.OPTIONS.ORDER) === "string") {
                const temp = query.OPTIONS.ORDER;
                query.OPTIONS.ORDER = {dir: "UP", keys: [temp]};
            }
            if (query.hasOwnProperty("TRANSFORMATIONS") && !(this.columnsKeysInGroupOrApply(query))) {
                return Promise.reject(new InsightError("keys in COLUMNS must be in GROUP or APPLY"));
            }
            return (this.optionsIsInvalid(query.OPTIONS)).then(() => {
                return (this.establishWorkingDataset(query.OPTIONS)).then(() => {
                    return (this.accessWorkingDataset()).then((workingDS) => {
                        let fe = new FilterExecutor(workingDS, this);
                        return fe.executeQueryBody(query.WHERE);
                    });
                });
            }).catch((error) => {
                return Promise.reject(error);
            });
        }
    }

    private columnsKeysInGroupOrApply(query: any): boolean {
        let columns = query.OPTIONS.COLUMNS;
        if (query.TRANSFORMATIONS.hasOwnProperty("GROUP") && query.TRANSFORMATIONS.hasOwnProperty("APPLY") &&
            query.TRANSFORMATIONS.GROUP instanceof Array && query.TRANSFORMATIONS.APPLY instanceof Array) {
            let keys = query.TRANSFORMATIONS.GROUP;
            for (let apply of query.TRANSFORMATIONS.APPLY) {
                keys.push(Object.keys(apply)[0]);
            }
            for (let column of columns) {
                if (!keys.includes(column)) {
                    return false;
                }
            }
        }
        return true;
    }

    private optionsIsInvalid(options: any): Promise<boolean> {
        const optionKeysLength: number = Object.keys(options).length;
        if (optionKeysLength !== 2 && optionKeysLength !== 1) {
            return Promise.reject(new InsightError("query OPTIONS is invalid"));
        }
        if (options.COLUMNS.length === 0) {
            return Promise.reject(new InsightError("no keys in COLUMNS"));
        }
        if (!(options.hasOwnProperty("COLUMNS"))) {
            return Promise.reject(new InsightError("options lacks columns"));
        }
        if (options.hasOwnProperty("ORDER")) {
            if (!(options.ORDER.hasOwnProperty("dir") && options.ORDER.hasOwnProperty("keys"))) {
                return Promise.reject(new InsightError("ORDER lacks dir or keys"));
            }
        }
        return Promise.resolve(true);
    }

    public formatQueryResult(results: RealDataset, options: any, transformations: any): Promise<any[]> {
        let output: any[] = [];
        let columns: string[] = [];
        let qs = new QuerySorter();
        let qrf = new QueryResultFormatter(this);

        if (results.insightDataset.numRows > 0) { // TODO
            results.insightDataset.numRows = results.data.length;
        } else if (results.insightDataset.numRows > 0) {
            results.insightDataset.numRows = results.data.length;
        }


        // TODO - recalibrate to consider transformations
        for (const col of options.COLUMNS) {
            columns.push(col.split("_")[1]);
        }
        // adds courses from 'results', containing only specified fields (as per COLUMNS)
        for (const course of results.data) {
            const newCourse: any = {};
            for (let i = 0; i < columns.length; i++) {
                newCourse[options.COLUMNS[i]] = course[columns[i]];
            }
            output.push(newCourse);
        }
        // applies specified transformations
        if (transformations !== null) {
            return (QueryResultFormatter.isValidTransform(transformations)).then(() => {
                return (qrf.applyTransform(transformations, results)).then((result) => {
                    result = this.removeUnwantedFields(result, options.COLUMNS);
                    return qs.orderResults(options, result);
                });
            }).catch((error) => {
                return Promise.reject(error);
            });
        } else {
            return qs.orderResults(options, output);
        }
    }

    // removes all fields not specified by COLUMNS
    private removeUnwantedFields(input: any[], columns: any[]) {
        let newResults: any[] = [];
        for (let item of input) {
            let newItem: any = {};
            for (let column of columns) {
                const pieces = column.split("_");
                if (pieces.length === 2) {
                    newItem[column] = item[pieces[1]];
                } else {
                    newItem[column] = item[column];
                }
            }
            newResults.push(newItem);
        }
        return newResults;
    }

    private establishWorkingDataset(options: any): Promise<any> {
        let promises: Array<Promise<any>> = [];
        if (!options.hasOwnProperty("COLUMNS")) {
            return Promise.reject(new InsightError("query OPTIONS missing COLUMNS"));
        } else {
            // TODO account for bad ORDER
            if (options.hasOwnProperty("ORDER")) {
                for (let key of options.ORDER.keys) {
                    promises.push((this.checkKeyIsValid(key)).then((isGoodKey) => {
                        if (isGoodKey) {
                            return this.determineDataset(key);
                        }
                    }).catch((error) => {
                        return Promise.reject(error);
                    }));
                }
            }
            if (options.COLUMNS.length === 0) {
                return Promise.reject(new InsightError("COLUMNS empty"));
            }
            for (let key of options.COLUMNS) {
                if (key instanceof Array) {
                    return Promise.reject(new InsightError("bad key in COLUMNS"));
                }
                promises.push(this.checkKeyIsValid(key).then((isGoodKey) => {
                    if (isGoodKey) {
                        return this.determineDataset(key);
                    }
                }).catch((error) => {
                    return Promise.reject(error);
                }));
            }
            return Promise.all(promises).catch((error) => {
                return Promise.reject(error);
            }).catch((err) => {
                return Promise.reject(err);
            });
        }
    }

    private checkKeyIsValid(key: string): Promise<boolean> {
        const frags: string[] = key.toString().split("_");
        if (frags.length > 2) {
            return Promise.reject(new InsightError("bad key"));
        }
        if (frags.length > 1 && !(this.allKeys.includes(frags[1]))) {
            return Promise.reject(new InsightError("bad key"));
        } else {
            return Promise.resolve(true);
        }
    }

    private determineDataset(key: any): Promise<any> {
        if (key === undefined || key === null) {
            return Promise.resolve();
        }
        // TODO - validate key
        const pieces: string[] = key.toString().split("_");

        if (pieces.length > 1) {
            if (this.workingDataset === undefined) {
                this.workingDataset = pieces[0];
                if (this.roomsKeys.includes(pieces[1])) {
                    this.workingDatasetKind = InsightDatasetKind.Rooms;
                } else if (this.coursesKeys.includes(pieces[1])) {
                    this.workingDatasetKind = InsightDatasetKind.Courses;
                } else {
                    return Promise.reject(new InsightError("key invalid for Rooms AND Courses"));
                }
                return Promise.resolve();
            } else if (this.workingDataset !== pieces[0]) {
                return Promise.reject(new InsightError("references multiple datasets"));
            } else {
                return Promise.resolve();
            }
        } else {
            return Promise.resolve();
        }
    }

    // accepts key of form <dataset>_<key>
    // validates <dataset> against workingDataset, validates <key> vs validKeys and workingDatasetKind
    // rejects with InsightError describing fault
    // resolves with nothing
    public validateKey(key: string): Promise<boolean> {
        return (this.determineDataset(key)).then(() => {
            return (this.checkKeyIsValid(key));
        }).catch((error) => {
            return Promise.reject(error);
        });
    }

    // returns InsightDataset of working dataset
    private accessWorkingDataset(): Promise<RealDataset> {
        let self = this;
        for (let rds of this.datasets) { // TODO
            if (rds.insightDataset.id === this.workingDataset) {
                return Promise.resolve(rds);
            } else if (rds.insightDataset.id === this.workingDataset) {
                return Promise.resolve(rds);
            }
        }
        return new Promise(function (resolve, reject) {
            fs.readFile ("data/" + self.workingDataset + ".json", function (err, data) {
                if (err) {
                    return reject(new InsightError("could not find dataset on disk"));
                }
                let datasetData = JSON.parse(data.toString());
                const realDS: RealDataset = {
                    insightDataset: {id: "", kind: undefined, numRows: 0},
                    data: []
                };
                realDS.data = datasetData;
                realDS.insightDataset.id = self.workingDataset;
                realDS.insightDataset.kind = self.workingDatasetKind;
                realDS.insightDataset.numRows = realDS.data.length;
                resolve(realDS);
            });
        });
    }
}
