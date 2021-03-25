import Log from "../Util";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    NotFoundError,
    ResultTooLargeError
} from "./IInsightFacade";
import * as JSZip from "jszip";
import * as fs from "fs";

import QueryEngine from "./QueryEngine";
import AddDatasetUtil from "./AddDatasetUtil";
import HtmlNavUtil from "./HtmlNavUtil";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export class RealDataset {
    public insightDataset: InsightDataset;
    public data: any[];
}

function nullAndUndefine(id: string, content: string, kind: InsightDatasetKind) {
    if (id === null || id === undefined) {
        return false;
    }
    if (content === null || content === undefined) {
        return false;
    }
    if (kind === null || kind === undefined) {
        return false;
    }
    if (!id.replace(/\s/g, "").length || id.includes("\_")) {
        return false;
    }
    return content.replace(/\s/g, "").length;
}

export default class InsightFacade implements IInsightFacade {
    private datasets: RealDataset[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        let self = this;
        if (!this.existsID(id)) {
            return new Promise(function (resolve, reject) {
                if (kind === InsightDatasetKind.Courses && nullAndUndefine(id, content, kind)) {
                    return (self.addDatasetCourses(id, content)).then((result) => {
                        resolve(result);
                    }).catch((error) => {
                        reject(error);
                    });
                } else if (kind === InsightDatasetKind.Rooms && nullAndUndefine(id, content, kind)) {
                    return (self.addDatasetRooms(id, content)).then((result) => {
                        resolve(result);
                    }).catch((error) => {
                        reject(error);
                    });
                } else {
                    return reject(new InsightError("Not valid ID"));
                }
            });
        } else {
            return Promise.reject(new InsightError("duplicate ID "));
        }
    }

    private existsID(id: string): boolean {
        for (const data of this.datasets) {
            if (data.insightDataset.id === id || data.insightDataset.id === id) {
                return true;
            }
        }
        return false;
    }

    private addDatasetCourses(id: string, content: any): Promise<string[]> {
        let promises: Array<Promise<any>> = [];
        let self = this;
        return new Promise(function (resolve, reject) {
            let zip = new JSZip();
            return zip.loadAsync(content, {base64: true}).then(function (zipObj) {
                zipObj.folder("courses");
                if (zipObj.length === 0) {
                    return reject(new InsightError("folder not found"));
                }
                zipObj.forEach(function (relativePath, file) {
                    promises.push(file.async("text"));
                });
            }).then(function () {
                return Promise.all(promises).then((data: string[]) => {
                    return (AddDatasetUtil.getValid(data)).then((result) => {
                        fs.writeFile("data/" + id + ".json", JSON.stringify(result), function (err) {
                            if (err) {
                                return Promise.reject(err);
                            }
                            let dataset: InsightDataset = {id: id, kind: undefined, numRows: 0};
                            dataset.kind = InsightDatasetKind.Courses;
                            dataset.numRows = result.length;
                            const realDS: RealDataset = {
                                insightDataset: {id: "", kind: undefined, numRows: 0},
                                data: []
                            };
                            realDS.insightDataset = dataset;
                            realDS.data = result;
                            self.datasets.push(realDS);
                            let datasetIDs: string[] = [];
                            for (const d of self.datasets) {
                                datasetIDs.push(d.insightDataset.id);
                            }
                            return resolve(datasetIDs);
                        });
                    });
                });
            }).catch((err: any) => {
                return reject(err);
            });
        });
    }

    private addDatasetRooms(id: string, content: string): Promise<string[]> {
        let self = this;
        let zip = new JSZip();
        let roomLinks: any[] = [];
        return (zip.loadAsync(content, {base64: true}).then(function (zipObj) {
            zipObj.folder("rooms");
            if (zipObj.length === 0) {
                return Promise.reject(new InsightError("folder not found"));
            } else if (!Object.keys(zipObj.files).includes("rooms/index.htm")) {
                return Promise.reject(new InsightError("index.htm not found in rooms folder"));
            }
            return zipObj.file("rooms/index.htm").async("text");
        }).then(function (indexInfo: string): Promise<string[]> {
            let collection: any[] = [];
            const parse5 = require("parse5");
            const buildingsData = parse5.parse(indexInfo);
            collection = HtmlNavUtil.searchTree(buildingsData, "tbody");
            for (let item of collection) {
                roomLinks = roomLinks.concat(HtmlNavUtil.findBuildingLinks(item));
            }
            zip = new JSZip();
            return (zip.loadAsync(content, {base64: true})).then(function (zipObj) {
                let promises: Array<Promise<any>> = [];
                for (let link of roomLinks) {
                    link = link.replace(".", "rooms");
                    promises.push(zipObj.file(link).async("text"));
                }
                return Promise.all(promises).then((results) => {
                    return (self.buildRooms(id, results, roomLinks)).then((rooms) => {
                        let realDS: RealDataset = {
                            insightDataset: {id: "", kind: undefined, numRows: 0},
                            data: []
                        };
                        realDS.insightDataset.id = id;
                        realDS.insightDataset.kind = InsightDatasetKind.Rooms;
                        realDS.insightDataset.numRows = rooms.length;
                        realDS.data = rooms;
                        self.datasets.push(realDS);
                        let datasetIDs: string[] = [];
                        for (const d of self.datasets) {
                            datasetIDs.push(d.insightDataset.id);
                        }
                        return Promise.resolve(datasetIDs);
                    });
                });
            });
        })).catch((err) => {
            return Promise.reject(err);
        });
    }

