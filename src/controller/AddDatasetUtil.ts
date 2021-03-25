import Log from "../Util";
import {InsightError} from "./IInsightFacade";
export default class AddDatasetUtil {

    private static getSingleData(): any {
        return {
            dept: "",
            id: "",
            avg: 0,
            instructor: "",
            title: "",
            pass: 0,
            fail: 0,
            audit: 0,
            uuid: "",
            year: 0
        };
    }

    public static getValid(data: string[]): Promise<any> {
        let collection: object[] = [];
        data.forEach(function (courses) {
            try {
                if (courses === "") {
                    return Promise.resolve();
                }
                let jsonCourses = JSON.parse(courses);
                if (jsonCourses.result.length > 0) {
                    for (const jsonSection of jsonCourses.result) {
                        if (AddDatasetUtil.isValid(jsonSection)) {
                            let singleData = AddDatasetUtil.getSingleData();
                            singleData.dept = jsonSection.Subject;
                            singleData.id = jsonSection.Course;
                            singleData.avg = jsonSection.Avg;
                            singleData.instructor = jsonSection.Professor;
                            singleData.title = jsonSection.Title;
                            singleData.pass = jsonSection.Pass;
                            singleData.fail = jsonSection.Fail;
                            singleData.audit = jsonSection.Audit;
                            singleData.uuid = String(jsonSection.id);
                            singleData.year = ((jsonSection.Section === "overall") ? 1900 :
                                Number(jsonSection.Year));
                            collection.push(singleData);
                        } else {
                            Log.trace("f");
                        }
                    }
                } else {
                    return new InsightError("empty json");
                }
            } catch (err) {
                Log.error("error in parsing singleData");
                return Promise.reject(err);
            }
        });
        if (collection.length === 0) {
            return Promise.reject(new InsightError("empty collection"));
        }
        return Promise.resolve(collection);
    }

    private static isValid(jsonCourses: string) {
        return (
            jsonCourses.hasOwnProperty("Subject") &&
            jsonCourses.hasOwnProperty("id") &&
            jsonCourses.hasOwnProperty("Avg") &&
            jsonCourses.hasOwnProperty("Professor") &&
            jsonCourses.hasOwnProperty("Title") &&
            jsonCourses.hasOwnProperty("Pass") &&
            jsonCourses.hasOwnProperty("Fail") &&
            jsonCourses.hasOwnProperty("Audit") &&
            jsonCourses.hasOwnProperty("Year") &&
            jsonCourses.hasOwnProperty("Section"));
    }

    public static getGeolocation(rawAddress: string): Promise<any> {
        const http = require("http");
        const urlPre = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team266/";
        let address = rawAddress.replace(", Vancouver, BC", "").trim();
        address = encodeURI(address);
        return new Promise(function (resolve, reject) {
            http.get((urlPre + address), function (res: any) {
                // Log.trace(res);
                res.setEncoding("utf8");
                const { statusCode } = res;
                if (statusCode !== 200) {
                    Log.trace("error !200");
                }
                res.on("error", () => {
                    return resolve({lat: undefined, long: undefined});
                });
                let rawData: any[] = [];
                res.on("data", function (chunk: any) {
                    rawData.push(chunk);
                });
                res.on("end", () => {
                    try {
                        // Log.trace("temp");
                        if (rawData.length > 1) {
                            return resolve(JSON.parse(Buffer.concat(rawData).toString()));
                        } else {
                            return resolve(JSON.parse(rawData[0]));
                        }
                    } catch (e) {
                        return resolve({lat: undefined, long: undefined});
                    }
                });
                res.on("error", function () {
                    Log.trace("error in http request");
                });
            });
        });
    }
}
