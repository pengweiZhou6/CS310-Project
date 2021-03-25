/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = function () {
    let query = {};
    query.WHERE = {};
    query.OPTIONS = {COLUMNS: []};
    let activeTab = document.getElementsByClassName('tab-panel active')[0];
    let dataType = activeTab.attributes['data-type'].value;
    let order = {dir: "UP", keys: []};
    let columns = [];
    let body = {};
    let condObj;
    let conditionSelection;

    if (dataType === 'courses') {
        // get WHERE fields
        condObj = document.querySelector("#tab-courses > form > div.form-group.conditions > div.conditions-container");
        conditionSelection = document.querySelector("#tab-courses > form > div.form-group.conditions > div.control-group.condition-type");

        // get COLUMNS
        let columnContainer = document.querySelector("#tab-courses > form > div.form-group.columns > div");
        for (let column of columnContainer.children) {
            if (column.children[0].checked) {
                if (["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"].includes(column.children[0].value)) {
                    columns.push(dataType + "_" + column.children[0].value);
                } else {
                    columns.push(column.children[0].value);
                }
            }
        }

        // get ORDER
        let selector = document.querySelector("#tab-courses > form > div.form-group.order > div > div.control.order.fields > select");
        for (let option of selector) {
            if (option.selected) {
                if (["avg", "pass", "fail", "audit", "year", "dept", "id", "instructor", "title", "uuid"].includes(option.value)) {
                    order.keys.push('courses_' + option.value);
                } else {
                    order.keys.push(option.value);
                }
            }
        }
        let directionDiv = document.querySelector("#courses-order");
        if (directionDiv.checked) order.dir = "DOWN";
    } else {
        // get WHERE fields
        condObj = document.querySelector("#tab-rooms > form > div.form-group.conditions > div.conditions-container");
        conditionSelection = document.querySelector("#tab-rooms > form > div.form-group.conditions > div.control-group.condition-type");

        // get COLUMNS
        let columnContainer = document.querySelector("#tab-rooms > form > div.form-group.columns > div");
        for (let column of columnContainer.children) {
            if (column.children[0].checked) {
                if (["lat", "lon", "seats", "fullname", "shortname", "name",
                    "number", "address", "type", "furniture", "href"].includes(column.children[0].value)) {
                    columns.push(dataType + "_" + column.children[0].value);
                } else {
                    columns.push(column.children[0].value);
                }
            }
        }

        // get ORDER
        let selector = document.querySelector("#tab-rooms > form > div.form-group.order > div > div.control.order.fields > select");
        for (let option of selector) {
            if (option.selected) {
                if (["lat", "lon", "seats", "fullname", "shortname", "name",
                    "number", "address", "type", "furniture", "href"].includes(option.value)) {
                    order.keys.push("rooms_" + option.value);
                } else {
                    order.keys.push(option.value);
                }
            }
        }
        let directionDiv = document.querySelector("#rooms-order");
        if (directionDiv.checked) order.dir = "DOWN";
    }
    query.OPTIONS.COLUMNS = columns;
    if (order.keys.length > 0) query.OPTIONS.ORDER = order;

    // this builds the generalized WHERE
    let conditions = [];
    for (let cond of condObj.children) {
        let newCondition = {};
        let operator = "";
        let field = "";
        for (let op of cond.children[2].children[0].children) {
            if (op.selected) operator = op.value;
        }
        for (let fld of cond.children[1].children[0]) {
            if (fld.selected) field = dataType + "_" + fld.value;
        }
        let value = cond.children[3].children[0].value;
        if (operator !== "IS") {
            value = Number(value);
        }
        newCondition[operator] = {};
        newCondition[operator][field] = value;
        if (cond.children[0].children[0].checked) {
            let temp = {};
            temp["NOT"] = newCondition;
            newCondition = temp;
        }
        conditions.push(newCondition);
    }
    if (conditionSelection.children[0].children[0].checked) {
        body = {AND: []};
        body.AND = conditions;
    } else if (conditionSelection.children[1].children[0].checked) {
        body = {OR: []};
        body.OR = conditions;
    } else {
        body = {NOT: {OR: []}};
        body.NOT.OR = conditions;
    }
    query.WHERE = body;

    // get TRANSFORMTIONS
    let transformations = {GROUP: [], APPLY: []};
    let transforms;
    let groups;
    if (dataType === 'courses') {
        transforms = document.querySelector("#tab-courses > form > div.form-group.transformations > div.transformations-container");
        groups = document.querySelector("#tab-courses > form > div.form-group.groups > div");

    } else {
        transforms =  document.querySelector("#tab-rooms > form > div.form-group.transformations > div.transformations-container");
        groups = document.querySelector("#tab-rooms > form > div.form-group.groups > div");
    }

    for (let group of groups.children) {
        if (group.children[0].attributes['checked']) transformations.GROUP.push(dataType + "_" + group.children[0].attributes['value'].value);
    }
    for (let child of transforms.children) {
        let applyKey = child.children[0].children[0].value;
        let applyRule = {};
        let key = undefined;
        let applyToken = '';
        for (let token of child.children[1].children[0]) {
            if (token.selected) {applyToken = token.value}
        }
        for (let token of child.children[2].children[0]) {
            if (token.selected) {key = dataType + '_' + token.value}
        }
        applyRule[applyKey] = {};
        applyRule[applyKey][applyToken] = key;
        transformations.APPLY.push(applyRule);
    }
    if (transformations.GROUP.length !== 0) {
        query.TRANSFORMATIONS = transformations;
    }

    console.log(JSON.stringify(query));
    return query;
};




