import {expect} from "chai";
import * as fs from "fs-extra";
import {InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the schema given to TestUtil.validate(..) in TestUtil.readTestQueries(..)
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    isQueryValid: boolean;
    result: any;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the 'before' hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        emptySet: "./test/data/emptySet.zip",
        noData: "./test/data/noData.zip",
        invalidSection: "./test/data/invalidSection.zip",
        noSections: "./test/data/noSections.zip",
        oneValidOneNot: "./test/data/oneValidOneNot.zip",
        oneCourseWithOneValidSectionOneNot: "./test/data/oneCourseWithOneValidSectionOneNot.zip",
        rooms: "./test/data/rooms.zip",
    };
    let datasets: { [id: string]: string } = {};
    let insightFacade: InsightFacade;
    const cacheDir = __dirname + "/../data";

    before(function () {
        // This section runs once and loads all datasets specified in the datasetsToLoad object
        // into the datasets object
        Log.test(`Before all`);
        for (const id of Object.keys(datasetsToLoad)) {
            datasets[id] = fs.readFileSync(datasetsToLoad[id]).toString("base64");
        }
    });

    beforeEach(function () {
        // This section resets the data directory (removing any cached data) and resets the InsightFacade instance
        // This runs before each test, which should make each test independent from the previous one
        Log.test(`BeforeTest: ${this.currentTest.title}`);
        try {
            fs.removeSync(cacheDir);
            fs.mkdirSync(cacheDir);
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        }
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // This is a unit test. You should create more like this!
    it("Should add a valid dataset", function () {
        const id: string = "rooms";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });


    // My own tests start here
    it("Should fail to add an dataset with an only an invalid section", function () {
        const id: string = "invalidSection";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should fail to add a dataset with no data", function () {
        const id: string = "noData";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should fail to add a dataset with no sections", function () {
        const id: string = "noSections";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should add a valid dataset", function () {
        const id: string = "oneValidOneNot";
        const expected: string[] = [id];
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
            expect(result).to.deep.equal(expected);
        }).catch((err: any) => {
            expect.fail(err, expected, "Should not have rejected");
        });
    });

    it("Should fail to add a dataset with no classes", function () {
        const id: string = "emptySet";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should throw error trying to add invalid dataset with id containing underscore", function () {
        const id: string = "bad_id";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(Error);
        });
    });

    it("Should throw error trying to add invalid dataset with id containing only whitespace", function () {
        const id: string = "   ";
        return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((response: string[]) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    it("Should throw error trying to add a duplicate id", function () {
        const id: string = "courses";
        return (insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)).then((product) => {
            return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)
            .then((response: string[]) => {
                expect.fail(response, InsightError, "Should not have accepted");
            });
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);
        });
    });

    // it("Should add a valid dataset with one valid section and one invalid section", function () {
    //     const id: string = "oneCourseWithOneValidSectionOneNot";
    //     const expected: string[] = [id];
    //     return insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses).then((result: string[]) => {
    //         expect(result).to.deep.equal(expected);
    //     }).catch((err: any) => {
    //         expect.fail(err, expected, "Should not have rejected");
    //     });
    // });

    // removeDataSet tests
    it("Should throw error trying to remove dataset not already added", function () {
        const id = "courses";
        return insightFacade.removeDataset(id).then((response: string) => {
            expect.fail(response, InsightError, "Should not have accepted");

        }).catch((err: any) => {
            expect(err).to.be.instanceOf(NotFoundError);

        });
    });

    it("Should throw error trying to remove data set with id contaning underscore", function () {
        const id: string = "bad_id";
        return insightFacade.removeDataset(id).then((response: string) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);

        });
    });

    it("Should throw error trying to remove data set with id containing only whitespace", function () {
        const id: string = "   ";
        return insightFacade.removeDataset(id).then((response: string) => {
            expect.fail(response, InsightError, "Should not have accepted");
        }).catch((err: any) => {
            expect(err).to.be.instanceOf(InsightError);

        });
    });

    it("Should successfully remove a dataset", function () {
        const id: string = "courses";
        return (insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses)).then(() => {
            return insightFacade.removeDataset(id).then((result: string) => {
                return (insightFacade.listDatasets()).then((listDS) => {
                    expect(result).to.deep.equal("courses");
                    expect(listDS).to.deep.equal([]);
                });
            }).catch((err: any) => {
                expect.fail(err, [], "Should not have rejected");
            });
        });
    });

    it("Should successfully return an empty set of InsightDatasets", function () {
        return insightFacade.listDatasets().then((result: []) => {
            expect(result).to.deep.equal([]);
        }).catch((err: any) => {
            expect.fail(err, datasets, "Should not have thrown error");
        });
    });

//     it("Should successfully return a set containing only 'courses'", function () {
//         const id: string = "courses";
//         try {
//             insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
//         } catch (err) {
//             expect.fail(err, id, "Really should not have happened");
//         }
//         return insightFacade.listDatasets().then((result: []) => {
//             expect(result).to.deep.equal(datasets);
//         }).catch((err: any) => {
//             expect.fail(err, datasets, "Should not have thrown error");
//         });
//     });

    it("should fail to add a dataset of kind Rooms", function () {
        const id: string = "rooms";
        return (insightFacade.addDataset(id, null, InsightDatasetKind.Rooms))
            .then((response: string[]) => {
                expect.fail(response, InsightError, "Should not have accepted");
            }).catch((err: any) => {
                expect(err).to.be.instanceOf(InsightError);
            });
    });
});

/*
 * This test suite dynamically generates tests from the JSON files in test/queries.
 * You should not need to modify it; instead, add additional files to the queries directory.
 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
 */
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: any } = {
        courses: {id: "courses", path: "./test/data/courses.zip", kind: InsightDatasetKind.Courses},
        rooms: {id: "rooms", path: "./test/data/rooms.zip", kind: InsightDatasetKind.Rooms}
    };
    let insightFacade: InsightFacade = new InsightFacade();
    let testQueries: ITestQuery[] = [];

    // Load all the test queries, and call addDataset on the insightFacade instance for all the datasets
    before(function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = TestUtil.readTestQueries();
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${err}`);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Will fail* if there is a problem reading ANY dataset.
        const loadDatasetPromises: Array<Promise<string[]>> = [];
        for (const key of Object.keys(datasetsToQuery)) {
            const ds = datasetsToQuery[key];
            const data = fs.readFileSync(ds.path).toString("base64");
            loadDatasetPromises.push(insightFacade.addDataset(ds.id, data, ds.kind));
        }
        return Promise.all(loadDatasetPromises);
        // .catch((err) => {
        /* *IMPORTANT NOTE: This catch is to let this run even without the implemented addDataset,
         * for the purposes of seeing all your tests run.
         * For D1, remove this catch block (but keep the Promise.all)
         */
        // return Promise.resolve("HACK TO LET QUERIES RUN");
        // });
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    // Creates an extra "test" called "Should run test queries" as a byproduct. Don't worry about it
    it("Should run test queries", function () {
        describe("Dynamic InsightFacade PerformQuery tests", function () {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, function (done) {
                    insightFacade.performQuery(test.query).then((result) => {
                        TestUtil.checkQueryResult(test, result, done);
                    }).catch((err) => {
                        TestUtil.checkQueryResult(test, err, done);
                    });
                });
            }
        });
    });
});
