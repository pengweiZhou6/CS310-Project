import {IScheduler, SchedRoom, SchedSection, TimeSlot} from "./IScheduler";
import QuerySorter from "../controller/QuerySorter";
import {Decimal} from "decimal.js";
import Log from "../Util";


export class GeoLoc {
    public lat: number;
    public lon: number;
}

export default class Scheduler implements IScheduler {
    private coursePlaceHolder: SchedSection = {
        courses_dept: "",
        courses_id: "",
        courses_uuid: "",
        courses_pass: 0,
        courses_fail: 0,
        courses_audit: 0
    };

    private timeSlots: TimeSlot[] = ["MWF 0800-0900", "MWF 0900-1000", "MWF 1000-1100",
        "MWF 1100-1200", "MWF 1200-1300", "MWF 1300-1400",
        "MWF 1400-1500", "MWF 1500-1600", "MWF 1600-1700",
        "TR  0800-0930", "TR  0930-1100", "TR  1100-1230",
        "TR  1230-1400", "TR  1400-1530", "TR  1530-1700"];

    public schedule(sections: SchedSection[], rooms: SchedRoom[]): Array<[SchedRoom, SchedSection, TimeSlot]> {
        // TODO Implement this
        let returnSet: Array<[SchedRoom, SchedSection, TimeSlot]> = [];

        let availableSlots: Array<[SchedRoom, SchedSection, TimeSlot]> = [];

        // get average geoloc and generate availableSlots
        let grossLat = new Decimal(0);
        let grossLon = new Decimal(0);
        for (let room of rooms) {
            for (let timeSlot of this.timeSlots) {
                availableSlots.push([room, this.coursePlaceHolder, timeSlot]);
            }
            grossLat =  Decimal.add(grossLat, new Decimal(room.rooms_lat));
            grossLon = Decimal.add(grossLon, new Decimal (room.rooms_lon));
        }
        let avgLat = grossLat.toNumber() / rooms.length;
        let avgLon = grossLon.toNumber() / rooms.length;
        // reset sumLat, sumLon
        let sumLat = new Decimal(0);
        let sumLon = new Decimal(0);
        let numAssignedSlots = 0;

        // add size field to courses
        let sizedCourses = Scheduler.computeSectionSizes(sections);

        // sort courses by size, descending
        let sortedCourses = Scheduler.sortArray(sizedCourses, "UP", "size");

        let filledSlotIndices: number[] = [];
        // take bottom-most item of sortedCourses (i.e. largest course size)
        // insert it into nearest viable room/timeslot
        while (sortedCourses.length !== 0) {
            let currCourse = sortedCourses.pop();
            let avgGeoloc: GeoLoc = {lat: avgLat, lon: avgLon};
            let selectedSlot: number =
                Scheduler.findIndexOfViableSlot(availableSlots, filledSlotIndices, avgGeoloc, currCourse.size);
            Log.trace("selected slot: " + selectedSlot);
            if (selectedSlot !== -1) {
                filledSlotIndices.push(selectedSlot);
                delete (currCourse.size);
                availableSlots[selectedSlot][1] = currCourse;
                returnSet.push(availableSlots[selectedSlot]);
                // Log.trace("LAT:  " + availableSlots[selectedSlot][0].rooms_lat);
                sumLat = Decimal.add(sumLat, new Decimal(availableSlots[selectedSlot][0].rooms_lat));
                // Log.trace("SUMLAT:  " + sumLat.toNumber());
                sumLon = Decimal.add(sumLon, new Decimal(availableSlots[selectedSlot][0].rooms_lon));
                numAssignedSlots++;
                avgLat = sumLat.toNumber() / numAssignedSlots;
                avgLon = sumLon.toNumber() / numAssignedSlots;
            }
        }

        return returnSet;
    }

    // returns index of timeslot & room in availableSlots that is closest to the current average geoloc
    // returns -1 if no viable timeslot & room is found
    private static findIndexOfViableSlot (availableSlots: any[], filledSlotIndices: number[],
                                          avgGeoloc: GeoLoc, courseSize: number): number {
        let minDistance: number = 6371001;
        let indexOfMin: number = -1;
        // Log.trace("course size" + courseSize);
        for (let i = 0; i < availableSlots.length; i++) {
            let currGeoloc = {lat: availableSlots[i][0].rooms_lat, lon: availableSlots[i][0].rooms_lon};
            const distance = Scheduler.getHaversineDistance(avgGeoloc, currGeoloc);
            // Log.trace("hav dist: " + distance);
            if (distance < minDistance && (!filledSlotIndices.includes(i))
                && availableSlots[i][0].rooms_seats >= courseSize) {
                minDistance = distance;
                indexOfMin = i;
            }
        }
        return indexOfMin;
    }

    private static getHaversineDistance (avgGeoloc: GeoLoc, currGeoloc: GeoLoc): number {
        let R = 6371000; // metres
        let phi1 = avgGeoloc.lat * Math.PI / 180; // lat1
        let phi2 = currGeoloc.lat * Math.PI / 180; // lat2
        let deltaPhi = (currGeoloc.lat - avgGeoloc.lat) * Math.PI / 180; // lat2 - lat1
        let deltaLambda = (currGeoloc.lon - avgGeoloc.lon) * Math.PI / 180; // lon2 - lon1

        let a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    private static computeSectionSizes (sections: any[]): any[] {
        for (let section of sections) {
            section.size = (section.courses_pass + section.courses_fail + section.courses_audit);
        }
        return sections;
    }

    private static sortArray (array: any[], direction: string, parameter: string): any[] {
        let sortParam: number;
        if (direction === "UP") {
            sortParam = 1;
        } else {
            sortParam = -1;
        }
        array.sort(function (curr, next) {
            return (sortParam * Scheduler.determineGreater(parameter, curr, next));
        });
        return array;
    }

    private static determineGreater (key: string, curr: any, next: any): number {
        if (curr[key] > next[key]) {
            return 1;
        } else if (curr[key] < next[key]) {
            return -1;
        } else {
            return 0;
        }
    }
}