    private buildRooms(id: string, input: any[], buildingLinks: string[]): Promise<any[]> {
        let buildingJsons: any[] = [];
        const parse5 = require("parse5");

        for (let file of input) {
            buildingJsons.push(parse5.parse(file));
        }

        let roomTables = HtmlNavUtil.buildRoomTables(buildingJsons, buildingLinks);
        return (this.getLatLons(roomTables)).then((geolocs) => {
            for (let i = 0; i < roomTables.length; i++) {
                roomTables[i].lat = geolocs[i].lat;
                roomTables[i].lon = geolocs[i].lon;
            }
            let roughRooms = HtmlNavUtil.generateRoughRooms(roomTables);
            let rooms: any[] = [];
            try {
                for (let roughRoom of roughRooms) {
                    if (roughRoom.foundAddress !== "") {
                        rooms.push(HtmlNavUtil.assembleRoom(roughRoom));
                    }
                }
            } catch (error) {
                return Promise.reject(error);
            }
            return new Promise(function (resolve, reject) {
                fs.writeFile("data/" + id + ".json", JSON.stringify(rooms), function (err) {
                    if (err) {
                        return reject(new InsightError("failed to write ds to disk"));
                    }
                    return resolve(rooms);
                });
            });
        });
    }

    private getLatLons(roomTables: any[]): Promise<any[]> {
        let promises: Array<Promise<any>> = [];
        for (let table of roomTables) {
            promises.push(AddDatasetUtil.getGeolocation(table.foundAddress));
        }
        return Promise.all(promises);
    }

    public removeDataset(id: string): Promise<string> {
        if (id === null || id === undefined) {
            return Promise.reject(new InsightError("null or undefined ID"));
        }
        // Log.trace(id.replace(/\s/g, "").length);
        if (id.replace(/\s/g, "").length && !id.includes("\_")) {
            if (this.existsID(id)) {
                for (let i = 0; i < this.datasets.length; i++) {
                    if (this.datasets[i].insightDataset.id === id ||
                        this.datasets[i].insightDataset.id === id) {
                        this.datasets.splice(i, 1);
                    }
                } // delete from memory
                return new Promise((resolve, reject) => {
                    fs.unlink("data/" + id + ".json", (err) => {
                        if (err) {
                            reject(err);
                        }
                        return resolve(id);
                    });
                }); // delete from disk
            } else {
                return Promise.reject(new NotFoundError("dataset not found"));
            }
        } else {
            return Promise.reject(new InsightError("not valid id"));
        }
    }

    public performQuery(query: any): Promise<any[]> {
        // Log.trace("query in PQ: " + query);
        // Log.trace("query has type: " + typeof(query));
        // Log.trace(query.WHERE);
        let queryEngine = new QueryEngine(this, this.datasets);
        return (queryEngine.performQuery(query)).then((result) => {
            let transform = (Object.keys(query).includes("TRANSFORMATIONS")) ? query.TRANSFORMATIONS : null;
            return (queryEngine.formatQueryResult(result, query.OPTIONS, transform))
                .then((formattedResult) => {
                    if (formattedResult.length > 5000) {
                        return Promise.reject(new ResultTooLargeError("result size exceeded limit"));
                    } else {
                        // Log.trace("FIRST DATA: " + formattedResult[0]);
                        // Log.trace(Object.keys(formattedResult[0]));
                        return Promise.resolve(formattedResult);
                    }
                });
        });
    }

    public listDatasets(): Promise<InsightDataset[]> {
        if (this.datasets === undefined) {
            return Promise.resolve([]);
        }
        let ret: InsightDataset[] = [];
        for (let realDS of this.datasets) {
            realDS.insightDataset.numRows = realDS.data.length;
            if (realDS.insightDataset.numRows > 0) {
                ret.push(realDS.insightDataset);
            }
        }
        return Promise.resolve(ret);
    }

}
