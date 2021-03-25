import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import chaiHttp = require("chai-http");
import Response = ChaiHttp.Response;
import {expect} from "chai";
import * as fs from "fs";
import Log from "../src/Util";
// import Scheduler from "../src/scheduler/Scheduler";
// import { SchedRoom, SchedSection } from "../src/scheduler/IScheduler";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        // start server here once and handle errors properly
        return (server.start()).then((resolve) => {
            return resolve;
        }).catch((err) => {
            return Promise.reject(err);
        });
    });

    after(function () {
        // stop server here once!
        return (server.stop());
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    it("missing param", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset//")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });


    it("missing param1", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/courses/")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });


    it("missing param2", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset//courses")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });


    it("wrong kind", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/courses/wrong")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    // TODO: read your courses and rooms datasets here once!

    it("PUT test for courses dataset", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/courses/courses")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // Log.trace(err);
                    Log.trace("inner error");
                    expect.fail();
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("PUT test for rooms dataset", function () {
        try {
            let data = fs.readFileSync ("./test/data/rooms.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/rooms/rooms")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // Log.trace(err);
                    Log.trace("inner error");
                    expect.fail();
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("Put test for duplicate rooms dataset", function () {
        try {
            let data = fs.readFileSync("./test/data/rooms.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/rooms/rooms")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail("shouldn't pass");
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            // Log.trace("outer error");
            expect.fail("should not fail here");
        }
    });

    it("Put test for duplicate courses dataset", function () {
        try {
            let data = fs.readFileSync("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/courses/courses")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail("shouldn't pass");
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            // Log.trace("outer error");
            expect.fail("should not fail here");
        }
    });

    it("PUT test for noData dataset", function () {
        try {
            let data = fs.readFileSync ("./test/data/noData.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/oneValidOneNot/courses")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect.fail("shouldn't pass ");
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("Delete test for courses dataset", function () {
        try {
            return chai.request("http://localhost:4321/")
                .del("/dataset/courses")
                .send(null)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // Log.trace("deleted!!!");
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // Log.trace(err);
                    Log.trace("inner error");
                    expect.fail();
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("Delete test for not exist dataset", function () {
        try {
            return chai.request("http://localhost:4321/")
                .del("/dataset/notexist")
                .send(null)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    Log.trace("deleted!!!");
                    expect.fail();
                })
                .catch(function (err) {
                    expect(err.status).to.be.equal(404);
                });

        } catch (err) {
            Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("RE-ADD courses dataset after remove...", function () {
        try {
            let data = fs.readFileSync ("./test/data/courses.zip");
            return chai.request("http://localhost:4321/")
                .put("/dataset/courses/courses")
                .send(data)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    // Log.trace(err);
                    // Log.trace("inner error");
                    expect.fail();
                });
        } catch (err) {
            // Log.trace(err);
            Log.trace("outer error");
        }
    });

    it("POST test for query", function () {
        try {
            let queryBody = JSON.parse(fs.readFileSync("./test/queries/complex.json").toString());
            return chai.request("http://localhost:4321/")
                .post("/query")
                .send(JSON.stringify(queryBody.query))
                .set("Content-Type", "application/json")
                .then(function (res: Response) {
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.error(err);
                    expect.fail("shouldn't fail");
                });
        } catch (err) {
            Log.error(err);
            expect.fail();
        }
    });

    it("POST test for invalid query", function () {
        try {
            let queryBody = JSON.parse(fs.readFileSync("./test/queries/d2invalid1.json").toString());
            return chai.request("http://localhost:4321/")
                .post("/query")
                .send(JSON.stringify(queryBody.query))
                .set("Content-Type", "application/json")
                .then(function (res: Response) {
                    expect.fail("Error: invalid query");
                })
                .catch(function (err) {
                    // Log.error(err);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error(err);
            expect.fail();
        }
    });

    it("GET data sets", function () {
        try {
            return chai.request("http://localhost:4321/")
                .get("/datasets")
                .then(function (res: Response) {
                    Log.trace(res.body.result);
                    Log.trace(res.body.result.length);
                    Log.trace(typeof (res.body.result));
                    expect(res.status).to.be.equal(200);
                })
                .catch(function (err) {
                    Log.error(err);
                    expect.fail();
                });
        } catch (err) {
            Log.error(err);
            expect.fail();
        }
    });

    // let sections: SchedSection[] = [
    //     {
    //         courses_dept: "cpsc",
    //         courses_id: "340",
    //         courses_uuid: "1319",
    //         courses_pass: 101,
    //         courses_fail: 7,
    //         courses_audit: 2
    //     },
    //     {
    //         courses_dept: "cpsc",
    //         courses_id: "340",
    //         courses_uuid: "3397",
    //         courses_pass: 171,
    //         courses_fail: 3,
    //         courses_audit: 1
    //     },
    //     {
    //         courses_dept: "cpsc",
    //         courses_id: "344",
    //         courses_uuid: "62413",
    //         courses_pass: 93,
    //         courses_fail: 2,
    //         courses_audit: 0
    //     },
    //     {
    //         courses_dept: "cpsc",
    //         courses_id: "344",
    //         courses_uuid: "72385",
    //         courses_pass: 43,
    //         courses_fail: 1,
    //         courses_audit: 0
    //     }
    // ];
    //
    // let rooms: SchedRoom[] = [
    //     {
    //         rooms_shortname: "AERL",
    //         rooms_number: "120",
    //         rooms_seats: 144,
    //         rooms_lat: 49.26372,
    //         rooms_lon: -123.25099
    //     },
    //     {
    //         rooms_shortname: "ALRD",
    //         rooms_number: "105",
    //         rooms_seats: 94,
    //         rooms_lat: 49.2699,
    //         rooms_lon: -123.25318
    //     },
    //     {
    //         rooms_shortname: "ANGU",
    //         rooms_number: "098",
    //         rooms_seats: 260,
    //         rooms_lat: 49.26486,
    //         rooms_lon: -123.25364
    //     },
    //     {
    //         rooms_shortname: "BUCH",
    //         rooms_number: "A101",
    //         rooms_seats: 275,
    //         rooms_lat: 49.26826,
    //         rooms_lon: -123.25468
    //     }
    // ];
    //
    // it("should test scheduler with standard input", function () {
    //     try {
    //         let sched = new Scheduler();
    //
    //         let schedule = sched.schedule(sections, rooms);
    //         Log.trace(schedule);
    //         expect.fail();
    //     } catch (err) {
    //         Log.error(err);
    //         expect.fail();
    //     }
    // });

    // Sample on how to format PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
