import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {InsightDatasetKind, NotFoundError} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";
let insightInstance = new InsightFacade();

export default class Route {
    public static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = this.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + 200);
            res.json(200, {result: response});
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err});
        }
        return next();
    }

    private static performEcho(msg: string): string {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        } else {
            return "Message not provided";
        }
    }

    public static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    public static putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        try {
            // Log.trace(req);
            let id = req.params.id;
            let kind = req.params.kind;
            // Log.trace(req.params);
            if (id.length === 0 || (kind !== "courses" && kind !== "rooms")) {
                res.json(400, {
                    error: `Data with id = ${req.params.id} is rejected because of invalid params.`
                });
                return next();
            }
            let insightDatasetKind: InsightDatasetKind;
            if (kind === "courses") {
                insightDatasetKind = InsightDatasetKind.Courses;
            } else {
                insightDatasetKind = InsightDatasetKind.Rooms;
            }
            let content = req.body.toString("base64");
            // Log.trace("REQ BODY:  " + content);

            // let zip = new JSZip();

            insightInstance.addDataset(id, content, insightDatasetKind)
                .then((response: any) => {
                    res.json(200, {result: response});
                })
                .catch((err: any) => {
                    Log.trace(err);
                    res.json(400, {
                        error: `Data with id = ${req.params.id} is rejected by addDataset(inner).`
                    });
                });
        } catch (err) {
            res.json(400, {
                error: `Data with id = ${req.params.id} is rejected by addDataset(outer).`
            });
        }
        return next();
    }

    public static delDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        let id = req.params.id;
        try {
            insightInstance.removeDataset(id)
                .then((response: any) => {
                    res.json(200, {result: response});
                })
                .catch((err: any) => {
                    if (err instanceof NotFoundError) {
                        res.json(404, {
                            error: `Data with id = ${req.params.id} is rejected with NotFoundError.`
                        });
                    } else {
                        res.json(400, {
                            error: `Data with id = ${req.params.id} is rejected with InsightError.`
                        });
                    }
                });
        } catch (err) {
            res.json(400, {
                error: `Data with id = ${req.params.id} is rejected by removeDataset.`
            });
        }
        return next();
    }

    public static postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        // Log.trace(typeof(req.body));
        fs.readdir("./data", function (err, files) {
            if (err) {
                res.json(400, {
                    error: `error on read folder.`
                });
            } else {
                // Log.trace(files.length);
                if (!files.length) {
                    res.json(400, {
                        error: `No data.`
                    });
                    return next();
                }
            }
        }); // check for a persisted data structure on disk before returning a missing dataset error

        try {
            if (typeof(req.body) === "string") {
                req.body = JSON.parse(req.body);
            }
            insightInstance.performQuery(req.body)
                .then((response: any) => {
                    res.json(200, {result: response});
                })
                .catch((err: any) => {
                    Log.trace(err);
                    res.json(400, {
                        error: `Data with id = ${req.id} is rejected by postQuery(inner).`
                    });
                });
        } catch (err) {
            res.json(400, {
                error: `Data with id = ${req.id} is rejected by postQuery(outer).`
            });
        }
        return next();
    }

    public static getDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        insightInstance.listDatasets()
            .then((response: any[]) => {
                res.send(200, {result:  response});
            });
        return next();
    }
}
