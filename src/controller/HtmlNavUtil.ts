import Log from "../Util";
import {InsightError} from "./IInsightFacade";
import AddDatasetUtil from "./AddDatasetUtil";

export default class HtmlNavUtil {
    public static searchTree(currNode: any, searchKey: string): any[] {
        let collection: any[] = [];
        if (currNode.nodeName === searchKey) {
            collection.push(currNode);
        }
        for (let [key, value] of Object.entries(currNode)) {
            if (key === "childNodes" && Array.isArray(value)) {
                for (let element of value) {
                    collection = collection.concat(HtmlNavUtil.searchTree(element, searchKey));
                }
            }
        }
        return collection;
    }

    public static searchTreeForAttrVal(currNode: any, searchKey: string): any[] {
        let collection: any[] = [];
        if (currNode.hasOwnProperty("attrs") && currNode.attrs.length > 0) {
            let nodeHasAttrVal: boolean = false;
            for (let attr of currNode.attrs) {
                if (attr.hasOwnProperty("value") && attr.value === searchKey) {
                    nodeHasAttrVal = true;
                }
            }
            if (nodeHasAttrVal) {
                collection.push(currNode);
                return collection;
            }
        }
        for (let [key, value] of Object.entries(currNode)) {
            if (key === "childNodes" && Array.isArray(value)) {
                for (let element of value) {
                    collection = collection.concat(HtmlNavUtil.searchTreeForAttrVal(element, searchKey));
                }
            }
        }
        return collection;
    }

    private static findHref(childAttributes: any[]) {
        for (let attr of childAttributes) {
            if (attr.name === "href") {
                return attr.value;
            }
        }
        return undefined;
    }

    private static determineVariableType(initVar: string): string {
        if (initVar === "views-field views-field-field-room-number") {
            return "number";
        } else if (initVar === "views-field views-field-field-room-capacity") {
            return "seats";
        } else if (initVar === "views-field views-field-field-room-type") {
            return "type";
        } else if (initVar === "views-field views-field-field-room-furniture") {
            return "furniture";
        } else {
            throw new InsightError("bad varType");
        }
    }

    public static findBuildingLinks(input: any): string[] {
        let temp: string[] = [];
        let links: string[] = [];
        let arrayA = HtmlNavUtil.searchTreeForAttrVal(input, "views-field views-field-nothing");
        let arrayB: any[] = [];
        for (let obj of arrayA) {
            arrayB = arrayB.concat(HtmlNavUtil.searchTree(obj, "a"));
        }
        for (let obj of arrayB) {
            if (obj.hasOwnProperty("attrs") && obj.attrs instanceof Array) {
                for (let attr of obj.attrs) {
                    if (attr.name === "href") {
                        temp.push(attr.value);
                    }
                }
            }
        }
        for (let possibleLink of temp) {
            if (possibleLink.includes("./")) {
                links.push(possibleLink);
            }
        }
        return links;
    }

    public static assembleRoom(roughRoom: any): any {
        let attributes: any[] = [];
        let newRoom: any = {};
        if (roughRoom.childNodes !== null && roughRoom.childNodes !== undefined) {
            attributes = attributes.concat(HtmlNavUtil.searchTree(roughRoom, "td"));
        }
        newRoom.address = roughRoom.foundAddress.replace(", Vancouver, BC", "").trim();
        newRoom.shortname = roughRoom.shortName;
        newRoom.fullname = roughRoom.fullName;
        newRoom.lat = roughRoom.lat;
        newRoom.lon = roughRoom.lon;
        for (let attribute of attributes) {
            let varType: any;
            let varValue: any;
            if (attribute.hasOwnProperty("attrs") && attribute.attrs instanceof Array) {
                varType = attribute.attrs[0].value;
                try {
                    varType = HtmlNavUtil.determineVariableType(varType);
                    let attrChildrenOfKindA = HtmlNavUtil.searchTree(attribute, "a");
                    if (attrChildrenOfKindA.length === 1 && attrChildrenOfKindA[0].childNodes.length === 1) {
                        varValue = attrChildrenOfKindA[0].childNodes[0].value;
                        newRoom.href = HtmlNavUtil.findHref(attrChildrenOfKindA[0].attrs);
                    } else {
                        varValue = attribute.childNodes[0].value;
                    }
                } catch (error) {
                    // no
                }
                if (varType === "seats") {
                    newRoom[varType] = Number(varValue);
                } else if (["number", "type", "furniture"].includes(varType)) {
                    if (varValue !== undefined && varValue !== null) {
                        varValue = varValue.replace("\\n", "");
                        varValue = varValue.trim();
                    }
                    newRoom[varType] = varValue;
                }
            }
        }
        newRoom.name = ("" + newRoom.shortname + "_" + newRoom.number);
        return newRoom;
    }

    // builds room tables without geoloc
    public static buildRoomTables(buildingJsons: any, roomLinks: string[]) {
        let temp: any[] = [];
        let buildingWrappers: any[] = [];
        let roomTables: any[] = [];
        for (let i = 0; i < buildingJsons.length; i++) {
            let tempArray = roomLinks[i].split("/");
            const shortName = tempArray[tempArray.length - 1];

            let newTables = HtmlNavUtil.searchTree(buildingJsons[i], "tbody");
            let newDivs = temp.concat(
                HtmlNavUtil.searchTree(buildingJsons[i], "div"));
            for (let div of newDivs) {
                if (div.attrs.length === 1 && div.attrs[0].value === "buildings-wrapper") {
                    buildingWrappers.push(div);
                }
            }
            let buildingAddress  = "";
            buildingAddress = HtmlNavUtil.findAddress(buildingJsons[i]);
            let potentialNames: any[] = [];
            for (let bw of buildingWrappers) {
                potentialNames = potentialNames.concat(HtmlNavUtil.searchTree(bw, "h2"));
            }
            let fullName: string = "";
            for (let item of potentialNames) {
                for (let child of item.childNodes) {
                    if (child.nodeName === "span") {
                        fullName = child.childNodes[0].value;
                    }
                }
            }
            for (let table of newTables) {
                table.foundAddress = buildingAddress;
                table.shortName = shortName;
                table.fullName = fullName;
            }
            roomTables = roomTables.concat(newTables);
        }
        return roomTables;
    }

    private static findAddress(root: any): string {
        let potentialAddresses =
            HtmlNavUtil.searchTreeForAttrVal(root, "building-google-map");
        let buildingAddress: string = "";
        for (let node of potentialAddresses) {
            let iframes = HtmlNavUtil.searchTree(node, "iframe");
            for (let attr of iframes[0].attrs) {
                if (attr.name === "src") {
                    buildingAddress = attr.value;
                    buildingAddress =
                        buildingAddress.replace(/https:\/\/maps.google.com\/maps\?hl=en&q=/g, "");
                    buildingAddress =
                        buildingAddress.replace("&ie=UTF8&z=15&iwloc=B&output=embed", "");
                }
            }
        }
        return buildingAddress;
    }

    public static generateRoughRooms(roomTables: any[]): any[] {
        let roughRooms: any[] = [];
        for (let table of roomTables) {
            let roomsInTable = HtmlNavUtil.searchTree(table, "tr");
            for (let room of roomsInTable) {
                room.foundAddress = table.foundAddress;
                room.shortName = table.shortName;
                room.fullName = table.fullName;
                room.lat = table.lat;
                room.lon = table.lon;
            }
            roughRooms = roughRooms.concat(roomsInTable);
        }
        return roughRooms;
    }


}
